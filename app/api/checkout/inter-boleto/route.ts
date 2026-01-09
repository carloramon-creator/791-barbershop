import { NextResponse } from 'next/server';
// Trigger Build: 11:10 BRT - GOL FINAL ⚽
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

const PLAN_PRICES: Record<string, number> = {
    basic: 49.00,
    complete: 99.00,
    premium: 169.00
};

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        const { plan, coupon, tempId } = await req.json();
        let amount = PLAN_PRICES[plan];

        if (!amount) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));
        }

        // 1. Processar Cupom
        let discount = 0;
        let couponApplied = null;

        if (coupon && coupon.trim() !== '') {
            const code = String(coupon).trim().toUpperCase();
            const { data: couponData } = await supabaseAdmin
                .from('system_coupons')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (couponData) {
                couponApplied = code;
                if (couponData.discount_percent) {
                    discount = (amount * Number(couponData.discount_percent)) / 100;
                } else if (couponData.discount_value) {
                    discount = Number(couponData.discount_value);
                }
            }
        }

        amount = Math.max(0, amount - discount);
        const currentDate = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // 2. Configurar Inter - Buscar do DB primeiro
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const dbConfig = settingsData?.value;

        const clientId = dbConfig?.client_id || process.env.INTER_CLIENT_ID;
        const clientSecret = dbConfig?.client_secret || process.env.INTER_CLIENT_SECRET || '';
        const certRaw = dbConfig?.crt || process.env.INTER_CERT_CONTENT || '';
        const keyRaw = dbConfig?.key || process.env.INTER_KEY_CONTENT || '';

        const cert = certRaw.replace(/\\n/g, '\n');
        const key = keyRaw.replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Configuração do Inter incompleta. Cadastre em Configurações API.' }, { status: 400 }));
        }

        const inter = new InterAPIV3({
            clientId,
            clientSecret,
            cert,
            key
        });

        let doc = (tenant.cnpj || tenant.cpf || tenant.document || tenant.bank_account_doc || "").replace(/\D/g, '');

        if (!doc) {
            const { data: userData } = await supabaseAdmin.from('users').select('cpf').eq('id', user.id).single();
            if (userData?.cpf) doc = userData.cpf.replace(/\D/g, '');
        }

        if (!doc || doc.length < 11) {
            return addCorsHeaders(req, NextResponse.json({ error: 'CPF/CNPJ necessário para emitir boleto.' }, { status: 400 }));
        }

        const seuNumero = tempId || String(Date.now()).slice(-15);
        const payload = {
            seuNumero,
            pagador: {
                cpfCnpj: doc,
                tipoPessoa: doc.length > 11 ? "JURIDICA" : "FISICA",
                nome: tenant.name.substring(0, 100),
                cep: (tenant.address_zip?.replace(/\D/g, '') || tenant.cep?.replace(/\D/g, '') || "88000000").substring(0, 8),
                numero: (tenant.number || "SN").substring(0, 10),
                endereco: (tenant.street || tenant.address_street || "Endereço não informado").substring(0, 90),
                bairro: (tenant.neighborhood || tenant.address_neighborhood || "Centro").substring(0, 60),
                cidade: (tenant.city || tenant.address_city || "Cidade").substring(0, 60),
                uf: (tenant.state || tenant.address_state || "SC").substring(0, 2)
            },
            dataVencimento: dueDateStr,
            valorNominal: amount.toFixed(2),
            dataEmissao: currentDate,
            mensagem: {
                linha1: `Assinatura 791 Barber - Plano ${plan}`.substring(0, 80)
            }
        };

        console.log('[INTER] Criando boleto...');
        let interRes = await inter.createBilling(payload);

        // Log campos individuais para evitar truncamento
        console.log('[INTER] === RESPOSTA DO INTER ===');
        console.log('[INTER] Keys disponíveis:', Object.keys(interRes));
        console.log('[INTER] nossoNumero:', interRes.nossoNumero);
        console.log('[INTER] identificador:', interRes.identificador);
        console.log('[INTER] codigoCobranca:', interRes.codigoCobranca);
        console.log('[INTER] linhaDigitavel:', interRes.linhaDigitavel);
        console.log('[INTER] codigoBarras:', interRes.codigoBarras);
        console.log('[INTER] pixCopiaECola:', interRes.pixCopiaECola);
        console.log('[INTER] codigoSolicitacao:', interRes.codigoSolicitacao);
        console.log('[INTER] ========================');

        // A API V3 retorna campos com nomes variados. Vamos buscar TODAS as possibilidades.
        // Baseado na documentação e no app do Inter, os campos podem ser:

        let nossoNumero = interRes.nossoNumero ||
            interRes.identificador ||
            interRes.codigoCobranca ||
            interRes.nossoNumero ||
            interRes.NossoNumero ||
            interRes.Identificador;

        let linhaDigitavel = interRes.linhaDigitavel ||
            interRes.LinhaDigitavel ||
            interRes.linha_digitavel;

        let codigoBarras = interRes.codigoBarras ||
            interRes.CodigoBarras ||
            interRes.codigo_barras;

        let pixCopiaECola = interRes.pixCopiaECola ||
            interRes.PixCopiaECola ||
            interRes.pix?.pixCopiaECola ||
            interRes.pix?.PixCopiaECola;

        const codigoSolicitacao = interRes.codigoSolicitacao ||
            interRes.CodigoSolicitacao;

        console.log('[INTER] Campos extraídos:', {
            nossoNumero,
            linhaDigitavel,
            codigoBarras,
            pixCopiaECola,
            codigoSolicitacao,
            rawKeys: Object.keys(interRes)
        });

        // Se temos nossoNumero E linhaDigitavel, a cobrança está pronta
        let isReady = !!(nossoNumero && linhaDigitavel);

        // Se não está pronto mas temos codigoSolicitacao, vamos buscar com retry
        if (!isReady && codigoSolicitacao) {
            console.log('[INTER] Cobrança assíncrona. Iniciando busca com retry...');

            const maxRetries = 5; // Aumentado para 5 tentativas
            const delays = [3000, 3000, 4000, 5000, 5000]; // Delays maiores (3s, 3s, 4s, 5s, 5s)

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                console.log(`[INTER] Tentativa ${attempt + 1}/${maxRetries} - Aguardando ${delays[attempt]}ms...`);
                await new Promise(r => setTimeout(r, delays[attempt]));

                try {
                    const token = await inter.getAccessToken();
                    const now = new Date();
                    const dInit = new Date(now); dInit.setDate(dInit.getDate() - 2); // Janela maior
                    const dEnd = new Date(now); dEnd.setDate(dEnd.getDate() + 1);

                    const path = `/cobranca/v3/cobrancas?seuNumero=${seuNumero}&dataInicial=${dInit.toISOString().split('T')[0]}&dataFinal=${dEnd.toISOString().split('T')[0]}`;
                    const searchRes = await inter.makeRequest({
                        hostname: 'cdpj.partners.bancointer.com.br',
                        port: 443, path, method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` },
                        cert, key, rejectUnauthorized: false, family: 4
                    });

                    console.log('[INTER] Resposta busca - Keys:', Object.keys(searchRes));
                    const items = searchRes.cobrancas || searchRes.content || [];
                    console.log('[INTER] Cobranças encontradas:', items.length);

                    if (items.length > 0) {
                        const found = items[0];
                        console.log('[INTER] Cobrança encontrada! Keys:', Object.keys(found));
                        interRes = found;
                        nossoNumero = found.nossoNumero || found.identificador || found.codigoCobranca;
                        linhaDigitavel = found.linhaDigitavel || found.LinhaDigitavel;
                        codigoBarras = found.codigoBarras || found.CodigoBarras;
                        pixCopiaECola = found.pixCopiaECola || found.pix?.pixCopiaECola;

                        console.log('[INTER] Dados extraídos:', { nossoNumero, linhaDigitavel, codigoBarras });

                        if (nossoNumero && (linhaDigitavel || pixCopiaECola)) {
                            isReady = true;
                            console.log('[INTER] ✅ Cobrança pronta!');
                            break;
                        }
                    }
                } catch (e: any) {
                    console.error(`[INTER] Erro tentativa ${attempt + 1}:`, e.message);
                }
            }
        }

        // 4. Salvar registro local
        await supabaseAdmin
            .from('finance')
            .insert({
                tenant_id: null,
                type: 'revenue',
                value: amount,
                description: `SaaS - Plano ${plan} (${tenant.name})`,
                date: currentDate,
                is_paid: false,
                metadata: {
                    nosso_numero: nossoNumero || 'PENDING',
                    txid: codigoSolicitacao || 'N/A',
                    seu_numero: seuNumero,
                    tenant_id: tenant.id,
                    codigo_barras: codigoBarras,
                    linha_digitavel: linhaDigitavel,
                    method: 'boleto_inter'
                }
            });

        if (isReady) {
            return addCorsHeaders(req, NextResponse.json({
                success: true,
                nossoNumero: nossoNumero,
                codigoBarras: codigoBarras,
                linhaDigitavel: linhaDigitavel,
                pixCopiaECola: pixCopiaECola,
                pdfUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/checkout/inter-boleto/pdf?nossoNumero=${nossoNumero}`
            }));
        }

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            pending: true,
            message: 'Boleto em processamento no banco.',
            seu_numero: seuNumero,
            amount: amount
        }));

    } catch (error: any) {
        console.error('[CHECKOUT ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 }));
    }
}
