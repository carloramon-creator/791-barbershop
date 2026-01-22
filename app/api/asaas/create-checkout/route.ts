import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import AsaasClient from '@/lib/asaas-client';

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

        const {
            plan: planSlug,
            addon: addonSlug,
            interval = 1,
            paymentMethod = 'CREDIT_CARD', // CREDIT_CARD ou BOLETO
            installments = 1,
            coupon
        } = await req.json();

        // 1. Configurar Asaas
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const asaasConfig = settingsData?.value;
        const apiKey = asaasConfig?.api_key || process.env.ASAAS_API_KEY;
        const environment = asaasConfig?.environment || 'sandbox';

        if (!apiKey) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Configuração do Asaas incompleta. Configure em Configurações API.'
            }, { status: 400 }));
        }

        const asaas = new AsaasClient({ apiKey, environment: environment as 'sandbox' | 'production' });

        // 2. Buscar Preço Dinâmico
        let baseAmount = 0;
        let itemName = '';
        let itemDescription = '';
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
            itemName = `791 Barber - ${addon.name}`;
            itemDescription = addon.description || `Módulo adicional: ${addon.name}`;
            isAddon = true;
        } else {
            const { data: planData } = await supabaseAdmin
                .from('system_plans')
                .select('*')
                .eq('slug', planSlug)
                .single();

            if (!planData) return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));

            baseAmount = Number(planData.price);
            // Evitar duplicidade "Plano Plano"
            const planDisplayName = planData.name.replace(/^Plano\s+/i, '');
            itemName = `791 Barber - Plano ${planDisplayName}`;

            if (interval === 6) {
                discountPercent = Number(planData.discount_semiannual || 10);
                itemDescription = `Assinatura semestral do Plano ${planDisplayName} com ${discountPercent}% de desconto`;
            } else if (interval === 12) {
                discountPercent = Number(planData.discount_annual || 20);
                itemDescription = `Assinatura anual do Plano ${planDisplayName} com ${discountPercent}% de desconto`;
            } else {
                itemDescription = `Assinatura mensal do Plano ${planDisplayName}`;
            }
        }

        // 2.3 Desconto Automático (10% na primeira assinatura/trial)
        let firstSubscriptionDiscount = 0;
        const isUnderTrial = tenant.plan === 'trial' ||
            !tenant.subscription_status ||
            ['trial', 'trialing', 'trial_expired'].includes(tenant.subscription_status);

        if (!isAddon && isUnderTrial) {
            firstSubscriptionDiscount = 10; // 10% de desconto automático
            console.log('[ASAAS] Aplicando desconto automático de 10% para trial/primeira assinatura');
        }

        // Calcular valor total e corrigir precisão
        let totalAmount = baseAmount * interval;

        // Aplicar maior desconto (intervalo ou trial)
        const effectiveDiscount = Math.max(discountPercent, firstSubscriptionDiscount);

        if (effectiveDiscount > 0) {
            totalAmount = totalAmount * (1 - (effectiveDiscount / 100));
            if (effectiveDiscount === firstSubscriptionDiscount && !isAddon) {
                itemDescription += ` (Com 10% de desconto de boas-vindas)`;
            }
        }

        // 2.5 Processar Cupom (SaaS Checkout)
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
                    discountFromCoupon = (totalAmount * Number(couponData.discount_percent)) / 100;
                } else if (couponData.discount_value) {
                    discountFromCoupon = Number(couponData.discount_value);
                }
            } else {
                return addCorsHeaders(req, NextResponse.json({ error: 'Cupom inválido ou expirado' }, { status: 400 }));
            }
        }

        totalAmount = Math.max(0, totalAmount - discountFromCoupon);
        totalAmount = Number(totalAmount.toFixed(2));

        // 3. Preparar dados do cliente e Validar Campos Obrigatórios (Checkout V3 exige endereço/tel)
        const cpfCnpj = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
        const phone = (tenant.phone || '').replace(/\D/g, '');
        const address = tenant.street || tenant.address_street || '';
        const number = tenant.number || '';
        const postalCode = (tenant.address_zip || tenant.cep || '').replace(/\D/g, '');
        const province = tenant.neighborhood || tenant.address_neighborhood || '';

        if (!phone || !address || !number || !postalCode || !province) {
            const missing = [];
            if (!phone) missing.push('Telefone');
            if (!address) missing.push('Rua');
            if (!number) missing.push('Número');
            if (!postalCode) missing.push('CEP');
            if (!province) missing.push('Bairro');

            return addCorsHeaders(req, NextResponse.json({
                error: `Dados incompletos: O Asaas exige endereço completo e telefone nas configurações da barbearia. Faltando: ${missing.join(', ')}`
            }, { status: 400 }));
        }

        const customerData = {
            name: tenant.name || 'Cliente',
            cpfCnpj: cpfCnpj,
            email: user.email || '',
            phone: phone,
            mobilePhone: phone,
            phoneNumber: phone, // Sugerido pelo erro do Asaas V3
            address: address,
            addressNumber: number,
            complement: tenant.complement || '',
            postalCode: postalCode,
            province: province,
        };

        console.log('[ASAAS] Payload customerData:', customerData);

        // 4. Lógica de Cobrança (Híbrida)
        let checkoutId = null;
        let checkoutUrl = '';
        let checkout: any = null;
        let customer: any = null;
        let subscriptionConfig: any = null;
        let installmentConfig: any = null;

        // Determinar baseUrl de forma robusta para evitar localhost em produção
        const referer = req.headers.get('referer');
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';

        if (referer && !referer.includes('localhost')) {
            try {
                baseUrl = new URL(referer).origin;
            } catch (e) {
                console.error('[ASAAS] Falha ao parsear referer para baseUrl:', e);
            }
        } else {
            // Fallback para headers de proxy
            const protocol = req.headers.get('x-forwarded-proto') || 'https';
            const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
            if (host && !host.includes('localhost')) {
                baseUrl = `${protocol}://${host}`;
            }
        }

        console.log(`[ASAAS] Base URL detectada: ${baseUrl}`);

        // Generate a unique reference for matching in Webhook
        const externalReference = crypto.randomUUID();

        // Check environment from Asaas config
        const isSandbox = environment === 'sandbox';

        console.log(`[ASAAS] Criando Checkout (${environment}):`, {
            method: paymentMethod,
            amount: totalAmount,
            externalReference,
            isSandbox
        });
        // Base URL for checkout session depends on environment
        const asaasCheckoutBaseUrl = isSandbox
            ? 'https://sandbox.asaas.com/checkoutSession/show'
            : 'https://www.asaas.com/checkoutSession/show';

        let boletoData = null;
        let pixData = null;

        if (paymentMethod === 'BOLETO') {
            // === Lógica para BOLETO (API Direta) ===

            // 4.1 Buscar ou criar cliente no Asaas
            customer = await asaas.getCustomerByEmail(customerData.email);
            if (!customer) {
                customer = await asaas.createCustomer(customerData);
            }

            let paymentIdToFetch = null;

            // 4.2 Criar Assinatura ou Cobrança
            if (interval === 1 && !isAddon) {
                // Assinatura Mensal via Boleto
                const subscriptionPayload = {
                    customer: customer.id,
                    billingType: 'BOLETO',
                    value: totalAmount,
                    nextDueDate: new Date().toISOString().split('T')[0], // Hoje
                    cycle: 'MONTHLY',
                    description: itemDescription,
                    externalReference: externalReference
                };

                const subscription = await asaas.createSubscription(subscriptionPayload);

                // Buscar primeira cobrança gerada pela assinatura
                await new Promise(resolve => setTimeout(resolve, 1500));
                const paymentsResponse = await asaas.getPaymentsBySubscription(subscription.id, 1);
                const firstPayment = paymentsResponse.data?.[0];

                if (firstPayment) {
                    paymentIdToFetch = firstPayment.id;
                    checkoutId = firstPayment.id;
                    checkoutUrl = firstPayment.bankSlipUrl || firstPayment.invoiceUrl;
                }
            } else {
                // Boleto Único (Semestral/Anual)
                const paymentPayload: any = {
                    customer: customer.id,
                    billingType: 'BOLETO',
                    value: totalAmount,
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +3 dias
                    description: itemDescription,
                    installmentCount: (installments > 1) ? installments : undefined,
                    installmentValue: (installments > 1) ? Number((totalAmount / installments).toFixed(2)) : undefined,
                    externalReference: externalReference
                };

                const payment = await asaas.createPayment(paymentPayload);
                paymentIdToFetch = payment.id;
                checkoutId = payment.id;
                checkoutUrl = payment.bankSlipUrl || payment.invoiceUrl;
            }

            // 4.3 Buscar Linha Digitável e Código de Barras
            if (paymentIdToFetch) {
                try {
                    // Buscar dados completos do pagamento para ter certeza da data de vencimento e valor final
                    const fullPayment = await asaas.getPayment(paymentIdToFetch);
                    // Buscar linha digitável
                    const barCodeData = await asaas.getBoletoBarCode(paymentIdToFetch);

                    boletoData = {
                        identificationField: barCodeData?.identificationField, // Linha digitável
                        barCode: barCodeData?.barCode,
                        value: fullPayment.value,
                        dueDate: fullPayment.dueDate,
                        bankSlipUrl: fullPayment.bankSlipUrl || fullPayment.invoiceUrl
                    };
                } catch (err) {
                    console.error('Erro ao buscar código de barras do boleto:', err);
                    // Não falha o request, apenas vai sem os dados extras
                }
            }

        } else if (paymentMethod === 'PIX') {
            // === Lógica para PIX (API Direta) ===

            // 4.1 Buscar ou criar cliente no Asaas
            customer = await asaas.getCustomerByEmail(customerData.email);
            if (!customer) {
                customer = await asaas.createCustomer(customerData);
            }

            let paymentIdToFetch = null;

            // 4.2 Criar Cobrança Pix
            const paymentPayload: any = {
                customer: customer.id,
                billingType: 'PIX',
                value: totalAmount,
                dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +1 dia
                description: itemDescription,
                observations: itemDescription, // Adicionado para dashboard Asaas
                externalReference: externalReference
            };

            const payment = await asaas.createPayment(paymentPayload);
            paymentIdToFetch = payment.id;
            checkoutId = payment.id;
            // Pix não tem checkoutUrl direto da mesma forma, mas pode ter invoiceUrl
            checkoutUrl = payment.invoiceUrl;

            // 4.3 Buscar QRCode Pix
            if (paymentIdToFetch) {
                try {
                    const pixQrCode = await asaas.getPixQrCode(paymentIdToFetch);
                    pixData = {
                        encodedImage: pixQrCode.encodedImage,
                        payload: pixQrCode.payload,
                        expirationDate: pixQrCode.expirationDate
                    };
                } catch (err) {
                    console.error('Erro ao buscar QRCode Pix:', err);
                }
            }

        } else {
            // === Lógica para CARTÃO (Checkout V3) ===

            // 4.1 Buscar ou criar cliente no Asaas (IMPORTANTE para ter um ID fixo)
            customer = await asaas.getCustomerByEmail(customerData.email);
            if (!customer) {
                customer = await asaas.createCustomer(customerData);
            }

            // Truncar nome para 30 chars (Limite rígido do Asaas para items[].name no Checkout V3)
            // IMPORTANTE: O Asaas usa o 'name' do item como título principal no e-mail de confirmação.
            const fullItemName = itemName; // Evitar concatenar descrição aqui para não estourar os 30 chars
            const safeItemName = fullItemName.length > 30 ? fullItemName.substring(0, 27) + '...' : fullItemName;

            let chargeTypes = ['DETACHED'];
            subscriptionConfig = undefined;
            installmentConfig = undefined;

            if (interval === 1 && !isAddon) {
                chargeTypes = ['RECURRENT'];
                const nextDueDate = new Date();
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                subscriptionConfig = {
                    cycle: 'MONTHLY',
                    nextDueDate: nextDueDate.toISOString().split('T')[0],
                    description: itemDescription
                };
            } else if (interval > 1 || installments > 1) {
                // Configuração de parcelas: Mensal (1x), Semestral (6x), Anual (10x)
                chargeTypes = ['DETACHED'];
                let maxInstallments = 1;

                if (interval === 6) maxInstallments = 6;
                else if (interval === 12) maxInstallments = 10;
                else if (installments > 1) maxInstallments = installments; // Fallback para Add-ons

                if (maxInstallments > 1) {
                    chargeTypes.push('INSTALLMENT');
                    installmentConfig = {
                        maxInstallmentCount: maxInstallments
                    };
                }
            }

            const checkoutPayload: any = {
                billingTypes: ['CREDIT_CARD'],
                chargeTypes: chargeTypes,
                description: itemDescription,
                observations: itemDescription, // Observations aparece em mais lugares no dashboard
                externalReference: externalReference,
                minutesToExpire: 60, // Expira em 1 hora se não pago
                callback: {
                    successUrl: `${baseUrl}/asaas/checkout/success`,
                    cancelUrl: `${baseUrl}/asaas/checkout/cancel`,
                    expiredUrl: `${baseUrl}/asaas/checkout/expired`
                },
                items: [{
                    name: safeItemName, // O Asaas usa esse nome nos e-mails (Max 30 chars)
                    description: itemDescription,
                    quantity: 1,
                    value: totalAmount
                }],
                customer: customer.id,
                subscription: subscriptionConfig,
                installment: installmentConfig
            };

            checkout = await asaas.createCheckout(checkoutPayload);
            checkoutId = checkout.id;
            checkoutUrl = `${asaasCheckoutBaseUrl}?id=${checkout.id}`;
        }

        // 5. Salvar registro
        if (checkoutId) {
            await supabaseAdmin
                .from('finance')
                .insert({
                    tenant_id: tenant.id,
                    type: 'expense',
                    value: totalAmount,
                    description: `Assinatura SaaS - ${itemName} (${interval} ${interval === 1 ? 'mês' : 'meses'})`,
                    date: new Date().toISOString().split('T')[0],
                    is_paid: false,
                    metadata: {
                        is_saas_payment: true,
                        asaas_checkout_id: checkoutId,
                        asaas_customer_id: customer.id || (checkout as any).customer || (checkout as any).customerId || null,
                        asaas_subscription_id: subscriptionConfig ? (checkout as any).subscriptionId || (checkout as any).subscription || null : null,
                        external_reference: externalReference,
                        payment_method: paymentMethod,
                        [isAddon ? 'addon' : 'plan']: addonSlug || planSlug,
                        is_addon: isAddon,
                        interval: interval
                    }
                });
        }

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            checkoutId: checkoutId,
            checkoutUrl: checkoutUrl,
            boletoData: boletoData,
            pixData: pixData,
            amount: totalAmount
        }));

    } catch (error: any) {
        console.error('[ASAAS CREATE CHECKOUT ERROR]', error);

        let errorMessage = 'Erro ao processar pagamento';
        if (error.response?.data) {
            const data = error.response.data;
            if (data.errors && data.errors.length > 0) {
                errorMessage = data.errors[0].description;
            } else {
                errorMessage = JSON.stringify(data);
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        return addCorsHeaders(req, NextResponse.json({
            error: errorMessage
        }, { status: error.response?.status || 500 }));
    }
}
