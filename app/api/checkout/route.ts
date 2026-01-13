import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        const body = await req.json();
        const { plan: planSlug, addon: addonSlug, coupon } = body as { plan?: string; addon?: string; coupon?: string };

        if (!planSlug && !addonSlug) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Plano ou Add-on não especificado' }, { status: 400 }));
        }

        // 0. Obter Configuração Stripe
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'stripe_config')
            .single();

        const stripeKey = settingsData?.value?.secret_key;
        if (!stripeKey || stripeKey.includes('dummy')) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Stripe não configurado pelo administrador' }, { status: 500 }));
        }

        const stripeClient = new Stripe(stripeKey, {
            apiVersion: '2025-12-15.clover' as any,
            typescript: true,
        });

        // 1. Buscar Preço Dinâmico
        let itemName = '';
        let itemPrice = 0;
        let isAddon = false;
        let itemMetadata: any = {};
        let itemSlug = '';

        if (addonSlug) {
            const { data: addon } = await supabaseAdmin
                .from('system_addons')
                .select('*')
                .eq('slug', addonSlug)
                .single();

            if (!addon) return addCorsHeaders(req, NextResponse.json({ error: 'Add-on inválido' }, { status: 400 }));

            itemName = `Add-on: ${addon.name}`;
            itemPrice = Number(addon.price);
            isAddon = true;
            itemMetadata = { addon: addonSlug };
            itemSlug = addonSlug;
        } else {
            const { data: plan } = await supabaseAdmin
                .from('system_plans')
                .select('*')
                .eq('slug', planSlug)
                .single();

            if (!plan) return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));

            itemName = `Plano: ${plan.name}`;
            itemPrice = Number(plan.price);
            itemMetadata = { plan: planSlug };
            itemSlug = planSlug || '';
        }

        // --- LÓGICA DE PRO-RATA (APENAS PARA INTER OU ADICIONAIS) ---
        // Se for INTER, calculamos o valor proporcional se já tiver um plano ativo
        // Se for CARD, o Stripe lida com isso se atualizarmos a assinatura.

        let finalAmount = itemPrice;
        const isInter = req.url.includes('inter-pix') || req.url.includes('inter-boleto'); // Nota: esse arquivo é o checkout geral, mas se for chamado por outros, o body pode indicar. 
        // No fluxo atual, o PlanPage chama /api/checkout para CARD e outros endpoints para INTER.
        // Mas vamos deixar a lógica de cálculo aqui caso queiramos centralizar.

        // Exemplo de Pro-rata simples:
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const remainingDays = lastDayOfMonth - now.getDate() + 1;

        // Se for um Add-on sendo adicionado a um plano existente no meio do mês
        if (isAddon && tenant.plan && tenant.plan !== 'trial') {
            // Se for Inter, cobramos apenas os dias restantes
            if (isInter) {
                finalAmount = (itemPrice / lastDayOfMonth) * remainingDays;
                if (finalAmount < 1) finalAmount = 1; // Mínimo R$ 1,00
            }
        }

        // 2. Customer Stripe (Se não for Inter)
        let customerId = tenant.stripe_customer_id;
        if (!customerId) {
            const customer = await stripeClient.customers.create({
                email: user.email,
                name: tenant.name,
                metadata: { tenant_id: tenant.id }
            });
            customerId = customer.id;
            await supabaseAdmin.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenant.id);
        }

        // 2.5 Verificar Assinatura Ativa para Upgrade/Add-on (CARD ONLY)
        const { data: subscriptionData } = await supabaseAdmin
            .from('tenants')
            .select('stripe_subscription_id')
            .eq('id', tenant.id)
            .single();

        const activeSubId = subscriptionData?.stripe_subscription_id;

        if (activeSubId && !isInter) {
            // Se já tem assinatura, vamos criar um item nela em vez de nova sessão?
            // Para simplicidade de UX (página de sucesso, cartão etc), vamos usar a Checkout Session
            // mas configurar para "subscription_update" se o Stripe suportar fácil, 
            // ou apenas avisar o Stripe via metadata para o Webhook mesclar.
            // Ramon disse: "Soma para a próxima fatura". 
        }

        // 3. Criar Desconto Proporcional (Coupon) se necessário
        let stripeCouponId: string | undefined = undefined;

        if (finalAmount < itemPrice) {
            try {
                const discountAmount = Math.round((itemPrice - finalAmount) * 100);
                if (discountAmount > 0) {
                    const coupon = await stripeClient.coupons.create({
                        amount_off: discountAmount,
                        currency: 'brl',
                        duration: 'once',
                        name: `Pro-rata ${itemName}`,
                    });
                    stripeCouponId = coupon.id;
                }
            } catch (err) {
                console.error('Erro ao criar cupom de pro-rata:', err);
            }
        }

        // 4. Criar Checkout Session Dinâmica
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';

        const discounts: any[] = [];
        if (stripeCouponId) {
            discounts.push({ coupon: stripeCouponId });
        }
        if (coupon) {
            // Tentar encontrar como Promotion Code (código amigável do usuário, ex: 'NATAL10')
            const promoCodes = await stripeClient.promotionCodes.list({
                code: coupon,
                active: true,
                limit: 1,
            });

            if (promoCodes.data.length > 0) {
                // É um Promotion Code válido
                discounts.push({ promotion_code: promoCodes.data[0].id });
            } else {
                // Tenta assumir que é um Coupon ID direto (menos comum para usuários finais, mas possível)
                // Ou deixa falhar no create session para retornar erro
                discounts.push({ coupon: coupon });
            }
        } else {
            // Se não enviou cupom, habilita o campo na tela do Stripe (será setado no sessionConfig)
        }

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `791 Barber - ${itemName}`,
                            description: isAddon ? 'Habilitação de Módulo Extra' : 'Assinatura Mensal da Plataforma',
                        },
                        unit_amount: Math.round(itemPrice * 100), // Preço Cheio para recorrência
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout/cancel`,
            metadata: {
                tenant_id: tenant.id,
                [isAddon ? 'addon' : 'plan']: itemSlug,
                is_addon: isAddon ? 'true' : 'false'
            },
            subscription_data: {
                metadata: {
                    tenant_id: tenant.id,
                    [isAddon ? 'addon' : 'plan']: itemSlug,
                }
            }
        };

        if (discounts.length > 0) {
            sessionConfig.discounts = discounts as any;
        } else {
            sessionConfig.allow_promotion_codes = true;
        }

        const session = await stripeClient.checkout.sessions.create(sessionConfig);

        console.log(`[STRIPE CHECKOUT] Session Criada para ${tenant.name}:`, session.id);

        return addCorsHeaders(req, NextResponse.json({
            sessionId: session.id,
            url: session.url,
        }));

    } catch (error: any) {
        console.error('[STRIPE CHECKOUT ERROR]', error);
        return addCorsHeaders(req, NextResponse.json(
            { error: error.message || 'Erro ao criar sessão de checkout' },
            { status: 500 }
        ));
    }
}
