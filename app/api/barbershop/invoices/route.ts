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

        // 2. Antes de listar, tenta sincronizar faturas pendentes recentes (últimos 3 dias)
        // Isso resolve o pedido do usuário para check automático sem clique
        if (config && cert && key) {
            // ... (Inter sync logic remains)
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
                console.log(`[AUTO-SYNC] Verificando ${pendingRecent.length} faturas pendentes para ${tenant.name}`);

                for (const inv of pendingRecent) {
                    const txid = inv.metadata?.txid;
                    const stripeSessionId = inv.metadata?.stripe_session_id;

                    if (txid) {
                        try {
                            const details = await inter.getBillingBySolicitacao(txid);
                            const finalDetails = details.cobranca ? { ...details.cobranca, boleto: details.boleto, pix: details.pix } : details;
                            const situacao = finalDetails?.situacao || finalDetails?.status;

                            const isPaid = situacao === 'PAGO' ||
                                situacao === 'RECEBIDO' ||
                                situacao === 'CONCLUIDA' ||
                                situacao === 'RECEBIDA';

                            const isCanceled = situacao === 'CANCELADO' ||
                                situacao === 'EXPIRADO' ||
                                situacao === 'REJEITADA';

                            if (isPaid) {
                                console.log(`[AUTO-SYNC] ✅ PAGO detectado para TXID: ${txid}`);
                                // Libera Tenant
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
                            } else if (isCanceled && inv.metadata?.status_inter !== situacao) {
                                console.log(`[AUTO-SYNC] 🔴 CANCELADO detectado para TXID: ${txid}`);
                                await supabaseAdmin.from('finance').update({
                                    metadata: { ...inv.metadata, status_inter: situacao }
                                }).eq('id', inv.id);
                            }
                        } catch (e) {
                            console.warn(`[AUTO-SYNC] Erro ao consultar TXID ${txid}:`, e);
                        }
                    }
                }
            }
        }

        // 2.1 Sync Stripe (GOL DA VITÓRIA ⚽)
        let stripeCustomerId = tenant.stripe_customer_id;
        try {
            const { stripe } = await import('@/lib/stripe-server');

            // Se não tiver customer ID, tenta buscar pelo email da barbearia ou do usuário
            if (!stripeCustomerId) {
                console.log(`[STRIPE-SYNC] Buscando customer por email: ${tenant.email || user.email}`);
                const customersQuery = await stripe.customers.list({
                    email: tenant.email || user.email,
                    limit: 1
                });
                if (customersQuery.data.length > 0) {
                    stripeCustomerId = customersQuery.data[0].id;
                    console.log(`[STRIPE-SYNC] Customer encontrado: ${stripeCustomerId}`);
                    // Salva para o futuro
                    await supabaseAdmin.from('tenants').update({ stripe_customer_id: stripeCustomerId }).eq('id', tenant.id);
                }
            }

            if (stripeCustomerId) {
                // A. Sincronizar Sessões de Checkout (Pagamento inicial)
                const sessions = await stripe.checkout.sessions.list({
                    customer: stripeCustomerId,
                    limit: 10,
                });

                for (const session of sessions.data) {
                    if (session.payment_status === 'paid' && (session.status === 'complete' || session.status === 'expired' /* some sessions stay expired but paid */)) {
                        const { data: existingFinance } = await supabaseAdmin
                            .from('finance')
                            .select('id, is_paid')
                            .eq('metadata->>stripe_session_id', session.id)
                            .maybeSingle();

                        if (!existingFinance || !existingFinance.is_paid) {
                            console.log(`[STRIPE-SYNC] ✅ Sessão paga encontrada: ${session.id}`);
                            const planFromMetadata = session.metadata?.plan || 'premium';

                            // Atualizar Tenant
                            await supabaseAdmin.from('tenants').update({
                                plan: planFromMetadata,
                                subscription_status: 'active',
                                stripe_customer_id: stripeCustomerId,
                                stripe_subscription_id: session.subscription as string,
                            }).eq('id', tenant.id);

                            if (!existingFinance) {
                                await supabaseAdmin.from('finance').insert({
                                    tenant_id: tenant.id,
                                    type: 'revenue',
                                    value: (session.amount_total || 0) / 100,
                                    description: `Assinatura SaaS - Plano ${planFromMetadata.toUpperCase()} (Stripe CSS)`,
                                    date: new Date(session.created * 1000).toISOString().split('T')[0],
                                    is_paid: true,
                                    metadata: {
                                        stripe_session_id: session.id,
                                        stripe_customer_id: stripeCustomerId,
                                        method: 'stripe_card'
                                    }
                                });
                            } else {
                                await supabaseAdmin.from('finance').update({
                                    is_paid: true,
                                    description: `Assinatura SaaS - Plano ${planFromMetadata.toUpperCase()} (Stripe CSS Update)`
                                }).eq('id', existingFinance.id);
                            }
                        }
                    }
                }

                // B. Sincronizar Invoices (Renovações)
                const stripeInvoices = await stripe.invoices.list({
                    customer: stripeCustomerId,
                    limit: 10,
                    status: 'paid'
                });

                for (const invStripe of stripeInvoices.data) {
                    const { data: existingInv } = await supabaseAdmin
                        .from('finance')
                        .select('id')
                        .eq('metadata->>stripe_invoice_id', invStripe.id)
                        .maybeSingle();

                    if (!existingInv) {
                        const amount = invStripe.amount_paid / 100;
                        if (amount > 0) {
                            console.log(`[STRIPE-SYNC] ✅ Fatura paga encontrada: ${invStripe.id}`);
                            await supabaseAdmin.from('finance').insert({
                                tenant_id: tenant.id,
                                type: 'revenue',
                                value: amount,
                                description: `Renovação SaaS (Stripe INV)`,
                                date: new Date(invStripe.status_transitions.paid_at! * 1000).toISOString().split('T')[0],
                                is_paid: true,
                                metadata: {
                                    stripe_invoice_id: invStripe.id,
                                    stripe_customer_id: stripeCustomerId,
                                    method: 'stripe_card'
                                }
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
