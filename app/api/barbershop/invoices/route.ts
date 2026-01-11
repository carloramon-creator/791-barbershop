import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3'; // Using V3
import Stripe from 'stripe';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    const startTime = Date.now();
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        console.log(`[INVOICES] Iniciando busca para ${tenant.name} (${tenant.id})`);

        // 1. Busca Configuração Inter (para o check automático)
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const config = settingsData?.value;
        const cert = config?.crt?.replace(/\\n/g, '\n');
        const key = config?.key?.replace(/\\n/g, '\n');

        // 2. Sync Inter (Rápido, apenas se houver configuração)
        if (config && cert && key) {
            try {
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

                                if (['PAGO', 'RECEBIDO', 'CONCLUIDA', 'RECEBIDA'].includes(situacao)) {
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
                                console.warn(`[AUTO-SYNC INTER] Erro em ${txid}`);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[INTER-SYNC ERROR]', e);
            }
        }

        // 2.1 Sync Stripe (Ajustado para performance e precisão)
        try {
            const { data: stripeSettings } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'stripe_config')
                .single();

            const finalStripeKey = stripeSettings?.value?.secret_key || process.env.STRIPE_SECRET_KEY;

            if (finalStripeKey && !finalStripeKey.includes('dummy')) {
                const stripe = new Stripe(finalStripeKey, {
                    apiVersion: '2025-12-15.clover' as any,
                    typescript: true,
                });

                let stripeCustomerId = tenant.stripe_customer_id;

                if (!stripeCustomerId) {
                    const searchEmails = [tenant.email, user.email].filter(Boolean);
                    for (const email of Array.from(new Set(searchEmails as string[]))) {
                        const customers = await stripe.customers.list({ email, limit: 1 });
                        if (customers.data.length > 0) {
                            stripeCustomerId = customers.data[0].id;
                            await supabaseAdmin.from('tenants').update({ stripe_customer_id: stripeCustomerId }).eq('id', tenant.id);
                            break;
                        }
                    }
                }

                if (stripeCustomerId) {
                    // Sincronizar Sessões e Invoices (Paralelizar para carregar mais rápido)
                    const [sessions, invoicesStripe] = await Promise.all([
                        stripe.checkout.sessions.list({ customer: stripeCustomerId, limit: 5 }),
                        stripe.invoices.list({ customer: stripeCustomerId, limit: 5, status: 'paid' })
                    ]);

                    // Processar Sessões
                    let planUpdated = false;
                    for (const session of sessions.data) {
                        if (session.payment_status === 'paid') {
                            const planFromMeta = session.metadata?.plan || 'premium';

                            // Atualizar tenant (sem criar registro financeiro)
                            // APENAS para a primeira sessão encontrada (a mais recente)
                            if (!planUpdated) {
                                await supabaseAdmin.from('tenants').update({
                                    plan: planFromMeta,
                                    subscription_status: 'active',
                                    stripe_subscription_id: session.subscription as string,
                                }).eq('id', tenant.id);
                                planUpdated = true;
                                console.log(`[STRIPE-SYNC] Plano atualizado para ${planFromMeta} (Sessão: ${session.id})`);
                            }

                            // Criar registro APENAS na tabela finance para histórico de faturas
                            // NÃO aparece no módulo Financeiro da barbearia
                            const { data: exists } = await supabaseAdmin
                                .from('finance')
                                .select('id')
                                .eq('metadata->>stripe_session_id', session.id)
                                .eq('tenant_id', tenant.id)
                                .maybeSingle();

                            if (!exists) {
                                await supabaseAdmin.from('finance').insert({
                                    tenant_id: tenant.id,
                                    type: 'expense', // MUDADO: expense ao invés de revenue
                                    value: (session.amount_total || 0) / 100,
                                    description: `ASSINATURA SAAS - Plano ${planFromMeta} (Stripe CSS)`,
                                    date: new Date(session.created * 1000).toISOString().split('T')[0],
                                    is_paid: true,
                                    metadata: {
                                        stripe_session_id: session.id,
                                        stripe_customer_id: stripeCustomerId,
                                        stripe_subscription_id: session.subscription,
                                        method: 'stripe_card',
                                        is_saas_payment: true // Flag para identificar
                                    }
                                });
                            }
                        }
                    }

                    // Processar Invoices (Renovações)
                    for (const inv of invoicesStripe.data) {
                        // Verificar se JÁ existe por invoice_id
                        const { data: existsByInvoice } = await supabaseAdmin
                            .from('finance')
                            .select('id')
                            .eq('metadata->>stripe_invoice_id', inv.id)
                            .eq('tenant_id', tenant.id)
                            .maybeSingle();

                        // Verificar se JÁ existe por subscription_id (evitar duplicata com session)
                        let existsBySubscription = null;
                        const subscriptionId = (inv as any).subscription;
                        if (subscriptionId) {
                            const { data: subCheck } = await supabaseAdmin
                                .from('finance')
                                .select('id')
                                .eq('tenant_id', tenant.id)
                                .eq('metadata->>stripe_subscription_id', subscriptionId)
                                .gte('created_at', new Date(inv.created * 1000 - 60000).toISOString()) // 1 min antes
                                .lte('created_at', new Date(inv.created * 1000 + 60000).toISOString()) // 1 min depois
                                .maybeSingle();
                            existsBySubscription = subCheck;
                        }

                        // Se já existe (por qualquer método), pular
                        if (existsByInvoice || existsBySubscription) {
                            continue;
                        }

                        // Criar novo registro apenas se não existir
                        const amount = inv.amount_paid / 100;
                        if (amount > 0) {
                            await supabaseAdmin.from('finance').insert({
                                tenant_id: tenant.id,
                                type: 'expense', // MUDADO: expense ao invés de revenue
                                value: amount,
                                description: `RENOVAÇÃO SAAS (Stripe INV)`,
                                date: new Date((inv.status_transitions?.paid_at || inv.created) * 1000).toISOString().split('T')[0],
                                is_paid: true,
                                metadata: {
                                    stripe_invoice_id: inv.id,
                                    stripe_customer_id: stripeCustomerId,
                                    stripe_subscription_id: subscriptionId,
                                    method: 'stripe_card',
                                    is_saas_payment: true // Flag para identificar
                                }
                            });
                            await supabaseAdmin.from('tenants').update({ subscription_status: 'active' }).eq('id', tenant.id);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[STRIPE-SYNC ERROR]', e);
        }

        // 3. Buscar faturas atualizadas
        // Removi o filtro ilike rigoroso para garantir que nada fique de fora
        const { data: invoices, error } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('tenant_id', tenant.id)
            .or('description.ilike.%SaaS%,description.ilike.%Assinatura%,description.ilike.%Renovação%')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`[INVOICES] Finalizado em ${Date.now() - startTime}ms. Encontradas: ${invoices?.length || 0}`);
        return addCorsHeaders(req, NextResponse.json({ invoices: invoices || [] }));

    } catch (error: any) {
        console.error('[GET INVOICES ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
