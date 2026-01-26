import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';
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

        const { plan: planSlug, addon: addonSlug, addons: addonsSlugs = [], coupon, tempId, interval = 1 } = await req.json();

        // Consolidar addonsSlugs se houver addonSlug singular (compatibilidade)
        let finalAddonsSlugs = [...addonsSlugs];
        if (addonSlug && !finalAddonsSlugs.includes(addonSlug)) {
            finalAddonsSlugs.push(addonSlug);
        }

        // 1. Calcular Valores Consolidados (Harmonizado com Asaas)
        let totalPlanAmount = 0;
        let totalAddonAmount = 0;
        let itemNames: string[] = [];
        let discountPercent = 0;

        // 1.1 Processar Plano
        if (planSlug) {
            const { data: planData } = await getSupabaseAdmin().from('system_plans').select('*').eq('slug', planSlug).single();
            if (!planData) throw new Error('Plano inválido');

            let planBase = Number(planData.price);
            if (interval === 6) {
                discountPercent = Number(planData.discount_semiannual || 10);
            } else if (interval === 12) {
                discountPercent = Number(planData.discount_annual || 20);
            }

            if (discountPercent > 0) planBase = planBase * (1 - (discountPercent / 100));
            totalPlanAmount = Number((planBase * interval).toFixed(2));
            itemNames.push(planData.name);
        }

        // 1.2 Processar Add-ons (Array)
        for (const slug of finalAddonsSlugs) {
            const { data: addon } = await getSupabaseAdmin().from('system_addons').select('*').eq('slug', slug).single();
            if (!addon) continue;

            const addonAmount = Number((Number(addon.price) * interval).toFixed(2));
            totalAddonAmount += addonAmount;
            itemNames.push(addon.name);
        }

        let totalAmount = Number((totalPlanAmount + totalAddonAmount).toFixed(2));
        const itemNameLabel = itemNames.join(' + ');
        const isAddonOnly = !planSlug && finalAddonsSlugs.length > 0;

        // --- LÓGICA DE PRO-RATA (INTER) ---
        // Se for um Add-on MENSAL sendo adicionado a um plano existente no meio do mês
        let finalAmount = totalAmount;
        if (interval === 1 && isAddonOnly && tenant.plan && tenant.plan !== 'trial') {
            const now = new Date();
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const remainingDays = lastDayOfMonth - now.getDate() + 1;

            // Pro-rata: (Preço / Dias no Mês) * Dias Restantes
            // Se for addon-only, o totalAmount já é o valor dos addons.
            finalAmount = (totalAmount / lastDayOfMonth) * remainingDays;
            if (finalAmount < 1) finalAmount = 1; // Mínimo R$ 1,00 para evitar erros bancários
        }

        // 2. Processar Cupom
        let discountFromCoupon = 0;
        let couponApplied = null;

        if (coupon && coupon.trim() !== '') {
            const code = String(coupon).trim().toUpperCase();
            const { data: couponData } = await getSupabaseAdmin()
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

        // 3. Desconto de Boas-Vindas (10% para novos cadastros até 5 dias)
        if (discountFromCoupon === 0 && interval === 1 && !isAddonOnly) {
            const isTrial = tenant.plan === 'trial' || tenant.subscription_status === 'trialing' || !tenant.stripe_subscription_id;
            const tenantCreated = new Date(tenant.created_at || new Date());
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - tenantCreated.getTime()) / (1000 * 60 * 60 * 24));
            const isNewAccount = diffDays <= 5;

            if (isTrial && isNewAccount) {
                discountFromCoupon = (finalAmount * 10) / 100; // 10%
                couponApplied = 'BOAS_VINDAS_10';
                console.log(`[INTER PIX] Desconto de Boas-Vindas aplicado: -R$ ${(discountFromCoupon || 0).toFixed(2)} (conta criada há ${diffDays} dias)`);
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
            const { data: userData } = await getSupabaseAdmin()
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
        const { data: settingsData } = await getSupabaseAdmin()
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
            valorNominal: (amount || 0).toFixed(2),
            dataEmissao: currentDate,
            mensagem: {
                linha1: `791 Barber - ${itemNameLabel}`.substring(0, 80),
                linha2: `${interval} meses${couponApplied ? ' - Cupom ' + couponApplied : ''}`.substring(0, 80)
            }
        };

        const interResRaw = await inter.createBilling(payload);
        let interRes = interResRaw;
        let codigoSolicitacao = interRes.codigoSolicitacao;
        let pixCopiaECola = interRes.pixCopiaECola || interRes.pix?.pixCopiaECola;
        const seuNumero = payload.seuNumero;

        console.log('[SAAS PIX] Resposta inicial:', { codigoSolicitacao, hasPix: !!pixCopiaECola });

        // IMPORTANTE: Não fazemos polling aqui para evitar timeout em serverless
        // O webhook do Inter vai notificar quando o PIX estiver pronto
        const isReady = !!pixCopiaECola;

        // 5. Salvar registro local
        const { error: insertError } = await getSupabaseAdmin()
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: amount,
                description: `SaaS - ${itemNameLabel}`,
                date: currentDate,
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    txid: codigoSolicitacao || 'N/A',
                    seu_numero: seuNumero,
                    method: 'pix_inter',
                    pix_payload: pixCopiaECola,
                    expires_at: dueDate.toISOString(),
                    [isAddonOnly ? 'addons' : 'plan']: isAddonOnly ? finalAddonsSlugs : planSlug,
                    is_addon: isAddonOnly,
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

        // Retorna pending - o webhook vai processar quando estiver pronto
        return addCorsHeaders(req, NextResponse.json({
            success: true,
            pending: true,
            message: 'PIX está sendo gerado pelo banco. Você receberá uma notificação quando estiver pronto.',
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
