
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + 10);
        const dateStr = targetDate.toISOString().split('T')[0];

        const results = {
            processed: 0,
            generated: 0,
            errors: [] as string[]
        };

        // 1. Buscar tenants vencendo daqui a 10 dias
        const { data: tenants } = await getSupabaseAdmin()
            .from('tenants')
            .select('*, users(id, name, email, fcm_token)') // Join manual talvez precise ser feito separado
            .gte('subscription_current_period_end', `${dateStr}T00:00:00`)
            .lte('subscription_current_period_end', `${dateStr}T23:59:59`)
            .eq('subscription_status', 'active');

        if (!tenants || tenants.length === 0) {
            return NextResponse.json({ success: true, message: 'Nenhuma assinatura vencendo em 10 dias.', results });
        }

        // 2. Setup Inter API (Global Config)
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;
        if (!dbConfig) {
            return NextResponse.json({ error: 'Inter API não configurada' }, { status: 500 });
        }

        const inter = new InterAPIV3({
            clientId: dbConfig.client_id,
            clientSecret: dbConfig.client_secret,
            cert: (dbConfig.crt || '').replace(/\\n/g, '\n'),
            key: (dbConfig.key || '').replace(/\\n/g, '\n'),
            accountNumber: dbConfig.account_number
        });

        // 3. Processar cada tenant
        for (const tenant of tenants) {
            try {
                results.processed++;
                console.log(`[AUTO-BILLING] Processando tenant ${tenant.name} (${tenant.id})`);

                // Verifica se já existe cobrança gerada para esta data
                const { data: existing } = await getSupabaseAdmin()
                    .from('finance')
                    .select('id')
                    .eq('tenant_id', tenant.id)
                    .eq('type', 'expense')
                    .eq('metadata->>is_saas_payment', 'true')
                    .eq('metadata->>auto_generated', 'true')
                    .gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00`)
                    .maybeSingle();

                if (existing) {
                    console.log(`[AUTO-BILLING] Cobrança já gerada hoje para ${tenant.name}. Pulando.`);
                    continue;
                }

                // Determinar valor e plano
                const planSlug = tenant.plan || 'basic';
                const { data: planData } = await getSupabaseAdmin().from('system_plans').select('*').eq('slug', planSlug).single();
                if (!planData) continue;

                // TODO: Adicionar lógica de Add-ons se tiver salvo no tenant
                const amount = Number(planData.price);

                // Dados do pagador
                let doc = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
                // Fallback owner info
                const owner = (tenant.users || []).find((u: any) => u.role === 'owner' || u.is_barber); // Simplificado
                if (!doc && owner) {
                    const { data: u } = await getSupabaseAdmin().from('users').select('cpf').eq('id', owner.id).single();
                    doc = u?.cpf?.replace(/\D/g, '') || '';
                }

                if (!doc || doc.length < 11) {
                    results.errors.push(`${tenant.name}: CPF/CNPJ incompleto`);
                    continue;
                }

                // Gerar Boleto via Inter
                const dueDate = new Date(tenant.subscription_current_period_end!);
                // O vencimento é o dia da expiração (daqui a 10 dias)

                const seuNumero = String(Date.now()).slice(-15);
                const payload = {
                    seuNumero,
                    pagador: {
                        cpfCnpj: doc,
                        tipoPessoa: doc.length > 11 ? "JURIDICA" : "FISICA",
                        nome: tenant.name.substring(0, 100),
                        cep: (tenant.address_zip || '88000000').replace(/\D/g, '').substring(0, 8),
                        numero: 'SN',
                        endereco: 'Endereço registrado',
                        bairro: 'Centro',
                        cidade: 'Cidade',
                        uf: 'SC'
                    },
                    dataVencimento: dueDate.toISOString().split('T')[0],
                    valorNominal: amount.toFixed(2),
                    dataEmissao: new Date().toISOString().split('T')[0],
                    mensagem: {
                        linha1: `Renovação de Assinatura - 791 Barber`,
                        linha2: `Plano ${planData.name}`
                    }
                };

                const interRes = await inter.createBilling(payload);

                // Extrair dados (mesma logica do checkout)
                const nossoNumero = interRes.nossoNumero || interRes.identificador || interRes.codigoCobranca;
                const linhaDigitavel = interRes.linhaDigitavel || interRes.linha_digitavel;
                const pdfUrl = interRes.codigoSolicitacao
                    ? `/api/checkout/inter-boleto/pdf?codigoSolicitacao=${interRes.codigoSolicitacao}`
                    : null;

                if (nossoNumero) {
                    // Salvar no Finance
                    await getSupabaseAdmin().from('finance').insert({
                        tenant_id: tenant.id,
                        type: 'expense',
                        value: amount,
                        description: `Renovação Automática - Plano ${planData.name}`,
                        date: new Date().toISOString().split('T')[0],
                        is_paid: false,
                        metadata: {
                            is_saas_payment: true,
                            auto_generated: true,
                            nosso_numero: nossoNumero,
                            linha_digitavel: linhaDigitavel,
                            method: 'boleto_inter',
                            plan: planSlug
                        }
                    });

                    results.generated++;

                    // Notificar Owner
                    // Tentar buscar owner corretamente
                    const { data: owners } = await getSupabaseAdmin()
                        .from('users')
                        .select('fcm_token, email')
                        .eq('tenant_id', tenant.id)
                        .eq('role', 'owner');

                    if (owners) {
                        for (const o of owners) {
                            if (o.fcm_token) {
                                await sendPush(o.fcm_token, {
                                    title: 'Boleto de Renovação Disponível',
                                    body: `Seu boleto de renovação no valor de R$ ${amount.toFixed(2)} já está disponível. Vence em 10 dias.`
                                });
                            }
                            // TODO: Enviar Email com Link do PDF
                        }
                    }
                } else {
                    results.errors.push(`${tenant.name}: Falha ao gerar boleto Inter (sem nossoNumero)`);
                }

            } catch (err: any) {
                console.error(`Err tenant ${tenant.id}:`, err);
                results.errors.push(`${tenant.id}: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[AUTO BILLING ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendPush(token: string, payload: { title: string, body: string }) {
    if (!firebaseAdmin.apps.length) return;
    try {
        await firebaseAdmin.messaging().send({
            token,
            notification: { title: payload.title, body: payload.body },
            android: { priority: 'high' }
        });
    } catch (e) { console.error(e); }
}
