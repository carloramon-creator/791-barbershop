import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

export async function POST(req: Request) {
    const body = await req.json();
    const event = body.event;

    // O Asaas pode enviar payment, checkout, ou dados no nível raiz
    const payment = body.payment || body.checkout || body;

    console.log(`[ASAAS WEBHOOK 2.0] Evento recebido: ${event} | ID: ${body.id}`);

    // 1. Idempotência: Evitar processar o mesmo evento duas vezes (OPCIONAL - não bloqueia se tabela não existir)
    try {
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
    } catch (auditError) {
        console.log('[ASAAS WEBHOOK 2.0] Audit logs não disponíveis, continuando sem idempotência...');
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
        const extRef = payment?.externalReference || body.externalReference || body.checkout?.externalReference || payment?.id || body.id;
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

        // Estratégia C: Pelo Customer ID (quando payload é minimalista)
        if (!financeRecord && (payment?.customer || body.customer)) {
            const customerId = payment?.customer || body.customer;
            console.log('[ASAAS WEBHOOK 2.0] 🔍 Tentando buscar por Customer ID (payload minimalista):', customerId);

            // Buscar informações do cliente no Asaas
            const { data: settings } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'asaas_config').single();
            const asaas = new AsaasClient({ apiKey: settings?.value?.api_key || process.env.ASAAS_API_KEY as string });

            try {
                const asaasCustomer = await asaas.getCustomer(customerId);
                const cpfCnpj = asaasCustomer.cpfCnpj;

                if (cpfCnpj) {
                    // Buscar tenant pelo CPF/CNPJ
                    const { data: tenantByDoc } = await supabaseAdmin
                        .from('tenants')
                        .select('id, name')
                        .or(`cnpj.eq.${cpfCnpj},cpf.eq.${cpfCnpj},document.eq.${cpfCnpj}`)
                        .maybeSingle();

                    if (tenantByDoc) {
                        console.log('[ASAAS WEBHOOK 2.0] ✅ Tenant encontrado pelo documento:', tenantByDoc.name);

                        // Buscar a ÚLTIMA fatura pendente deste tenant
                        const { data: recentFinance } = await supabaseAdmin
                            .from('finance')
                            .select('*')
                            .eq('tenant_id', tenantByDoc.id)
                            .eq('is_paid', false)
                            .eq('metadata->>is_saas_payment', 'true')
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (recentFinance) {
                            console.log('[ASAAS WEBHOOK 2.0] ✅ Fatura pendente encontrada:', recentFinance.id);
                            financeRecord = { ...recentFinance, tenants: tenantByDoc };
                        }
                    }
                }
            } catch (err) {
                console.log('[ASAAS WEBHOOK 2.0] Erro ao buscar customer no Asaas:', err);
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
        } else {
            // Se for add-on, adicionar ao array active_addons
            const currentAddons = tenant.active_addons || [];
            const addonSlug = metadata.addon;
            if (addonSlug && !currentAddons.includes(addonSlug)) {
                updateData.active_addons = [...currentAddons, addonSlug];
                console.log(`[ASAAS WEBHOOK 2.0] 📦 Adicionando add-on: ${addonSlug}`);
            }
        }

        // Atualizar Tenant e Finance (CRÍTICO)
        await Promise.all([
            supabaseAdmin.from('tenants').update(updateData).eq('id', tenant.id),
            supabaseAdmin.from('finance').update({
                is_paid: true,
                date: new Date().toISOString().split('T')[0],
                metadata: { ...metadata, asaas_payment_id: payment.id, webhook_processed_at: new Date().toISOString() }
            }).eq('id', financeRecord.id)
        ]);

        // Log de Auditoria (OPCIONAL - não bloqueia se falhar)
        try {
            await supabaseAdmin.from('system_audit_logs').insert({
                action: 'asaas_webhook_processed',
                tenant_id: tenant.id,
                metadata: { webhook_event_id: body.id, payment_id: payment.id, event: event }
            });
        } catch (auditError) {
            console.log('[ASAAS WEBHOOK 2.0] Falha ao gravar audit log (não crítico):', auditError);
        }

        console.log(`[ASAAS WEBHOOK 2.0] ✅ Processamento concluído com sucesso para ${tenant.name}`);
        return NextResponse.json({ success: true, processed: true });

    } catch (err: any) {
        console.error('[ASAAS WEBHOOK 2.0 ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
