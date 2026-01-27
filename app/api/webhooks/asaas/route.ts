import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

export async function POST(req: Request) {
    const body = await req.json();
    const event = body.event;

    // O Asaas pode enviar payment, checkout, ou dados no nível raiz
    const payment = body.payment || body.checkout || body;

    console.log(`[ASAAS WEBHOOK 2.0] Evento recebido: ${event} | ID: ${body.id}`);

    // 1. Idempotência: Evitar processar o mesmo evento duas vezes (OPCIONAL - não bloqueia se tabela não existir)
    try {
        const { data: existingEvent } = await getSupabaseAdmin()
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

        // Função auxiliar para sleep
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Estratégia A: Pelo externalReference (Mais confiável)
        const extRef = payment?.externalReference || body.externalReference || body.checkout?.externalReference || payment?.external_reference || body.external_reference;

        if (extRef) {
            console.log('[ASAAS WEBHOOK 2.0] 🔍 Buscando por externalReference:', extRef);
            const { data } = await getSupabaseAdmin()
                .from('finance')
                .select('*, tenants(*)')
                .eq('metadata->>external_reference', extRef)
                .maybeSingle();
            financeRecord = data;

            // Se não encontrar, aguardar 2 segundos (Atraso de rede/reatividade)
            if (!financeRecord) {
                console.log('[ASAAS WEBHOOK 2.0] ⏳ Registro não encontrado por ExternalRef. Aguardando 2s...');
                await sleep(2000);
                const { data: retryData } = await getSupabaseAdmin()
                    .from('finance')
                    .select('*, tenants(*)')
                    .eq('metadata->>external_reference', extRef)
                    .maybeSingle();
                financeRecord = retryData;
            }
        }

        // Estratégia B: Pelo Checkout ID ou Subscription ID
        if (!financeRecord) {
            const searchId = payment.checkoutId || payment.checkout_id || payment.checkoutSession || payment.checkout_session || payment.subscription || payment.subscription_id || body.subscriptionId || body.checkoutId;
            if (searchId) {
                console.log('[ASAAS WEBHOOK 2.0] 🔍 Buscando por Checkout/Subscription ID:', searchId);
                const { data } = await getSupabaseAdmin()
                    .from('finance')
                    .select('*, tenants(*)')
                    .or(`metadata->>asaas_checkout_id.eq."${searchId}",metadata->>asaas_subscription_id.eq."${searchId}",metadata->>asaas_payment_id.eq."${searchId}"`)
                    .maybeSingle();
                financeRecord = data;
            }
        }

        // Estratégia B2: Pelo valor e proximidade temporal (para pagamentos sem ID vinculado)
        if (!financeRecord && payment?.value) {
            console.log('[ASAAS WEBHOOK 2.0] 🔍 Buscando por valor e proximidade temporal:', payment.value);
            const { data } = await getSupabaseAdmin()
                .from('finance')
                .select('*, tenants(*)')
                .eq('value', payment.value)
                .eq('is_paid', false)
                .eq('metadata->>is_saas_payment', 'true')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            financeRecord = data;
        }

        // Estratégia C: Pelo Customer ID -> Documento do Tenant (Último recurso)
        if (!financeRecord && (payment?.customer || body.customer)) {
            const customerId = payment?.customer || body.customer;
            console.log('[ASAAS WEBHOOK 2.0] 🔍 Tentando buscar por Customer ID:', customerId);

            const { data: settings } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'asaas_config').single();
            const asaas = new AsaasClient({
                apiKey: settings?.value?.api_key || process.env.ASAAS_API_KEY as string,
                environment: (settings?.value?.environment || 'sandbox') as 'sandbox' | 'production'
            });

            try {
                const asaasCustomer = await asaas.getCustomer(customerId);
                const cpfCnpj = (asaasCustomer.cpfCnpj || '').replace(/\D/g, '');

                if (cpfCnpj) {
                    // Buscar tenant pelo CPF/CNPJ (Pode haver múltiplos, pegamos o que teve atividade recente)
                    const { data: tenants } = await getSupabaseAdmin()
                        .from('tenants')
                        .select('id, name')
                        .or(`cnpj.ilike.%${cpfCnpj}%,cpf.ilike.%${cpfCnpj}%,document.ilike.%${cpfCnpj}%`)
                        .order('created_at', { ascending: false });

                    if (tenants && tenants.length > 0) {
                        for (const t of tenants) {
                            const { data: recentFinance } = await getSupabaseAdmin()
                                .from('finance')
                                .select('*')
                                .eq('tenant_id', t.id)
                                .eq('is_paid', false)
                                .eq('metadata->>is_saas_payment', 'true')
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                            if (recentFinance) {
                                financeRecord = { ...recentFinance, tenants: t };
                                break;
                            }
                        }
                    }
                }
            } catch (err) { }
        }

        if (!financeRecord || !financeRecord.tenants) {
            console.error('[ASAAS WEBHOOK 2.0] ❌ Tenant não localizado.');
            return NextResponse.json({
                error: 'Tenant not found',
                debug: {
                    event,
                    extRef,
                    paymentId: payment?.id,
                    checkoutId: payment?.checkoutId || payment?.checkout_id,
                    customerId: payment?.customer || body.customer
                }
            }, { status: 404 });
        }

        const tenant = financeRecord.tenants;

        // 4. Ativar Plano e Atualizar Financeiro
        console.log(`[ASAAS WEBHOOK 2.0] 🚀 Ativando plano para: ${tenant.name} | Status atual: ${tenant.subscription_status}`);

        const metadata = financeRecord.metadata || {};
        const planSlug = metadata.plan;
        const addonsSlugs = metadata.addons || (metadata.addon ? [metadata.addon] : []);

        // Atualizar Tenant
        const updateData: any = {
            subscription_status: 'active',
            subscription_current_period_end: new Date(Date.now() + (metadata.interval || 1) * 31 * 24 * 60 * 60 * 1000).toISOString()
        };

        // 4.1 Ativar Plano (se houver)
        if (planSlug) {
            console.log(`[ASAAS WEBHOOK 2.0] 🚀 Ativando plano: ${planSlug}`);
            updateData.plan = planSlug;
        }

        // 4.2 Ativar Add-ons (se houver)
        if (addonsSlugs.length > 0) {
            console.log(`[ASAAS WEBHOOK 2.0] 📦 Processando ativação de ${addonsSlugs.length} add-ons: ${addonsSlugs.join(', ')}`);

            for (const addonSlug of addonsSlugs) {
                try {
                    // Buscar ID do Add-on pelo slug
                    const { data: addonData } = await getSupabaseAdmin()
                        .from('system_addons')
                        .select('id')
                        .eq('slug', addonSlug)
                        .single();

                    if (addonData) {
                        // Upsert na tabela tenant_addons
                        const { error: addonError } = await getSupabaseAdmin()
                            .from('tenant_addons')
                            .upsert({
                                tenant_id: tenant.id,
                                addon_id: addonData.id,
                                status: 'active',
                                activated_at: new Date().toISOString()
                            }, { onConflict: 'tenant_id,addon_id' });

                        if (addonError) {
                            console.error(`[ASAAS WEBHOOK 2.0] ❌ Erro ao ativar add-on ${addonSlug}:`, addonError);
                        } else {
                            console.log(`[ASAAS WEBHOOK 2.0] ✅ Add-on ${addonSlug} ativado com sucesso.`);
                        }
                    }
                } catch (err) {
                    console.error(`[ASAAS WEBHOOK 2.0] ❌ Falha ao processar add-on ${addonSlug}:`, err);
                }
            }
        }

        // Salvar subscription_id se for assinatura
        if (payment.subscription) {
            updateData.asaas_subscription_id = typeof payment.subscription === 'object'
                ? (payment.subscription as any).id
                : payment.subscription;
            console.log(`[ASAAS WEBHOOK 2.0] 💳 Salvando subscription_id: ${updateData.asaas_subscription_id}`);
        }

        // Atualizar Tenant e Finance (CRÍTICO)
        console.log(`[ASAAS WEBHOOK 2.0] 💾 Salvando alterações no DB para Tenant ID: ${tenant.id}`);
        const [tenantRes, financeRes] = await Promise.all([
            getSupabaseAdmin().from('tenants').update(updateData).eq('id', tenant.id),
            getSupabaseAdmin().from('finance').update({
                is_paid: true,
                date: new Date().toISOString().split('T')[0],
                metadata: { ...metadata, asaas_payment_id: payment.id, webhook_processed_at: new Date().toISOString() }
            }).eq('id', financeRecord.id)
        ]);

        if (tenantRes.error) console.error('[ASAAS WEBHOOK 2.0] ❌ Erro ao atualizar tenant:', tenantRes.error);
        if (financeRes.error) console.error('[ASAAS WEBHOOK 2.0] ❌ Erro ao atualizar finance:', financeRes.error);

        // 4.3 RAMON FIX: Criar Assinatura Recorrente se for o primeiro pagamento mensal via Checkout
        if (metadata.recurring_setup && payment.billingType === 'CREDIT_CARD') {
            try {
                // Calcular data do primeiro vencimento recorrente (daqui a 30 dias)
                const nextDueDate = new Date();
                nextDueDate.setDate(nextDueDate.getDate() + 30);
                const dueDateString = nextDueDate.toISOString().split('T')[0];

                console.log(`[ASAAS WEBHOOK 2.0] 🔄 Criando assinatura oficial para o futuro: ${tenant.name}`);

                const { data: subSettings } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'asaas_config').single();
                const asaasSub = new AsaasClient({
                    apiKey: subSettings?.value?.api_key || process.env.ASAAS_API_KEY as string,
                    environment: (subSettings?.value?.environment || 'sandbox') as 'sandbox' | 'production'
                });

                const baseDescription = (financeRecord.description || '').replace(' (Bônus Boas-vindas 10%)', '');

                // Criar assinatura oficial
                await asaasSub.createSubscription({
                    customer: payment.customer,
                    billingType: 'CREDIT_CARD',
                    value: metadata.original_value, // Valor cheio acumulado
                    nextDueDate: dueDateString,
                    cycle: 'MONTHLY',
                    description: `Assinatura: ${baseDescription}`,
                    externalReference: `${metadata.external_reference}_sub`,
                    // Usar o token do cartão que acabou de pagar
                    creditCardToken: payment.creditCard?.token || payment.creditCardToken
                });

                console.log(`[ASAAS WEBHOOK 2.0] ✅ Assinatura recorrente criada com sucesso para ${baseDescription}.`);
            } catch (subError: any) {
                console.error('[ASAAS WEBHOOK 2.0] ❌ Falha ao criar assinatura pós-pagamento:', subError.message);
            }
        }

        // Log de Auditoria (OPCIONAL - não bloqueia se falhar)
        try {
            await getSupabaseAdmin().from('system_audit_logs').insert({
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
