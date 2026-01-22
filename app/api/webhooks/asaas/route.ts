import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

export async function POST(req: Request) {
    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    console.log(`[ASAAS WEBHOOK 2.0] Evento recebido: ${event} | ID: ${body.id}`);

    // 1. Idempotência: Evitar processar o mesmo evento duas vezes
    const { data: existingEvent } = await supabaseAdmin
        .from('system_audit_logs')
        .select('id')
        .eq('action', 'asaas_webhook_processed')
        .eq('metadata->>webhook_event_id', body.id)
        .maybeSingle();

    if (existingEvent) {
        console.log('[ASAAS WEBHOOK 2.0] Evento já processado. Ignorando.');
        return NextResponse.json({ success: true, duplicated: true });
    }

    // 2. Focar nos eventos de sucesso de pagamento
    const successEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_AUTHORIZED', 'CHECKOUT_PAID'];
    if (!successEvents.includes(event)) {
        console.log(`[ASAAS WEBHOOK 2.0] Evento ${event} ignorado.`);
        return NextResponse.json({ success: true, skipped: true });
    }

    try {
        // 3. Sistema de Auto-Cura (Buscando o Tenant/Fatura de múltiplas formas)
        let financeRecord = null;

        // Estratégia A: Pelo externalReference (Mais confiável)
        const extRef = payment.externalReference || body.externalReference;
        if (extRef) {
            console.log('[ASAAS WEBHOOK 2.0] 🔍 Buscando por externalReference:', extRef);
            const { data } = await supabaseAdmin
                .from('finance')
                .select('*, tenants(*)')
                .eq('metadata->>external_reference', extRef)
                .maybeSingle();
            financeRecord = data;
        }

        // Estratégia B: Pelo Checkout ID ou Subscription ID
        if (!financeRecord) {
            const searchId = payment.checkoutId || payment.subscription || body.subscriptionId;
            if (searchId) {
                console.log('[ASAAS WEBHOOK 2.0] 🔍 Buscando por Checkout/Subscription ID:', searchId);
                const { data } = await supabaseAdmin
                    .from('finance')
                    .select('*, tenants(*)')
                    .or(`metadata->>asaas_checkout_id.eq.${searchId},metadata->>asaas_subscription_id.eq.${searchId}`)
                    .maybeSingle();
                financeRecord = data;
            }
        }

        // Estratégia C: Pelo CPF e Valor (Última instância - Auto-Cura Extrema)
        if (!financeRecord && payment.customer) {
            console.log('[ASAAS WEBHOOK 2.0] 🔍 Tentando Auto-Cura por Cliente/Valor...');
            // Buscar CPF na API do Asaas primeiro
            const { data: settings } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'asaas_config').single();
            const asaas = new AsaasClient({ apiKey: settings?.value?.api_key || process.env.ASAAS_API_KEY as string });
            const asaasCustomer = await asaas.getCustomer(payment.customer);
            const cpfCnpj = asaasCustomer.cpfCnpj;

            if (cpfCnpj) {
                const { data: tenantByDoc } = await supabaseAdmin
                    .from('tenants')
                    .select('id, name')
                    .or(`cnpj.eq.${cpfCnpj},cpf.eq.${cpfCnpj},document.eq.${cpfCnpj}`)
                    .maybeSingle();

                if (tenantByDoc) {
                    console.log('[ASAAS WEBHOOK 2.0] ✅ Auto-Cura funcional! Tenant encontrado pelo documento:', tenantByDoc.name);
                    // Criar registro de finance se não existir (Opcional, mas aqui vamos apenas vincular ao ID)
                    const { data: recentFinance } = await supabaseAdmin
                        .from('finance')
                        .select('*')
                        .eq('tenant_id', tenantByDoc.id)
                        .eq('is_paid', false)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (recentFinance) financeRecord = { ...recentFinance, tenants: tenantByDoc };
                }
            }
        }

        if (!financeRecord || !financeRecord.tenants) {
            console.error('[ASAAS WEBHOOK 2.0] ❌ Tenant não localizado para este pagamento.');
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const tenant = financeRecord.tenants;

        // 4. Ativar Plano e Atualizar Financeiro
        console.log(`[ASAAS WEBHOOK 2.0] 🚀 Ativando plano para: ${tenant.name}`);

        const metadata = financeRecord.metadata || {};
        const planSlug = metadata.plan || 'complete';
        const isAddon = !!metadata.addon;

        // Atualizar Tenant
        const updateData: any = {
            subscription_status: 'active',
            subscription_current_period_end: new Date(Date.now() + (metadata.interval || 1) * 31 * 24 * 60 * 60 * 1000).toISOString()
        };

        if (!isAddon) {
            updateData.plan = planSlug;
        }

        await Promise.all([
            // Atualizar Tenant
            supabaseAdmin.from('tenants').update(updateData).eq('id', tenant.id),
            // Marcar Financeiro como Pago
            supabaseAdmin.from('finance').update({
                is_paid: true,
                date_paid: new Date().toISOString(),
                metadata: { ...metadata, asaas_payment_id: payment.id, webhook_processed_at: new Date().toISOString() }
            }).eq('id', financeRecord.id),
            // Log de Auditoria
            supabaseAdmin.from('system_audit_logs').insert({
                action: 'asaas_webhook_processed',
                tenant_id: tenant.id,
                metadata: { webhook_event_id: body.id, payment_id: payment.id, event: event }
            })
        ]);

        console.log(`[ASAAS WEBHOOK 2.0] ✅ Processamento concluído com sucesso para ${tenant.name}`);
        return NextResponse.json({ success: true, processed: true });

    } catch (err: any) {
        console.error('[ASAAS WEBHOOK 2.0 ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
