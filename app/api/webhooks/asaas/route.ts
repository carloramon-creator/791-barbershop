import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const event = body.event;
        const payment = body.payment;

        // Log completo do webhook para debug
        console.log('[ASAAS WEBHOOK] Evento recebido:', {
            event,
            paymentId: payment?.id,
            status: payment?.status,
            value: payment?.value,
            billingType: payment?.billingType,
            customer: payment?.customer,
            externalReference: payment?.externalReference,
            fullPayload: JSON.stringify(body)
        });

        if (!payment) {
            console.log('[ASAAS WEBHOOK] Sem dados de pagamento no webhook');
            return NextResponse.json({ received: true });
        }

        // Buscar registro financeiro
        // 1. Tentar pelo externalReference (mais confiável)
        let financeRecord = null;
        let financeError = null;

        if (payment.externalReference) {
            const { data, error } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('metadata->>external_reference', payment.externalReference)
                .single();
            financeRecord = data;
            financeError = error;
        }

        // 2. Fallback: Tentar pelo ID do pagamento Asaas (para Pix/Boleto direto)
        if (!financeRecord) {
            console.log('[ASAAS WEBHOOK] 🔍 Buscando por ID direto:', payment.id);
            const { data, error } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('metadata->>asaas_checkout_id', payment.id)
                .maybeSingle();
            financeRecord = data;
        }

        // 3. Fallback: Tentar pelo Subscription ID nos metadados
        if (!financeRecord && payment.subscription) {
            console.log('[ASAAS WEBHOOK] 🔍 Buscando por Subscription ID nos metadados:', payment.subscription);
            const { data, error } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('metadata->>asaas_subscription_id', payment.subscription)
                .maybeSingle();
            financeRecord = data;
        }

        // 4. Fallback Legado: Tentar pelo Subscription ID direto no checkout_id (caso antigo)
        if (!financeRecord && payment.subscription) {
            const { data, error } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('metadata->>asaas_checkout_id', payment.subscription)
                .maybeSingle();
            financeRecord = data;
        }

        if (!financeRecord) {
            console.log('[ASAAS WEBHOOK] ❌ Registro financeiro NÃO encontrado:', {
                paymentId: payment.id,
                subscriptionId: payment.subscription,
                externalReference: payment.externalReference,
                searchKeys: ['metadata->>external_reference', 'metadata->>asaas_checkout_id']
            });
            return NextResponse.json({
                received: true,
                message: 'Finance record not found',
                details: { extRef: payment.externalReference, payId: payment.id }
            });
        }

        const tenantId = financeRecord.tenant_id;

        // Validar se o tenant existe
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('id, name, plan')
            .eq('id', tenantId)
            .single();

        if (tenantError || !tenant) {
            console.error('[ASAAS WEBHOOK] Tenant não encontrado:', {
                tenantId,
                error: tenantError?.message
            });
            // Retorna 200 para evitar retentativas
            return NextResponse.json({ received: true, message: 'Tenant not found' });
        }

        console.log('[ASAAS WEBHOOK] Processando para tenant:', {
            tenantId,
            tenantName: tenant.name,
            currentPlan: tenant.plan
        });

        // Processar eventos
        switch (event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                console.log('[ASAAS WEBHOOK] Pagamento confirmado! Ativando plano...');

                // Marcar como pago
                await supabaseAdmin
                    .from('finance')
                    .update({
                        is_paid: true,
                        metadata: {
                            ...financeRecord.metadata,
                            payment_confirmed_at: new Date().toISOString(),
                            asaas_status: payment.status
                        }
                    })
                    .eq('id', financeRecord.id);

                // Ativar plano
                const metadata = financeRecord.metadata as any;
                const planSlug = metadata.plan;
                const addonSlug = metadata.addon;
                const interval = metadata.interval || 1;

                if (planSlug) {
                    // Calcular nova data de expiração
                    const now = new Date();
                    const newEndDate = new Date(now);
                    newEndDate.setMonth(newEndDate.getMonth() + interval);

                    const { error: updateError } = await supabaseAdmin
                        .from('tenants')
                        .update({
                            plan: planSlug,
                            subscription_status: 'active',
                            subscription_current_period_end: newEndDate.toISOString(),
                        })
                        .eq('id', tenantId);

                    if (updateError) {
                        console.error('[ASAAS WEBHOOK] Erro ao ativar plano:', updateError);
                    } else {
                        console.log('[ASAAS WEBHOOK] ✅ Plano ativado com sucesso:', {
                            tenantId,
                            plan: planSlug,
                            interval,
                            expiresAt: newEndDate.toISOString()
                        });
                    }
                }

                if (addonSlug) {
                    // Ativar addon
                    const { data: tenantData } = await supabaseAdmin
                        .from('tenants')
                        .select('active_addons')
                        .eq('id', tenantId)
                        .single();

                    const activeAddons = tenantData?.active_addons || [];
                    if (!activeAddons.includes(addonSlug)) {
                        activeAddons.push(addonSlug);
                        const { error: addonError } = await supabaseAdmin
                            .from('tenants')
                            .update({ active_addons: activeAddons })
                            .eq('id', tenantId);

                        if (addonError) {
                            console.error('[ASAAS WEBHOOK] Erro ao ativar addon:', addonError);
                        } else {
                            console.log('[ASAAS WEBHOOK] ✅ Addon ativado:', {
                                tenantId,
                                addon: addonSlug
                            });
                        }
                    }
                }
                break;

            case 'PAYMENT_OVERDUE':
                console.log('[ASAAS WEBHOOK] Pagamento vencido');

                await supabaseAdmin
                    .from('finance')
                    .update({
                        metadata: {
                            ...financeRecord.metadata,
                            status: 'overdue',
                            overdue_at: new Date().toISOString()
                        }
                    })
                    .eq('id', financeRecord.id);
                break;

            case 'PAYMENT_DELETED':
            case 'PAYMENT_REFUNDED':
                console.log('[ASAAS WEBHOOK] Pagamento cancelado/reembolsado');

                await supabaseAdmin
                    .from('tenants')
                    .update({ subscription_status: 'canceled' })
                    .eq('id', tenantId);
                break;

            default:
                console.log('[ASAAS WEBHOOK] Evento não tratado:', event);
        }

        return NextResponse.json({ received: true, processed: true });

    } catch (error: any) {
        console.error('[ASAAS WEBHOOK ERROR] Erro crítico:', {
            message: error.message,
            stack: error.stack
        });

        // Sempre retorna 200 para evitar retentativas infinitas
        return NextResponse.json({
            received: true,
            error: error.message
        }, { status: 200 });
    }
}
