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

        // 2. Sync Inter (Otimizado com Throttling e Paralelismo)
        if (config && cert && key) {
            try {
                // Throttle: Só sincroniza se houveram novos registros criados nos últimos 10 minutos
                const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
                const { data: recentSync } = await supabaseAdmin
                    .from('finance')
                    .select('id')
                    .eq('tenant_id', tenant.id)
                    .ilike('description', '%SaaS%')
                    .gte('created_at', tenMinutesAgo)
                    .limit(1);

                if (!recentSync || recentSync.length === 0) {
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
                        console.log(`[AUTO-SYNC INTER] Sincronizando ${pendingRecent.length} faturas pendentes em paralelo...`);

                        await Promise.all(pendingRecent.map(async (inv) => {
                            const txid = inv.metadata?.txid;
                            if (!txid) return;

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

                                    await Promise.all([
                                        supabaseAdmin.from('tenants').update({
                                            plan,
                                            subscription_status: 'active',
                                            subscription_current_period_end: periodEnd.toISOString()
                                        }).eq('id', tenant.id),
                                        supabaseAdmin.from('finance').update({
                                            is_paid: true,
                                            metadata: { ...inv.metadata, status_inter: situacao }
                                        }).eq('id', inv.id)
                                    ]);
                                } else if (['CANCELADO', 'EXPIRADO', 'REJEITADA', 'BAIXADO'].includes(situacao)) {
                                    console.log(`[AUTO-SYNC INTER] Removendo fatura ${txid} pois o status no banco é ${situacao}`);
                                    await supabaseAdmin.from('finance').delete().eq('id', inv.id);
                                }
                            } catch (e) {
                                console.warn(`[AUTO-SYNC INTER] Erro em ${txid}`);
                            }
                        }));
                    }
                } else {
                    console.log(`[INVOICES] Sync Inter ignorado (throttled) - Sincronização recente detectada.`);
                }
            } catch (e) {
                console.error('[INTER-SYNC ERROR]', e);
            }
        }

        // 2.1 Sync Stripe (DESATIVADO: Webhook é a fonte da verdade para evitar duplicidade)
        // O código abaixo causava a criação de faturas "Stripe CSS" redundantes.
        /* 
        try {
            const { data: stripeSettings } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'stripe_config')
                .single();

            // ... (restante do código comentado) ...
        } catch (e) {
            console.error('[STRIPE-SYNC ERROR]', e);
        } 
        */

        // 2.2 Limpeza de Registros Cancelados/Antigos (Agressiva)
        try {
            // Remove registros que já estão marcados como cancelados/expirados
            await supabaseAdmin.from('finance')
                .delete()
                .eq('tenant_id', tenant.id)
                .or('metadata->>status_inter.eq.CANCELADO,metadata->>status_inter.eq.EXPIRADO,metadata->>status_inter.eq.REJEITADA,metadata->>status_inter.eq.BAIXADO,metadata->>status.eq.CANCELADO,metadata->>status.eq.EXPIRADO,metadata->>txid.eq.PENDING,description.ilike.%PENDING%');

            // Limpeza de segurança extra: registros não pagos criados há mais de 10 dias que não sejam renovações recorrentes
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
            await supabaseAdmin.from('finance')
                .delete()
                .eq('tenant_id', tenant.id)
                .eq('is_paid', false)
                .lt('created_at', tenDaysAgo);
        } catch (e) {
            console.error('[CLEANUP ERROR]', e);
        }

        // 3. Buscar faturas atualizadas
        // Busca APENAS pagamentos SaaS...
        const { data: invoices, error } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('tenant_id', tenant.id)
            .or('metadata->>is_saas_payment.eq.true,metadata->>stripe_session_id.neq.null,metadata->>stripe_invoice_id.neq.null,metadata->>method.eq.pix_inter,metadata->>method.eq.boleto_inter,description.ilike.%SAAS%,description.ilike.%ASSINATURA%,description.ilike.%RENOVAÇÃO%,description.ilike.%STRIPE%')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 4. ASAAS HEALING: Se houver faturas PENDENTES, tenta sincronizar uma delas em tempo real (Throttled)
        const pendingAsaas = (invoices || []).filter(inv => !inv.is_paid && inv.metadata?.asaas_checkout_id).slice(0, 2);
        if (pendingAsaas.length > 0) {
            try {
                const { data: asaasSettings } = await supabaseAdmin
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'asaas_config')
                    .single();

                const asaasConfig = asaasSettings?.value;
                const asaasKey = asaasConfig?.api_key || process.env.ASAAS_API_KEY;

                if (asaasKey) {
                    const AsaasClient = (await import('@/lib/asaas-client')).default;
                    const asaas = new AsaasClient({
                        apiKey: asaasKey,
                        environment: (asaasConfig?.environment || 'sandbox') as 'sandbox' | 'production'
                    });

                    for (const inv of pendingAsaas) {
                        try {
                            const checkout = await asaas.getCheckout(inv.metadata.asaas_checkout_id);
                            const paymentId = checkout.paymentId || checkout.payment?.id || checkout.subscriptionId;

                            if (paymentId) {
                                const payment = await asaas.getPayment(paymentId);
                                if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
                                    console.log(`[INVOICES HEALING] Sincronizando ${inv.id} via polling em tempo real...`);

                                    // Marcar como pago
                                    await supabaseAdmin.from('finance').update({
                                        is_paid: true,
                                        metadata: { ...inv.metadata, asaas_status: payment.status, asaas_payment_id: paymentId, sync_type: 'invoice_list_healing' }
                                    }).eq('id', inv.id);

                                    // Ativar plano se necessário (redundância de segurança)
                                    const meta = inv.metadata as any;
                                    const planSlug = meta.plan;
                                    const interval = meta.interval || 1;
                                    if (planSlug) {
                                        const now = new Date();
                                        const periodEnd = new Date(now);
                                        periodEnd.setMonth(periodEnd.getMonth() + interval);
                                        await supabaseAdmin.from('tenants').update({
                                            plan: planSlug,
                                            subscription_status: 'active',
                                            subscription_current_period_end: periodEnd.toISOString()
                                        }).eq('id', tenant.id);
                                    }

                                    // Atualiza o objeto na lista local para o usuário já ver como PAGO
                                    inv.is_paid = true;
                                }
                            }
                        } catch (e) {
                            console.warn(`[INVOICES HEALING] Falha ao conferir checkout ${inv.metadata.asaas_checkout_id}`);
                        }
                    }
                }
            } catch (e) {
                console.error('[INVOICES HEALING ERROR]', e);
            }
        }

        console.log(`[INVOICES] Finalizado em ${Date.now() - startTime}ms. Encontradas: ${invoices?.length || 0}`);
        return addCorsHeaders(req, NextResponse.json({ invoices: invoices || [] }));

    } catch (error: any) {
        console.error('[GET INVOICES ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
