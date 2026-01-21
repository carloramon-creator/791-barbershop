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
            installments = 1
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
            itemName = `791 Barber - Plano ${planData.name}`;

            if (interval === 6) {
                discountPercent = Number(planData.discount_semiannual || 10);
                itemDescription = `Assinatura semestral do plano ${planData.name} com ${discountPercent}% de desconto`;
            } else if (interval === 12) {
                discountPercent = Number(planData.discount_annual || 20);
                itemDescription = `Assinatura anual do plano ${planData.name} com ${discountPercent}% de desconto`;
            } else {
                itemDescription = `Assinatura mensal do plano ${planData.name}`;
            }
        }

        // Calcular valor total e corrigir precisão
        let totalAmount = baseAmount * interval;
        if (discountPercent > 0) {
            totalAmount = totalAmount * (1 - (discountPercent / 100));
        }
        totalAmount = Number(totalAmount.toFixed(2));

        // 3. Preparar dados do cliente
        const cpfCnpj = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
        if (!cpfCnpj || cpfCnpj.length < 11) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'CPF/CNPJ necessário. Configure nas informações da barbearia.'
            }, { status: 400 }));
        }

        const customerData = {
            name: tenant.name || 'Cliente',
            cpfCnpj: cpfCnpj,
            email: user.email || '',
            phone: tenant.phone?.replace(/\D/g, '') || undefined,
            mobilePhone: tenant.phone?.replace(/\D/g, '') || undefined,
            address: tenant.street || tenant.address_street || undefined,
            addressNumber: tenant.number || undefined,
            complement: tenant.complement || undefined,
            postalCode: (tenant.address_zip || tenant.cep || '').replace(/\D/g, '') || undefined,
            province: tenant.neighborhood || tenant.address_neighborhood || undefined,
        };

        // 4. Lógica de Cobrança (Híbrida)
        let checkoutId = null;
        let checkoutUrl = '';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';

        if (paymentMethod === 'BOLETO') {
            // === Lógica para BOLETO (API Direta) ===

            // 4.1 Buscar ou criar cliente no Asaas
            let customer = await asaas.getCustomerByEmail(customerData.email);
            if (!customer) {
                customer = await asaas.createCustomer(customerData);
            }

            // 4.2 Criar Assinatura ou Cobrança
            if (interval === 1 && !isAddon) {
                // Assinatura Mensal via Boleto
                const subscriptionPayload = {
                    customer: customer.id,
                    billingType: 'BOLETO',
                    value: totalAmount,
                    nextDueDate: new Date().toISOString().split('T')[0], // Hoje
                    cycle: 'MONTHLY',
                    description: itemDescription
                };

                const subscription = await asaas.createSubscription(subscriptionPayload);

                // Buscar primeira cobrança gerada pela assinatura para pegar o boleto
                // Asaas gera a cobrança assincronamente, damos um pequeno delay e buscamos
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Buscar pagamentos desta assinatura usando método público
                const paymentsResponse = await asaas.getPaymentsBySubscription(subscription.id, 1);

                // getPaymentsBySubscription retorna o corpo da resposta, que contém { data, ... }
                const firstPayment = paymentsResponse.data?.[0];

                if (firstPayment) {
                    checkoutId = firstPayment.id;
                    // Preferir PDF do boleto (bankSlipUrl) se disponível, senão invoiceUrl
                    checkoutUrl = firstPayment.bankSlipUrl || firstPayment.invoiceUrl;
                } else {
                    // Fallback seguro (redireciona para lista se não achar pagamento)
                    checkoutUrl = `${baseUrl}/configuracoes/financeiro`;
                }

            } else {
                // Boleto Único (Semestral/Anual)
                const paymentPayload: any = {
                    customer: customer.id,
                    billingType: 'BOLETO',
                    value: totalAmount,
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +3 dias
                    description: itemDescription,
                    installmentCount: interval > 1 ? interval : undefined,
                    installmentValue: interval > 1 ? Number((totalAmount / interval).toFixed(2)) : undefined
                };

                const payment = await asaas.createPayment(paymentPayload);
                checkoutId = payment.id;
                // Preferir PDF do boleto
                checkoutUrl = payment.bankSlipUrl || payment.invoiceUrl;
            }

        } else {
            // === Lógica para CARTÃO (Checkout V3) ===

            // Truncar nome para 30 chars
            const safeItemName = itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName;

            let chargeTypes = ['DETACHED'];
            let subscriptionConfig = undefined;
            let installmentConfig = undefined;

            if (interval === 1 && !isAddon) {
                chargeTypes = ['RECURRENT'];
                const nextDueDate = new Date();
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                subscriptionConfig = {
                    cycle: 'MONTHLY',
                    nextDueDate: nextDueDate.toISOString().split('T')[0]
                };
            } else if (interval > 1) {
                chargeTypes = ['DETACHED', 'INSTALLMENT'];
                installmentConfig = {
                    maxInstallmentCount: Math.min(installments, interval)
                };
            }

            const checkoutPayload: any = {
                billingTypes: ['CREDIT_CARD'],
                chargeTypes: chargeTypes,
                minutesToExpire: 30,
                callback: {
                    successUrl: `${baseUrl}/asaas/checkout/success`,
                    cancelUrl: `${baseUrl}/asaas/checkout/cancel`,
                    expiredUrl: `${baseUrl}/asaas/checkout/expired`
                },
                items: [{
                    name: safeItemName,
                    description: itemDescription,
                    quantity: 1,
                    value: totalAmount // Now fixed to 2 decimals
                }],
                customerData: customerData,
                subscription: subscriptionConfig,
                installment: installmentConfig
            };

            const checkout = await asaas.createCheckout(checkoutPayload);
            checkoutId = checkout.id;
            checkoutUrl = `https://asaas.com/checkoutSession/show?id=${checkout.id}`;
        }

        // 5. Salvar registro
        if (checkoutId) {
            await supabaseAdmin
                .from('finance')
                .insert({
                    tenant_id: tenant.id,
                    type: 'expense',
                    value: totalAmount,
                    description: `SaaS - ${itemName}`,
                    date: new Date().toISOString().split('T')[0],
                    is_paid: false,
                    metadata: {
                        is_saas_payment: true,
                        asaas_checkout_id: checkoutId,
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
