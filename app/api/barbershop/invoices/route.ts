import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3'; // Using V3

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        // 1. Busca Configuração Inter (para o check automático)
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const config = settingsData?.value;
        const cert = config?.crt?.replace(/\\n/g, '\n');
        const key = config?.key?.replace(/\\n/g, '\n');

        // 2. Antes de listar, tenta sincronizar faturas Inter pendentes
        if (config && cert && key) {
            const inter = new InterAPIV3({
                clientId: config.client_id,
                clientSecret: config.client_secret,
                cert,
                key,
                accountNumber: config.account_number || config.accountNumber
            });

            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const { data: pendingRecent } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('tenant_id', tenant.id)
                .eq('is_paid', false)
                .ilike('description', '%SaaS%')
                .gte('created_at', threeDaysAgo.toISOString());

            if (pendingRecent && pendingRecent.length > 0) {
                for (const inv of pendingRecent) {
                    const txid = inv.metadata?.txid;
                    if (txid) {
                        try {
                            const details = await inter.getBillingBySolicitacao(txid);
                            const finalDetails = details.cobranca ? { ...details.cobranca, boleto: details.boleto, pix: details.pix } : details;
                            const situacao = finalDetails?.situacao || finalDetails?.status;

                            const isPaid = situacao === 'PAGO' ||
                                situacao === 'RECEBIDO' ||
                                situacao === 'CONCLUIDA' ||
                                situacao === 'RECEBIDA';

                            if (isPaid) {
                                console.log(`[AUTO-SYNC INTER] ✅ PAGO detectado para TXID: ${txid}`);
                                const description = inv.description || '';
                                let plan = 'basic';
                                if (description.toLowerCase().includes('premium')) plan = 'premium';
                                else if (description.toLowerCase().includes('completo')) plan = 'complete';

                                const periodEnd = new Date();
                                periodEnd.setDate(periodEnd.getDate() + 31);

                                await supabaseAdmin.from('tenants').update({
                                    plan,
                                    subscription_status: 'active',
                                    subscription_current_period_end: periodEnd.toISOString()
                                }).eq('id', tenant.id);

                                await supabaseAdmin.from('finance').update({
                                    is_paid: true,
                                    metadata: { ...inv.metadata, status_inter: situacao }
                                }).eq('id', inv.id);
                            }
                        } catch (e) {
                            console.warn(`[AUTO-SYNC INTER] Erro ${txid}:`, e);
                        }
                    }
                }
            }
        }

        // 2.1 Sync Stripe (GOL DA VITÓRIA ⚽)
        let stripeCustomerId = tenant.stripe_customer_id;
        try {
            const { stripe } = await import('@/lib/stripe-server');

            console.log(`[STRIPE-SYNC] Iniciando sync para ${tenant.name}. CustomerID: ${stripeCustomerId || 'vazio'}`);

            // Busca customer por emails se estiver vazio
            if (!stripeCustomerId) {
                const searchEmails = [tenant.email, user.email, 'ramon@791solucoes.com.br', 'carloramon@gmail.com'].filter(Boolean);
                const uniqueEmails = Array.from(new Set(searchEmails as string[]));
                console.log(`[STRIPE-SYNC] Buscando customer por emails: ${uniqueEmails.join(', ')}`);

                for (const email of uniqueEmails) {
                    const customersQuery = await stripe.customers.list({ email, limit: 1 });
                    if (customersQuery.data.length > 0) {
                        stripeCustomerId = customersQuery.data[0].id;
                        console.log(`[STRIPE-SYNC] Customer encontrado para ${email}: ${stripeCustomerId}`);
                        await supabaseAdmin.from('tenants').update({ stripe_customer_id: stripeCustomerId }).eq('id', tenant.id);
                        break;
                    }
                }
            }

            if (stripeCustomerId) {
                // A. Checkout Sessions
                const sessions = await stripe.checkout.sessions.list({ customer: stripeCustomerId, limit: 10 });
                console.log(`[STRIPE-SYNC] Encontradas ${sessions.data.length} sessões`);

                for (const session of sessions.data) {
                    if (session.payment_status === 'paid') {
                        const { data: exists } = await supabaseAdmin
                            .from('finance')
                            .select('id, is_paid')
                            .eq('metadata->>stripe_session_id', session.id)
                            .maybeSingle();

                        if (!exists || !exists.is_paid) {
                            console.log(`[STRIPE-SYNC] ✅ Sincronizando sessão paga: ${session.id}`);
                            const planFromMeta = session.metadata?.plan || 'premium';

                            await supabaseAdmin.from('tenants').update({
                                plan: planFromMeta,
                                subscription_status: 'active',
                                stripe_customer_id: stripeCustomerId,
                                stripe_subscription_id: session.subscription as string,
                            }).eq('id', tenant.id);

                            if (!exists) {
                                await supabaseAdmin.from('finance').insert({
                                    tenant_id: tenant.id,
                                    type: 'revenue',
                                    value: (session.amount_total || 0) / 100,
                                    description: `Assinatura SaaS - Plano ${planFromMeta.toUpperCase()} (Stripe CSS)`,
                                    date: new Date(session.created * 1000).toISOString().split('T')[0],
                                    is_paid: true,
                                    metadata: { stripe_session_id: session.id, stripe_customer_id: stripeCustomerId, method: 'stripe_card' }
                                });
                            } else {
                                await supabaseAdmin.from('finance').update({ is_paid: true }).eq('id', exists.id);
                            }
                        }
                    }
                }

                // B. Invoices
                const invoicesStripe = await stripe.invoices.list({ customer: stripeCustomerId, limit: 10, status: 'paid' });
                console.log(`[STRIPE-SYNC] Encontradas ${invoicesStripe.data.length} faturas`);

                for (const inv of invoicesStripe.data) {
                    const { data: exists } = await supabaseAdmin
                        .from('finance')
                        .select('id')
                        .eq('metadata->>stripe_invoice_id', inv.id)
                        .maybeSingle();

                    if (!exists) {
                        const amount = inv.amount_paid / 100;
                        if (amount > 0) {
                            console.log(`[STRIPE-SYNC] ✅ Nova fatura paga: ${inv.id}`);
                            await supabaseAdmin.from('finance').insert({
                                tenant_id: tenant.id,
                                type: 'revenue',
                                value: amount,
                                description: `Renovação SaaS (Stripe INV)`,
                                date: new Date((inv.status_transitions?.paid_at || inv.created) * 1000).toISOString().split('T')[0],
                                is_paid: true,
                                metadata: { stripe_invoice_id: inv.id, stripe_customer_id: stripeCustomerId, method: 'stripe_card' }
                            });
                            await supabaseAdmin.from('tenants').update({
                                subscription_status: 'active',
                                stripe_customer_id: stripeCustomerId
                            }).eq('id', tenant.id);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[STRIPE-SYNC ERROR]', e);
        }

        // 3. Buscar faturas atualizadas
        const { data: invoices, error } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('tenant_id', tenant.id)
            .ilike('description', '%SaaS%')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json({ invoices: invoices || [] }));
    } catch (error: any) {
        console.error('[GET INVOICES ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
