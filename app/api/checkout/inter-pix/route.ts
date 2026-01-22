import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { InterAPIV3 } from '@/lib/inter-api-v3';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        const { plan: planSlug, addon: addonSlug, coupon, tempId, interval = 1 } = await req.json();

        // 1. Buscar Preço Dinâmico e Descontos
        let baseAmount = 0;
        let itemName = '';
        let isAddon = false;
        let discountPercent = 0;

        if (addonSlug) {
            const { data: addon } = await supabaseAdmin
                .from('system_addons')
                .select('*')
                .eq('slug', addonSlug)
                .single();

            if (!addon) return addCorsHeaders(req, NextResponse.json({ error: 'Add-on inválido' }, { status: 400 }));

            baseAmount = Number(addon.price);
            itemName = addon.name;
            isAddon = true;
        } else {
            const { data: planData } = await supabaseAdmin
                .from('system_plans')
                .select('*')
                .eq('slug', planSlug)
                .single();

            if (!planData) return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));

            baseAmount = Number(planData.price);
            itemName = planData.name;

            // Definir desconto baseado no intervalo
            if (interval === 6) {
                discountPercent = Number(planData.discount_semiannual || 10);
            } else if (interval === 12) {
                discountPercent = Number(planData.discount_annual || 20);
            }
        }

        // Calcular valor total baseado no período
        let totalAmount = baseAmount * interval;
        if (discountPercent > 0) {
            totalAmount = totalAmount * (1 - (discountPercent / 100));
        }

        // --- LÓGICA DE PRO-RATA (INTER) ---
        // Se for um Add-on MENSAL sendo adicionado a um plano existente no meio do mês
        let finalAmount = totalAmount;
        if (interval === 1 && isAddon && tenant.plan && tenant.plan !== 'trial') {
            const now = new Date();
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const remainingDays = lastDayOfMonth - now.getDate() + 1;

            // Pro-rata: (Preço / Dias no Mês) * Dias Restantes
            finalAmount = (baseAmount / lastDayOfMonth) * remainingDays;
            if (finalAmount < 1) finalAmount = 1; // Mínimo R$ 1,00 para evitar erros bancários
        }

        // 2. Processar Cupom
        let discountFromCoupon = 0;
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
                    discountFromCoupon = (finalAmount * Number(couponData.discount_percent)) / 100;
                } else if (couponData.discount_value) {
                    discountFromCoupon = Number(couponData.discount_value);
                }
            } else {
                return addCorsHeaders(req,
                    NextResponse.json({ error: 'Cupom inválido ou expirado' }, { status: 400 })
                );
            }
        }


        // Aplicar desconto final
        finalAmount = Math.max(0, finalAmount - discountFromCoupon);
        const amount = finalAmount;
        const currentDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + 24); // Pix expira em 24h
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // 2. Garantir documento CPF/CNPJ
        let doc = (tenant.cnpj || tenant.cpf || tenant.document || tenant.bank_account_doc || "").replace(/\D/g, '');

        if (!doc) {
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('cpf')
                .eq('id', user.id)
                .single();

            if (userData && userData.cpf) {
                doc = userData.cpf.replace(/\D/g, '');
            }
        }

        if (!doc || doc.length < 11) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Para gerar Pix, é necessário cadastrar um CPF ou CNPJ válido nas configurações da sua barbearia ou no seu perfil de usuário.'
            }, { status: 400 }));
        }

        // 3. Integrar com Inter (V3) - Buscar do DB primeiro
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

        const payload = {
            seuNumero: tempId || String(Date.now()).slice(-15),
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
                linha1: `791 Barber - ${itemName}`.substring(0, 80),
                linha2: `${interval} meses${couponApplied ? ' - Cupom ' + couponApplied : ''}`.substring(0, 80)
            }
        };

        const interResRaw = await inter.createBilling(payload);
        let interRes = interResRaw;
        let codigoSolicitacao = interRes.codigoSolicitacao;
        let pixCopiaECola = interRes.pixCopiaECola || interRes.pix?.pixCopiaECola;
        const seuNumero = payload.seuNumero;

        console.log('[SAAS PIX] Resposta inicial:', { codigoSolicitacao, hasPix: !!pixCopiaECola });

        // Se for assíncrono ou vier sem o pixCopiaECola, iniciamos busca
        let isReady = !!pixCopiaECola;

        if (!isReady && codigoSolicitacao) {
            console.log(`[SAAS PIX] Cobrança assíncrona. Iniciando busca (Ticket: ${codigoSolicitacao})...`);
            const maxRetries = 5;
            const delays = [3000, 3000, 4000, 5000, 5000];

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                console.log(`[SAAS PIX] Tentativa ${attempt + 1}/${maxRetries} - Aguardando ${delays[attempt]}ms...`);
                await new Promise(r => setTimeout(r, delays[attempt]));

                try {
                    let found: any = null;

                    // Estratégia A: Consulta por Solicitação
                    try {
                        const solRes = await inter.getBillingBySolicitacao(codigoSolicitacao);
                        const possiblePix = solRes.pix;
                        if (possiblePix?.pixCopiaECola) {
                            found = { ...solRes.cobranca, pixCopiaECola: possiblePix.pixCopiaECola };
                        }
                    } catch (e: any) {
                        console.log('[SAAS PIX] Estratégia A falhou, pulando para B.');
                    }

                    // Estratégia B: Busca na Lista (+/- 1 dia)
                    if (!found) {
                        const now = new Date();
                        const dInit = new Date(now); dInit.setDate(dInit.getDate() - 1);
                        const dEnd = new Date(now); dEnd.setDate(dEnd.getDate() + 1);

                        const listRes = await inter.listBillings(
                            dInit.toISOString().split('T')[0],
                            dEnd.toISOString().split('T')[0]
                        );
                        const items = listRes.cobrancas || listRes.content || [];
                        found = items.find((it: any) => it.seuNumero === seuNumero);
                    }

                    if (found && (found.pixCopiaECola || found.pix?.pixCopiaECola)) {
                        interRes = found;
                        pixCopiaECola = found.pixCopiaECola || found.pix?.pixCopiaECola;
                        isReady = true;
                        console.log('[SAAS PIX] ✅ Pix localizado!');
                        break;
                    }
                } catch (e: any) {
                    console.error(`[SAAS PIX] Erro tentativa ${attempt + 1}:`, e.message);
                }
            }
        }

        // 5. Salvar registro local
        const { error: insertError } = await supabaseAdmin
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: amount,
                description: `SaaS - ${itemName}`,
                date: currentDate,
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    txid: codigoSolicitacao || 'N/A',
                    seu_numero: seuNumero,
                    method: 'pix_inter',
                    pix_payload: pixCopiaECola,
                    expires_at: dueDate.toISOString(),
                    [isAddon ? 'addon' : 'plan']: addonSlug || planSlug,
                    is_addon: isAddon,
                    interval: interval
                }
            });

        if (insertError) {
            console.error('[PIX DB ERROR] Erro ao salvar fatura:', insertError);
        }

        if (isReady) {
            // Usa codigoSolicitacao para PDF (sempre disponível)
            const pdfUrl = codigoSolicitacao
                ? `/api/checkout/inter-boleto/pdf?codigoSolicitacao=${codigoSolicitacao}`
                : null;

            return addCorsHeaders(req, NextResponse.json({
                success: true,
                pixPayload: pixCopiaECola,
                amount: amount,
                expiresAt: dueDate.toISOString(),
                pdfUrl: pdfUrl
            }));
        }

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            pending: true,
            message: 'O Pix está sendo processado pelo banco.',
            seu_numero: seuNumero,
            amount: amount
        }));

    } catch (error: any) {
        console.error('[SAAS PIX CHECKOUT ERROR]', error);
        let userMessage = 'Erro inesperado ao processar pagamento';
        if (error.message) {
            if (error.message.includes('CNPJ') || error.message.includes('CPF')) {
                userMessage = 'CPF/CNPJ inválido. Verifique os dados cadastrados.';
            } else if (error.message.includes('timeout')) {
                userMessage = 'Tempo esgotado ao conectar com o banco. Tente novamente.';
            } else if (error.message.includes('certificado') || error.message.includes('certificate')) {
                userMessage = 'Erro de autenticação com o banco. Contate o suporte.';
            } else if (typeof error.message === 'string' && error.message.includes('{')) {
                try {
                    const parsed = JSON.parse(error.message);
                    userMessage = parsed.title || parsed.detail || userMessage;
                } catch (e) { }
            } else {
                userMessage = error.message;
            }
        }

        return addCorsHeaders(req, NextResponse.json({
            error: userMessage,
            details: error.message
        }, { status: 500 }));
    }
}
