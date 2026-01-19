import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const event = body.event;
        const payment = body.payment;

        console.log('[ASAAS WEBHOOK]', event, payment?.id);

        if (!payment) {
            return NextResponse.json({ received: true });
        }

        // Buscar tenant pelo external reference ou payment ID
        const { data: financeRecord } = await supabaseAdmin
            .from('finance')
            .select('*')
            .eq('metadata->>asaas_payment_id', payment.id)
            .single();

        if (!financeRecord) {
            console.log('[ASAAS WEBHOOK] Finance record not found for payment:', payment.id);
            return NextResponse.json({ received: true });
        }

        const tenantId = financeRecord.tenant_id;

        // Processar eventos
        switch (event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                // Marcar como pago
                await supabaseAdmin
                    .from('finance')
                    .update({ is_paid: true })
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

                    await supabaseAdmin
                        .from('tenants')
                        .update({
                            plan: planSlug,
                            subscription_status: 'active',
                            subscription_current_period_end: newEndDate.toISOString(),
                        })
                        .eq('id', tenantId);

                    console.log('[ASAAS WEBHOOK] Plan activated:', planSlug, 'for tenant:', tenantId);
                }

                if (addonSlug) {
                    // Ativar addon
                    const { data: tenant } = await supabaseAdmin
                        .from('tenants')
                        .select('active_addons')
                        .eq('id', tenantId)
                        .single();

                    const activeAddons = tenant?.active_addons || [];
                    if (!activeAddons.includes(addonSlug)) {
                        activeAddons.push(addonSlug);
                        await supabaseAdmin
                            .from('tenants')
                            .update({ active_addons: activeAddons })
                            .eq('id', tenantId);
                    }

                    console.log('[ASAAS WEBHOOK] Addon activated:', addonSlug, 'for tenant:', tenantId);
                }
                break;

            case 'PAYMENT_OVERDUE':
                // Marcar como vencido
                await supabaseAdmin
                    .from('finance')
                    .update({
                        metadata: {
                            ...financeRecord.metadata,
                            status: 'overdue'
                        }
                    })
                    .eq('id', financeRecord.id);

                console.log('[ASAAS WEBHOOK] Payment overdue:', payment.id);
                break;

            case 'PAYMENT_DELETED':
            case 'PAYMENT_REFUNDED':
                // Desativar plano se necessário
                await supabaseAdmin
                    .from('tenants')
                    .update({ subscription_status: 'canceled' })
                    .eq('id', tenantId);

                console.log('[ASAAS WEBHOOK] Payment canceled/refunded:', payment.id);
                break;

            default:
                console.log('[ASAAS WEBHOOK] Unhandled event:', event);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('[ASAAS WEBHOOK ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
