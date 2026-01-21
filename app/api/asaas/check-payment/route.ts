import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

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

        const { searchParams } = new URL(req.url);
        const paymentId = searchParams.get('paymentId');

        if (!paymentId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'paymentId é obrigatório' }, { status: 400 }));
        }

        // Buscar configuração do Asaas
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const asaasConfig = settingsData?.value;
        const apiKey = asaasConfig?.api_key || process.env.ASAAS_API_KEY;
        const environment = asaasConfig?.environment || 'sandbox';

        if (!apiKey) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Configuração do Asaas incompleta'
            }, { status: 400 }));
        }

        const asaas = new AsaasClient({ apiKey, environment: environment as 'sandbox' | 'production' });

        // Consultar status do pagamento no Asaas
        const payment = await asaas.getPayment(paymentId);

        console.log('[CHECK ASAAS PAYMENT]', {
            paymentId,
            status: payment.status,
            value: payment.value,
            billingType: payment.billingType
        });

        // Verificar se foi pago
        const isPaid = payment.status === 'CONFIRMED' || payment.status === 'RECEIVED';

        // Buscar registro local
        const { data: financeRecord } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('metadata->>asaas_checkout_id', paymentId)
            .eq('tenant_id', tenant.id)
            .maybeSingle();

        // Se estiver pago no Asaas mas não no nosso banco, sincroniza AGORA
        if (isPaid && financeRecord && !financeRecord.is_paid) {
            console.log('[POLLING ASAAS] 🔥 Pagamento detectado via Polling (Frontend Check)! Atualizando...');

            // 1. Marcar fatura como paga
            await supabaseAdmin.from('finance').update({
                is_paid: true,
                metadata: {
                    ...financeRecord.metadata,
                    payment_confirmed_at: new Date().toISOString(),
                    asaas_status: payment.status,
                    sync_type: 'polling_check'
                }
            }).eq('id', financeRecord.id);

            const metadata = financeRecord.metadata as any;
            const planSlug = metadata.plan;
            const addonSlug = metadata.addon;
            const interval = metadata.interval || 1;

            if (planSlug) {
                const now = new Date();
                const newEndDate = new Date(now);
                newEndDate.setMonth(newEndDate.getMonth() + interval);

                await supabaseAdmin.from('tenants').update({
                    plan: planSlug,
                    subscription_status: 'active',
                    subscription_current_period_end: newEndDate.toISOString(),
                }).eq('id', tenant.id);
            }

            if (addonSlug) {
                const { data: tData } = await supabaseAdmin
                    .from('tenants')
                    .select('active_addons')
                    .eq('id', tenant.id)
                    .single();

                const activeAddons = tData?.active_addons || [];
                if (!activeAddons.includes(addonSlug)) {
                    activeAddons.push(addonSlug);
                    await supabaseAdmin.from('tenants').update({ active_addons: activeAddons }).eq('id', tenant.id);
                }
            }
        }

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                value: payment.value,
                billingType: payment.billingType,
                dueDate: payment.dueDate,
                isPaid,
                localRecord: {
                    exists: !!financeRecord,
                    isPaid: isPaid || (financeRecord?.is_paid || false)
                }
            }
        }));

    } catch (error: any) {
        console.error('[CHECK ASAAS PAYMENT ERROR]', error);

        const errorMessage = error.response?.data?.errors?.[0]?.description ||
            error.response?.data?.error ||
            error.message ||
            'Erro ao verificar pagamento';

        return addCorsHeaders(req, NextResponse.json({
            error: errorMessage
        }, { status: error.response?.status || 500 }));
    }
}
