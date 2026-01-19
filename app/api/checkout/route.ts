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
        const { plan: planSlug, addon: addonSlug, coupon, interval = 1 } = body as { plan?: string; addon?: string; coupon?: string; interval?: number };

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

        // 1. Buscar Preço Dinâmico e Descontos
        let itemName = '';
        let itemPrice = 0;
        let isAddon = false;
        let itemMetadata: any = {};
        let itemSlug = '';
        let discountPercent = 0;

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
            // Add-ons não tem desconto por período conforme solicitado
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

            // Definir desconto baseado no intervalo
            if (interval === 6) {
                discountPercent = Number(plan.discount_semiannual || 10);
            } else if (interval === 12) {
                discountPercent = Number(plan.discount_annual || 20);
            }
        }

        // Calcular valor total baseado no período
        // Unit amount no Stripe (recorrente) é o valor MENSAL.
        // Se for modo Payment (parcelado), é o valor TOTAL.
        let totalAmount = itemPrice * interval;
        if (discountPercent > 0) {
            totalAmount = totalAmount * (1 - (discountPercent / 100));
        }

        // --- LÓGICA DE PRO-RATA (APENAS PARA INTER OU ADICIONAIS MENSAL) ---
        // Se for mensal, mantemos a lógica de pro-rata atual
        let finalAmount = totalAmount;
        const isInter = req.url.includes('inter-pix') || req.url.includes('inter-boleto');

        if (interval === 1 && isAddon && tenant.plan && tenant.plan !== 'trial') {
            const now = new Date();
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const remainingDays = lastDayOfMonth - now.getDate() + 1;

            if (isInter) {
                finalAmount = (itemPrice / lastDayOfMonth) * remainingDays;
                if (finalAmount < 1) finalAmount = 1;
            }
        }

        // 2. Customer Stripe
        let customerId = tenant.stripe_customer_id;

        if (customerId) {
            try {
                const existingCustomer = await stripeClient.customers.retrieve(customerId);
                if ((existingCustomer as any).deleted) {
                    customerId = null;
                }
            } catch (err: any) {
                if (err.status === 404 || err.code === 'resource_missing') {
                    customerId = null;
                } else {
                    throw err;
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

        // 3. Processar Coupon (Lógica existente simplificada)
        let stripeCouponId: string | undefined = undefined;
        const discounts: any[] = [];

        if (coupon) {
            try {
                const promoCodes = await stripeClient.promotionCodes.list({ code: coupon, active: true, limit: 1 });
                if (promoCodes.data.length > 0) {
                    discounts.push({ promotion_code: promoCodes.data[0].id });
                } else {
                    const { data: dbCoupon } = await supabaseAdmin.from('system_coupons').select('*').eq('code', coupon.toUpperCase()).single();
                    if (dbCoupon && dbCoupon.is_active) {
                        discounts.push({ coupon: dbCoupon.code });
                    }
                }
            } catch (e) {
                console.warn(`Cupom inválido: ${coupon}`);
            }
        }

        // 4. Criar Checkout Session Dinâmica
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
        const isSubscription = interval === 1;

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `791 Barber - ${itemName} (${interval} ${interval === 1 ? 'mês' : 'meses'})`,
                            description: isAddon ? 'Habilitação de Módulo Extra' : `Assinatura ${interval === 12 ? 'Anual' : interval === 6 ? 'Semestral' : 'Mensal'}`,
                        },
                        unit_amount: Math.round(isSubscription ? itemPrice * 100 : finalAmount * 100),
                        ...(isSubscription && { recurring: { interval: 'month' } }),
                    },
                    quantity: 1,
                },
            ],
            mode: isSubscription ? 'subscription' : 'payment',
            success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/checkout/cancel`,
            metadata: {
                tenant_id: tenant.id,
                [isAddon ? 'addon' : 'plan']: itemSlug,
                is_addon: isAddon ? 'true' : 'false',
                interval: String(interval),
                total_amount: String(finalAmount)
            },
            ...(isSubscription && {
                subscription_data: {
                    metadata: {
                        tenant_id: tenant.id,
                        [isAddon ? 'addon' : 'plan']: itemSlug,
                        interval: '1'
                    }
                }
            }),
            // Habilitar parcelamento para pagamentos (não recorrentes)
            ...(!isSubscription && {
                payment_method_types: ['card'],
                payment_intent_data: {
                    metadata: {
                        tenant_id: tenant.id,
                        [isAddon ? 'addon' : 'plan']: itemSlug,
                        interval: String(interval)
                    },
                    payment_method_options: {
                        card: {
                            installments: {
                                enabled: true,
                            }
                        }
                    }
                }
            } as any)
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
