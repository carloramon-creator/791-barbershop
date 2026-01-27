import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';

export async function OPTIONS(req: NextRequest) {
    const response = NextResponse.json({}, { status: 200 });
    return addCorsHeaders(req as any, response);
}

export async function POST(req: NextRequest) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant() as any;
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        const body = await req.json();
        const { plan: planSlug, addon: addonSlug, addons: addonsSlugs = [], coupon, tempId, interval = 1 } = body;

        // BLOQUEIO CRÍTICO: Pix Automático apenas para planos mensais
        if (interval > 1) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Pix Automático disponível apenas para planos mensais. Para planos semestrais ou anuais, utilize Pix Imediato ou Cartão.'
            }, { status: 400 }));
        }

        // Consolidar addonsSlugs se houver addonSlug singular (compatibilidade)
        let finalAddonsSlugs = [...addonsSlugs];
        if (addonSlug && !finalAddonsSlugs.includes(addonSlug)) {
            finalAddonsSlugs.push(addonSlug);
        }

        // 1. Calcular Valores (Sincronizado com inter-pix)
        let totalPlanAmount = 0;
        let totalAddonAmount = 0;
        let itemNames: string[] = [];

        // 1.1 Processar Plano
        if (planSlug) {
            const { data: planData } = await getSupabaseAdmin().from('system_plans').select('*').eq('slug', planSlug).single();
            if (!planData) throw new Error('Plano inválido');
            totalPlanAmount = Number(planData.price);
            itemNames.push(planData.name);
        }

        // 1.2 Processar Add-ons
        for (const slug of finalAddonsSlugs) {
            const { data: addon } = await getSupabaseAdmin().from('system_addons').select('*').eq('slug', slug).single();
            if (!addon) continue;
            totalAddonAmount += Number(addon.price);
            itemNames.push(addon.name);
        }

        const fullMonthlyValue = Number((totalPlanAmount + totalAddonAmount).toFixed(2));
        const itemNameLabel = itemNames.join(' + ');
        const isAddonOnly = !planSlug && finalAddonsSlugs.length > 0;

        // 2. Desconto de Boas-Vindas (10% sobre o 1º Mês)
        let firstPaymentAmount = fullMonthlyValue;
        let couponApplied = null;

        const isTrial = !tenant.stripe_subscription_id || ['trial', 'trial_expired'].includes(tenant.plan || '');
        const tenantCreated = new Date(tenant.created_at || new Date());
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now.getTime() - tenantCreated.getTime()) / (1000 * 60 * 60 * 24));
        const isNewAccount = diffDays <= 6;

        if (isTrial && isNewAccount && !isAddonOnly) {
            firstPaymentAmount = Number((fullMonthlyValue * 0.9).toFixed(2));
            couponApplied = 'BOAS_VINDAS_10';
            console.log(`[INTER PIX AUTO] Aplicando Bônus 10% na adesão: R$ ${firstPaymentAmount}`);
        }

        // 3. Integrar com Inter (V3)
        const { data: settingsData } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'inter_config').single();
        const dbConfig = settingsData?.value;

        const cert = (dbConfig?.crt || process.env.INTER_CERT_CONTENT || '').replace(/\\n/g, '\n');
        const key = (dbConfig?.key || process.env.INTER_KEY_CONTENT || '').replace(/\\n/g, '\n');
        const pixKey = dbConfig?.pix_key;

        if (!pixKey || !cert || !key) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Configuração do Inter incompleta (Chave Pix ou Certificados).' }, { status: 400 }));
        }

        const inter = new InterAPIV3({
            clientId: dbConfig?.client_id || process.env.INTER_CLIENT_ID || '',
            clientSecret: dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '',
            cert,
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
        });

        // 4. Garantir documento CPF/CNPJ
        let doc = (tenant.cnpj || tenant.cpf || tenant.document || "").replace(/\D/g, '');
        if (!doc) {
            const { data: userData } = await getSupabaseAdmin().from('users').select('cpf').eq('id', user.id).single();
            if (userData?.cpf) doc = userData.cpf.replace(/\D/g, '');
        }
        if (!doc || doc.length < 11) {
            return addCorsHeaders(req, NextResponse.json({ error: 'CPF/CNPJ necessário para Pix Automático.' }, { status: 400 }));
        }

        console.log(`[INTER PIX AUTO] Iniciando Jornada 3 (Adesão + Recorrência) para ${tenant.name}`);

        // --- PASSO 1: Criar Location (Recurrency) ---
        const loc = await inter.createLocation('rec');
        const locId = loc.id;

        // --- PASSO 2: Criar Cobrança Imediata (Adesão) ---
        const txid = tempId || `REC${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase();
        const immediatePayload = {
            calendario: { expiracao: 86400 },
            devedor: {
                cpf: doc.length === 11 ? doc : undefined,
                cnpj: doc.length > 11 ? doc : undefined,
                nome: tenant.name.substring(0, 140)
            },
            valor: { original: firstPaymentAmount.toFixed(2) },
            chave: pixKey,
            solicitacaoPagador: `Assinatura Mensal Recorrente - ${itemNameLabel}`.substring(0, 140),
            txid,
            loc: { id: locId }
        };

        await inter.createPixImmediateBilling(immediatePayload);

        // --- PASSO 3: Criar Recorrência (Jornada 3) ---
        // Valor da recorrência é o valor mensal CHEIO (sem o bônus de 10%)
        const recurrencePayload = {
            vinculo: {
                objeto: `Assinatura: ${itemNameLabel}`.substring(0, 50),
                devedor: {
                    cpf: doc.length === 11 ? doc : undefined,
                    cnpj: doc.length > 11 ? doc : undefined,
                    nome: tenant.name.substring(0, 140)
                },
                contrato: `CTR-${tenant.id.slice(0, 8)}`
            },
            calendario: {
                dataInicial: new Date().toISOString().split('T')[0],
                periodicidade: 'MENSAL'
            },
            valor: {
                valorRec: fullMonthlyValue.toFixed(2) // SEMPRE VALOR CHEIO NA RECORRÊNCIA
            },
            politicaRetentativa: 'PERMITE_3R_7D',
            loc: { id: locId },
            cob: { txid: txid }
        };

        const agreement = await inter.createRecurrenceAgreement(recurrencePayload);
        const idRec = agreement.idRec || agreement.identificador;
        let pixCopiaECola = agreement.pixCopiaECola;

        // --- PASSO 4: Consultar se necessário ---
        if (!pixCopiaECola && idRec) {
            try {
                const details = await inter.getRecurrenceAgreement(idRec, txid);
                pixCopiaECola = details.pixCopiaECola || details.rec?.pixCopiaECola;
            } catch (err) { }
        }

        // 5. Salvar registro local
        await getSupabaseAdmin().from('finance').insert({
            tenant_id: tenant.id,
            type: 'expense',
            value: firstPaymentAmount,
            description: `Pix Automático (Adesão): ${itemNameLabel}${couponApplied ? ' (Bônus 10%)' : ''}`,
            date: new Date().toISOString().split('T')[0],
            is_paid: false,
            metadata: {
                is_saas_payment: true,
                method: 'pix_automatico_j3',
                id_rec: idRec,
                txid_imediato: txid,
                seu_numero: txid, // FUNDAMENTAL PARA O POLLING ENCONTRAR
                plan: planSlug,
                addons: finalAddonsSlugs,
                interval: 1,
                coupon: couponApplied,
                recurrence_value: fullMonthlyValue,
                pix_payload: pixCopiaECola
            }
        });

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            idRec: idRec,
            pixPayload: pixCopiaECola,
            txid: txid,
            seu_numero: txid, // Fallback para polling
            amount: firstPaymentAmount,
            status: pixCopiaECola ? 'AGUARDANDO_PAGAMENTO' : 'PROCESSANDO',
            pending: !pixCopiaECola,
            message: !pixCopiaECola ? 'Aguardando geração do QRCode Pix...' : undefined
        }));

    } catch (error: any) {
        console.error('[INTER PIX AUTO ERROR]', error);
        const msg = error.body?.title || error.body?.detail || error.message || 'Erro ao processar Pix Automático';
        return addCorsHeaders(req, NextResponse.json({ error: msg, details: error.body }, { status: 500 }));
    }
}
