import { NextResponse } from 'next/server';
// Trigger Build: 11:41 BRT - PDF FIX 📄
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
            key,
            accountNumber: dbConfig?.account_number || dbConfig?.accountNumber
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
        let isReady = !!(nossoNumero && (linhaDigitavel || pixCopiaECola));

        // 4. Salvar registro local
        const { error: insertError } = await supabaseAdmin
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'revenue',
                value: amount,
                description: `SaaS - Plano ${plan}`,
                date: currentDate,
                is_paid: false,
                metadata: {
                    nosso_numero: nossoNumero || 'PENDING',
                    txid: codigoSolicitacao || 'N/A',
                    seu_numero: seuNumero,
                    codigo_barras: codigoBarras,
                    linha_digitavel: linhaDigitavel,
                    method: 'boleto_inter'
                }
            });

        if (insertError) {
            console.error('[INTER DB ERROR] Erro ao salvar fatura:', insertError);
        }

        // Retornamos imediatamente. O frontend usará o check-pending-payment para atualizar.
        // IMPORTANTE: Usar codigoSolicitacao para PDF (sempre disponível), não nossoNumero (pode vir depois)
        const pdfUrl = codigoSolicitacao
            ? `/api/checkout/inter-boleto/pdf?codigoSolicitacao=${codigoSolicitacao}&nossoNumero=${nossoNumero || ''}`
            : (nossoNumero ? `/api/checkout/inter-boleto/pdf?nossoNumero=${nossoNumero}` : null);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            pending: !isReady,
            nossoNumero: nossoNumero,
            codigoBarras: codigoBarras,
            linhaDigitavel: linhaDigitavel,
            pixCopiaECola: pixCopiaECola,
            amount: amount,
            pdfUrl: pdfUrl
        }));

    } catch (error: any) {
        console.error('[CHECKOUT ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 }));
    }
}
