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
                .maybeSingle(); // Use maybeSingle to avoid crash
            financeRecord = data;
        }

        // 2. Fallback: Tentar pelo ID do pagamento Asaas (para Pix/Boleto direto)
        if (!financeRecord) {
            console.log('[ASAAS WEBHOOK] 🔍 Buscando por ID direto:', payment.id);
            const { data } = await supabaseAdmin
                .from('finance')
                .select('*')
                .or(`metadata->>asaas_checkout_id.eq.${payment.id},metadata->>asaas_payment_id.eq.${payment.id}`)
                .maybeSingle();
            financeRecord = data;
        }

        // 3. Fallback: Tentar pelo Checkout ID ou Subscription ID nos metadados
        if (!financeRecord) {
            const searchId = payment.checkoutId || payment.subscription || body.subscriptionId || body.subscription?.id;
            if (searchId) {
                console.log('[ASAAS WEBHOOK] 🔍 Buscando por Checkout/Subscription ID:', searchId);
                const { data } = await supabaseAdmin
                    .from('finance')
                    .select('*')
                    .or(`metadata->>asaas_checkout_id.eq.${searchId},metadata->>asaas_subscription_id.eq.${searchId}`)
                    .maybeSingle();
                financeRecord = data;
            }
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

        // 5. Fallback Final: Tentar pelo Customer ID e Valor (para quando tudo mais falha no Sandbox)
        if (!financeRecord) {
            console.log('[ASAAS WEBHOOK] 🔍 Fallback final por Customer e Valor:', { customer: payment.customer, value: payment.value });
            const { data, error } = await supabaseAdmin
                .from('finance')
                .select('*')
                .eq('metadata->>asaas_customer_id', payment.customer)
                .eq('value', payment.value)
                .eq('is_paid', false)
                .order('created_at', { ascending: false })
                .maybeSingle();
            financeRecord = data;
        }

        if (!financeRecord) {
            console.log('[ASAAS WEBHOOK] ❌ Registro financeiro NÃO encontrado após todos os fallbacks');
            return NextResponse.json({
                received: true,
                message: 'Finance record not found',
                details: { extRef: payment.externalReference, payId: payment.id, subId: payment.subscription, custId: payment.customer }
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
            case 'PAYMENT_AUTHORIZED':
            case 'CHECKOUT_PAID':
            case 'SUBSCRIPTION_CREATED':
                console.log(`[ASAAS WEBHOOK] Evento ${event} recebido! Verificando ativação...`);

                const metadata = financeRecord.metadata as any;
                const planSlug = metadata.plan;
                const addonSlug = metadata.addon;
                const interval = metadata.interval || 1;

                // Idempotência: Se já está pago e não é um evento de assinatura, podemos pular a ativação
                // mas ainda é bom garantir que os metadados estejam atualizados
                if (financeRecord.is_paid && event !== 'SUBSCRIPTION_CREATED') {
                    console.log('[ASAAS WEBHOOK] ⏭️ Registro já marcado como pago. Pulando ativação redundante.');
                    return NextResponse.json({ received: true, message: 'Already processed' });
                }

                // Se for confirmação de pagamento real ou autorização/checkout pago
                const isSuccessEvent = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_AUTHORIZED', 'CHECKOUT_PAID'].includes(event);

                if (isSuccessEvent) {
                    // 1. Marcar registro financeiro como pago
                    await supabaseAdmin
                        .from('finance')
                        .update({
                            is_paid: true,
                            metadata: {
                                ...metadata,
                                payment_confirmed_at: new Date().toISOString(),
                                last_event: event,
                                asaas_status: payment.status,
                                asaas_payment_id: payment.id,
                                asaas_event_id: body.id // Armazenar o ID do evento para conferência
                            }
                        })
                        .eq('id', financeRecord.id);

                    // 2. Ativar Plano
                    if (planSlug) {
                        const now = new Date();
                        const newEndDate = new Date(now);
                        newEndDate.setMonth(newEndDate.getMonth() + interval);

                        await supabaseAdmin
                            .from('tenants')
                            .update({
                                plan: planSlug,
                                subscription_status: 'active',
                                subscription_current_period_end: newEndDate.toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', tenantId);

                        console.log('[ASAAS WEBHOOK] ✅ Plano ativado com sucesso');
                    }

                    // 3. Ativar Addon
                    if (addonSlug) {
                        const { data: tenantData } = await supabaseAdmin
                            .from('tenants')
                            .select('active_addons')
                            .eq('id', tenantId)
                            .single();

                        const activeAddons = tenantData?.active_addons || [];
                        if (!activeAddons.includes(addonSlug)) {
                            activeAddons.push(addonSlug);
                            await supabaseAdmin
                                .from('tenants')
                                .update({ active_addons: activeAddons })
                                .eq('id', tenantId);

                            console.log('[ASAAS WEBHOOK] ✅ Addon ativado:', addonSlug);
                        }
                    }
                } else if (event === 'SUBSCRIPTION_CREATED') {
                    // Apenas salvar o ID da assinatura para referência futura se ainda não foi pago
                    await supabaseAdmin
                        .from('finance')
                        .update({
                            metadata: {
                                ...metadata,
                                asaas_subscription_id: payment.subscription || body.subscription?.id || null
                            }
                        })
                        .eq('id', financeRecord.id);
                    console.log('[ASAAS WEBHOOK] 📝 Assinatura vinculada ao registro financeiro');
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
