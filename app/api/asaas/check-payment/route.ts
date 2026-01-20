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
            .eq('metadata->>asaas_payment_id', paymentId)
            .eq('tenant_id', tenant.id)
            .single();

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
                    isPaid: financeRecord?.is_paid || false
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
