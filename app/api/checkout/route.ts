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

        // 2. Customer Stripe (Auto-Heal if missing in Stripe but exists in DB)
        let customerId = tenant.stripe_customer_id;

        if (customerId) {
            try {
                const existingCustomer = await stripeClient.customers.retrieve(customerId);
                if ((existingCustomer as any).deleted) {
                    customerId = null;
                }
            } catch (err: any) {
                // Se o erro for 404 (Not Found), limpamos o ID para criar um novo
                if (err.status === 404 || err.code === 'resource_missing') {
                    console.warn(`[CHECKOUT] Customer ${customerId} não existe no Stripe. Limpando localmente...`);
                    customerId = null;
                } else {
                    throw err; // Outros erros (conexão, etc) devem quebrar o fluxo
                }
            }
        }

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
            try {
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
                    // Tenta validar se é um Coupon ID direto válido
                    try {
                        const directCoupon = await stripeClient.coupons.retrieve(coupon);
                        if (directCoupon && directCoupon.valid) {
                            discounts.push({ coupon: directCoupon.id });
                        }
                    } catch (e) {
                        // Não é promoção nem cupom válido => Ignora (Soft Fail)
                        console.warn(`Cupom inválido fornecido: ${coupon}`);
                    }
                }
            } catch (error) {
                console.error('Erro ao validar cupom no Stripe:', error);
            }

            // Fallback: Verificar DB local e tentar sincronizar (Auto-Heal)
            if (discounts.length === 0) {
                try {
                    const { data: dbCoupon } = await supabaseAdmin
                        .from('system_coupons')
                        .select('*')
                        .eq('code', coupon.toUpperCase())
                        .single();

                    if (dbCoupon && dbCoupon.is_active) {
                        console.log(`[CHECKOUT] Cupom encontrado no DB mas não no Stripe. Tentando sincronizar: ${coupon}`);

                        try {
                            const redeemBy = dbCoupon.expires_at ? Math.floor(new Date(dbCoupon.expires_at).getTime() / 1000) : undefined;

                            // Criação on-the-fly no Stripe
                            await stripeClient.coupons.create({
                                id: dbCoupon.code,
                                percent_off: dbCoupon.discount_percent || undefined,
                                duration: 'once',
                                name: `Cupom 791: ${dbCoupon.code}`,
                                redeem_by: redeemBy
                            });
                            discounts.push({ coupon: dbCoupon.code });
                        } catch (stripeErr: any) {
                            if (stripeErr.message && stripeErr.message.includes('already exists')) {
                                // Se já existe, força o uso do ID
                                discounts.push({ coupon: dbCoupon.code });
                            } else {
                                console.warn('[CHECKOUT] Erro ao auto-sincronizar cupom:', stripeErr);
                            }
                        }
                    }
                } catch (dbErr) {
                    console.warn('[CHECKOUT] Erro no fallback de cupom DB:', dbErr);
                }
            }
        } else {
            // Se não enviou cupom, verifica se deve aplicar desconto automático de Trial
            const isTrial = tenant.plan === 'trial' || tenant.subscription_status === 'trialing' || !tenant.stripe_subscription_id;

            // Lógica:
            // 1. Se o plano explicitamente é 'trial'.
            // 2. Se o status no stripe é 'trialing'.
            // 3. Se NÃO TEM stripe_subscription_id (primeira assinatura).
            // 4. "Esse desconto é para novas barbearias que assinarem o saas antes de 5 dias após o cadastro".

            const tenantCreated = new Date(tenant.created_at || new Date());
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - tenantCreated.getTime()) / (1000 * 60 * 60 * 24));
            const isNewAccount = diffDays <= 5;

            if (isTrial && !isAddon && isNewAccount) {
                try {
                    // Nome fixo para o cupom de boas-vindas
                    const welcomeCouponCode = 'TRIAL_WELCOME_10';

                    // Tenta criar (idempotente se usarmos o ID) ou recuperar
                    try {
                        await stripeClient.coupons.create({
                            id: welcomeCouponCode,
                            percent_off: 10,
                            duration: 'once',
                            name: 'Desconto de Boas-vindas (10%)',
                        });
                    } catch (e: any) {
                        // Se já existe, tudo bem
                        if (!e.message?.includes('already exists')) {
                            console.warn('Erro ao criar cupom de welcome:', e);
                        }
                    }

                    discounts.push({ coupon: welcomeCouponCode });
                    console.log(`[CHECKOUT] Aplicando desconto de boas-vindas para ${tenant.name}`);

                } catch (err) {
                    console.error('[CHECKOUT] Erro ao configurar desconto automático:', err);
                }
            }
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
