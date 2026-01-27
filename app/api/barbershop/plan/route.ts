import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let tenantId = searchParams.get('tenant_id');

        console.log('[API GET PLAN] Initial tenant_id:', tenantId);

        // Try to get tenant from session (More robust)
        try {
            const { tenant } = await getCurrentUserAndTenant();
            if (tenant && tenant.id) {
                console.log('[API GET PLAN] Found tenant from session:', tenant.id);
                tenantId = tenant.id;
            }
        } catch (e) {
            console.log('[API GET PLAN] Session check failed, valid if public access or distinct context:', e);
            // Continue with param tenantId
        }

        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Tenant ID required and no session found' }, { status: 400 }));
        }

        const { data: tenant, error } = await getSupabaseAdmin()
            .from('tenants')
            .select('id, plan, stripe_subscription_id, asaas_subscription_id, subscription_status, stripe_customer_id, metadata')
            .eq('id', tenantId)
            .maybeSingle();

        if (error) {
            console.error('[API GET PLAN] DB Error:', error);
            throw error;
        }

        if (!tenant) {
            return addCorsHeaders(req, NextResponse.json({ error: `Barbearia não encontrada` }, { status: 404 }));
        }

        // 2.5 Verificar Assinatura no Stripe se existir (Auto-Heal)
        let stripeSubscriptionId = tenant.stripe_subscription_id;
        let subscriptionStatus = tenant.subscription_status;

        if (stripeSubscriptionId) {
            try {
                const { data: settingsData } = await getSupabaseAdmin()
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'stripe_config')
                    .single();

                const stripeKey = settingsData?.value?.secret_key;
                if (stripeKey && !stripeKey.includes('dummy')) {
                    const Stripe = (await import('stripe')).default;
                    const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-15.clover' as any });

                    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

                    if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
                        throw new Error('Subscription stale');
                    }

                    // Sincroniza status se houver divergência
                    if (sub.status !== subscriptionStatus) {
                        subscriptionStatus = sub.status;
                        await getSupabaseAdmin().from('tenants').update({ subscription_status: sub.status }).eq('id', tenant.id);
                    }
                }
            } catch (err: any) {
                console.warn(`[PLAN API] Assinatura ${stripeSubscriptionId} inválida ou erro no Stripe. Limpando local...`);
                stripeSubscriptionId = null;
                subscriptionStatus = 'canceled';
                await getSupabaseAdmin().from('tenants').update({
                    stripe_subscription_id: null,
                    subscription_status: 'canceled'
                }).eq('id', tenant.id);
            }
        }

        // 3. Buscar Add-ons Ativos
        const { data: addons } = await getSupabaseAdmin()
            .from('tenant_addons')
            .select('system_addons(slug)')
            .eq('tenant_id', tenantId)
            .eq('status', 'active');

        const activeAddons = addons?.map((a: any) => a.system_addons?.slug).filter(Boolean) || [];

        // 2.6 Sincronização Automática (Self-Healing)
        // Se a barbearia consta como Trial/Expirado no banco, mas tem pagamento recente, ativa na hora.
        if (subscriptionStatus !== 'active') {
            try {
                // 1. Verificar registros financeiros locais do tipo SaaS PAGOS nos últimos 7 dias
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { data: paidRecent } = await getSupabaseAdmin()
                    .from('finance')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .eq('is_paid', true)
                    .or('metadata->>is_saas_payment.eq.true,description.ilike.%SaaS%,description.ilike.%Assinatura%')
                    .gte('created_at', sevenDaysAgo.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (paidRecent) {
                    console.log(`[PLAN API HEALING] Detectado pagamento recente de R$ ${paidRecent.value}. Ativando tenant...`);
                    const meta = paidRecent.metadata as any;
                    const planSlug = meta.plan || (paidRecent.description?.toLowerCase().includes('premium') ? 'premium' : 'basic');
                    const interval = meta.interval || 1;

                    const now = new Date();
                    const periodEnd = new Date(now);
                    periodEnd.setMonth(periodEnd.getMonth() + interval);

                    await getSupabaseAdmin().from('tenants').update({
                        plan: planSlug,
                        subscription_status: 'active',
                        subscription_current_period_end: periodEnd.toISOString()
                    }).eq('id', tenantId);

                    subscriptionStatus = 'active';
                    tenant.plan = planSlug;
                } else {
                    // 2. Se não achou pago, verifica se tem PENDENTES recentes do Asaas pra conferir no ato
                    const { data: pendingAsaas } = await getSupabaseAdmin()
                        .from('finance')
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .eq('is_paid', false)
                        .not('metadata->>asaas_checkout_id', 'is', null)
                        .gte('created_at', sevenDaysAgo.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(3);

                    if (pendingAsaas && pendingAsaas.length > 0) {
                        const { data: asaasSettings } = await getSupabaseAdmin()
                            .from('system_settings')
                            .select('value')
                            .eq('key', 'asaas_config')
                            .single();

                        const asaasKey = asaasSettings?.value?.api_key || process.env.ASAAS_API_KEY;
                        if (asaasKey) {
                            const AsaasClient = (await import('@/lib/asaas-client')).default;
                            const asaas = new AsaasClient({
                                apiKey: asaasKey,
                                environment: (asaasSettings?.value?.environment || 'sandbox') as 'sandbox' | 'production'
                            });

                            for (const charge of pendingAsaas) {
                                try {
                                    const checkoutId = charge.metadata.asaas_checkout_id;
                                    const checkout = await asaas.getCheckout(checkoutId);
                                    const paymentId = checkout.paymentId || checkout.payment?.id || checkout.subscriptionId || (checkout.payments && checkout.payments[0]?.id);

                                    if (paymentId) {
                                        const payment = await asaas.getPayment(paymentId);
                                        if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
                                            console.log(`[PLAN API HEALING] Asaas confirmou pagamento ${paymentId} em tempo real. Ativando...`);

                                            // Atualiza fatura
                                            await getSupabaseAdmin().from('finance').update({
                                                is_paid: true,
                                                metadata: { ...charge.metadata, asaas_status: payment.status, asaas_payment_id: paymentId, sync_type: 'plan_api_healing' }
                                            }).eq('id', charge.id);

                                            // Ativa plano
                                            const meta = charge.metadata as any;
                                            const planSlug = meta.plan || 'basic';
                                            const interval = meta.interval || 1;
                                            const now = new Date();
                                            const periodEnd = new Date(now);
                                            periodEnd.setMonth(periodEnd.getMonth() + interval);

                                            await getSupabaseAdmin().from('tenants').update({
                                                plan: planSlug,
                                                subscription_status: 'active',
                                                subscription_current_period_end: periodEnd.toISOString()
                                            }).eq('id', tenantId);

                                            subscriptionStatus = 'active';
                                            tenant.plan = planSlug;
                                            break; // Achou um pago, já ativa e encerra
                                        }
                                    }
                                } catch (e) {
                                    console.warn(`[PLAN API HEALING] Falha ao conferir checkout ${charge.metadata.asaas_checkout_id}`);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[PLAN API HEALING ERROR]', err);
            }
        }

        const response = NextResponse.json({
            currentPlan: tenant.plan || 'basic',
            stripeSubscriptionId: stripeSubscriptionId,
            asaasSubscriptionId: tenant.asaas_subscription_id,
            interRecurrenceId: (tenant.metadata as any)?.id_rec,
            subscriptionStatus: subscriptionStatus,
            activeAddons: activeAddons
        });
        return addCorsHeaders(req, response);
    } catch (error: any) {
        console.error('[API GET PLAN] Erro:', error.message);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 400 }));
    }
}

export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let tenantId = searchParams.get('tenant_id');
        const body = await req.json();
        const { newPlan } = body;

        // Try to get tenant from session
        try {
            const { tenant, role } = await getCurrentUserAndTenant();
            if (tenant && tenant.id) {
                tenantId = tenant.id;
                if (role !== 'owner') {
                    return addCorsHeaders(req, NextResponse.json({ error: 'Apenas proprietários podem mudar o plano' }, { status: 403 }));
                }
            }
        } catch (e) { }

        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Tenant ID required' }, { status: 400 }));
        }

        // Validação básica de existência do plano no banco
        const { data: planExists } = await getSupabaseAdmin()
            .from('system_plans')
            .select('id')
            .eq('slug', newPlan)
            .single();

        if (!planExists && newPlan !== 'trial') {
            return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));
        }

        const { data: updated, error } = await getSupabaseAdmin()
            .from('tenants')
            .update({ plan: newPlan })
            .eq('id', tenantId)
            .select('plan')
            .maybeSingle();

        if (error) throw error;

        if (!updated) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não encontrada ao tentar atualizar' }, { status: 404 }));
        }

        console.log('[API POST PLAN] Plano atualizado:', updated.plan);

        const response = NextResponse.json({
            currentPlan: updated.plan
        }, { status: 200 });
        return addCorsHeaders(req, response);
    } catch (error: any) {
        console.error('[API POST PLAN] Erro:', error.message);
        const response = NextResponse.json(
            { error: error.message },
            { status: 400 }
        );
        return addCorsHeaders(req, response);
    }
}
