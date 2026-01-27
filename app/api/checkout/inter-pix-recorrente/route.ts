import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

// Helper to add CORS headers
function addCorsHeaders(req: NextRequest, res: NextResponse) {
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
}

export async function OPTIONS(req: NextRequest) {
    return addCorsHeaders(req, NextResponse.json({}, { status: 200 }));
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Auth header missing' }, { status: 401 }));
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
        if (authError || !user) {
            console.error('[INTER PIX AUTO] Auth error:', authError);
            return addCorsHeaders(req, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        }

        const body = await req.json();
        const { plan, addons, interval, tempId } = body;
        const planSlug = plan || 'basic';
        const addonsSlugs = addons || [];

        // 1. Fetch Tenant & Configs
        const { data: tenant, error: tErr } = await getSupabaseAdmin()
            .from('tenants')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (tErr || !tenant) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Tenant non-existent' }, { status: 404 }));
        }

        const { data: dbConfig } = await getSupabaseAdmin()
            .from('payment_gateways')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('gateway_name', 'inter')
            .single();

        const cert = dbConfig?.cert_content;
        const key = dbConfig?.key_content;

        if (!cert || !key) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Inter certificates not configured' }, { status: 400 }));
        }

        // 2. Load Plan Data to calculate values
        const { data: planData } = await getSupabaseAdmin()
            .from('plans')
            .select('*')
            .eq('slug', planSlug)
            .single();

        if (!planData) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Invalid plan' }, { status: 400 }));
        }

        let totalAmount = Number(planData.price);
        const { data: addonsData } = await getSupabaseAdmin()
            .from('addons')
            .select('*')
            .in('slug', addonsSlugs);

        if (addonsData) {
            addonsData.forEach(a => totalAmount += Number(a.price));
        }

        // Apply Boas Vindas Discount (10%) for first subscription
        const isTrialOrUnpaid = (!['active', 'active_paid', 'paid'].includes(tenant.subscription_status || '') || ['trial', 'trialing'].includes(tenant.subscription_status || ''));
        const isFirstSub = !tenant.asaas_subscription_id || isTrialOrUnpaid;

        let amount = totalAmount;
        let couponApplied = null;
        if (isFirstSub) {
            amount = totalAmount * 0.9;
            couponApplied = 'BOAS_VINDAS_10';
        }

        const itemNameLabel = `${planData.name} + ${addonsSlugs.length} módulos`;

        // --- INTER API V3 ---
        const inter = new InterAPIV3({
            clientId: dbConfig?.client_id || '',
            clientSecret: dbConfig?.client_secret || '',
            cert,
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
        });

        // 3. Garantir documento
        let doc = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
        if (!doc) {
            const { data: userData } = await getSupabaseAdmin().from('users').select('cpf').eq('id', user.id).single();
            if (userData?.cpf) doc = userData.cpf.replace(/\D/g, '');
        }
        if (!doc) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Perfil incompleto: CPF/CNPJ necessário.' }, { status: 400 }));
        }

        const pixKey = dbConfig?.pix_key;
        const accountNumber = dbConfig?.account_number || dbConfig?.accountNumber;

        console.log(`[INTER PIX AUTO] Configs: Key=${pixKey}, Account=${accountNumber}`);

        if (!pixKey) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Chave Pix não configurada no sistema.' }, { status: 400 }));
        }

        console.log(`[INTER PIX AUTO] Iniciando Jornada 3 para ${tenant.name}`);

        // --- PASSO 1: Criar Location (Recurrency) ---
        const loc = await inter.createLocation('rec');
        const locId = loc.id;
        console.log(`[INTER PIX AUTO] Location criada: ${locId}`);

        // --- PASSO 2: Criar Cobrança Imediata (Primeira Parcela com Desconto) ---
        const txid = tempId || new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 6);

        // Vencimento da imediata: agora + 24h
        const immediateDueDate = new Date();
        immediateDueDate.setSeconds(immediateDueDate.getSeconds() + 3600 * 24);

        const immediatePayload = {
            calendario: {
                expiracao: 86400 // 24h
            },
            devedor: {
                cpf: doc.length === 11 ? doc : undefined,
                cnpj: doc.length > 11 ? doc : undefined,
                nome: tenant.name.substring(0, 200)
            },
            valor: {
                original: amount.toFixed(2)
            },
            chave: pixKey,
            solicitacaoPagador: `1a Mês - ${itemNameLabel}`.substring(0, 140),
            txid,
            loc: {
                id: locId
            }
        };

        const cobImediata = await inter.createPixImmediateBilling(immediatePayload);
        console.log(`[INTER PIX AUTO] Passo 2: Cobrança Imediata OK. TxId: ${txid}`, JSON.stringify(cobImediata, null, 2));

        // --- PASSO 3: Criar Recorrência (Jornada 3) ---
        let recurrenceValue = totalAmount;
        if (couponApplied === 'BOAS_VINDAS_10') {
            recurrenceValue = totalAmount;
        } else {
            recurrenceValue = amount;
        }

        const recurrencePayload = {
            vinculo: {
                objeto: `Assinatura ${planData.name}`,
                devedor: {
                    cpf: doc.length === 11 ? doc : undefined,
                    cnpj: doc.length > 11 ? doc : undefined,
                    nome: tenant.name.substring(0, 100)
                },
                contrato: `CTR-${tenant.id.slice(0, 8)}`
            },
            calendario: {
                dataInicial: new Date().toISOString().split('T')[0],
                periodicidade: 'MENSAL'
            },
            valor: {
                valorRec: recurrenceValue.toFixed(2)
            },
            politicaRetentativa: 'PERMITE_3R_7D',
            loc: {
                id: locId
            },
            cob: {
                txid: txid
            }
        };

        console.log(`[INTER PIX AUTO] Passo 3: Criando Recorrência com locId=${locId} e txid=${txid}...`);
        const agreement = await inter.createRecurrenceAgreement(recurrencePayload);
        const idRec = agreement.idRec || agreement.identificador;
        console.log(`[INTER PIX AUTO] Recorrência criada: ${idRec}`);

        // --- PASSO 4: Consultar Recorrência para pegar QRCode ---
        let pixCopiaECola = agreement.pixCopiaECola || (agreement as any).pixCopiaECola;

        if (!pixCopiaECola && idRec) {
            console.log(`[INTER PIX AUTO] Buscando detalhes da recorrência ${idRec} com txid ${txid} para obter QR Code J3...`);
            try {
                const details = await inter.getRecurrenceAgreement(idRec, txid);
                console.log('[INTER PIX AUTO] Detalhes (Passo 4) recebidos:', JSON.stringify(details, null, 2));

                pixCopiaECola = details.pixCopiaECola || details.rec?.pixCopiaECola || details.cobranca?.pixCopiaECola;
                console.log(`[INTER PIX AUTO] QR Code J3 extraído: ${pixCopiaECola ? 'SUCESSO' : 'FALHA'}`);
            } catch (err: any) {
                console.error('[INTER PIX AUTO] Erro ao buscar QR Code J3 via GET:', err.message, err.body);
            }
        }

        if (!pixCopiaECola) {
            console.warn('[INTER PIX AUTO] Alerta: Não foi possível obter o pixCopiaECola. Verifique se a Jornada 3 foi ativada corretamente na conta.');
        }

        // 4. Salvar no Banco
        await getSupabaseAdmin()
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: amount,
                description: `Pix Automático (Adesão) - ${itemNameLabel}`,
                date: new Date().toISOString().split('T')[0],
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    method: 'pix_automatico_j3',
                    id_rec: idRec,
                    txid_imediato: txid,
                    plan: planSlug,
                    addons: addonsSlugs,
                    interval: 1,
                    coupon: couponApplied,
                    recurrence_value: recurrenceValue,
                    pix_payload: pixCopiaECola
                }
            });

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            idRec: idRec,
            pixPayload: pixCopiaECola,
            txid: txid,
            amount: amount,
            status: 'AGUARDANDO_PAGAMENTO'
        }));

    } catch (error: any) {
        console.error('[INTER PIX AUTO ERROR]', error);
        if (error.body) console.error('[INTER PIX AUTO DETALHES]', error.body);
        return addCorsHeaders(req, NextResponse.json({ error: error.message || 'Erro ao criar recorrência.', details: error.body }, { status: 500 }));
    }
}
