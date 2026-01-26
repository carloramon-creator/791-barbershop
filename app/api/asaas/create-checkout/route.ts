import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';
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

        const body = await req.json();
        const {
            plan: planSlug,
            addon: addonSlug, // Legado: manter por compatibilidade se enviado sozinho
            addons: addonsSlugs = [], // Novo: array de slugs
            coupon,
            interval = 1,
            paymentMethod = 'CREDIT_CARD',
            installments = 1
        } = body;

        // Consolidar addonsSlugs se houver addonSlug singular
        let finalAddonsSlugs = [...addonsSlugs];
        if (addonSlug && !finalAddonsSlugs.includes(addonSlug)) {
            finalAddonsSlugs.push(addonSlug);
        }

        // 1. Obter Configurações Asaas
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const asaasConfig = settingsData?.value;
        const apiKey = asaasConfig?.api_key || process.env.ASAAS_API_KEY;
        const environment = (asaasConfig?.environment || 'sandbox') as 'sandbox' | 'production';

        if (!apiKey) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Configuração Asaas incompleta' }, { status: 400 }));
        }

        const asaas = new AsaasClient({ apiKey, environment });

        // 2. Definir Itens e Calcular Valores
        let totalPlanAmount = 0;
        let totalAddonAmount = 0;
        let checkoutItems: any[] = [];
        let itemNames: string[] = [];

        // 2.1 Processar Plano
        if (planSlug) {
            const { data: plan } = await getSupabaseAdmin().from('system_plans').select('*').eq('slug', planSlug).single();
            if (!plan) throw new Error('Plano não encontrado');

            let planBase = Number(plan.price);
            const disc = interval === 12 ? (plan.discount_annual || 20) : interval === 6 ? (plan.discount_semiannual || 10) : 0;
            if (disc > 0) planBase = planBase * (1 - (disc / 100));

            totalPlanAmount = Number((planBase * interval).toFixed(2));
            itemNames.push(`Plano ${plan.name}`);
            checkoutItems.push({
                name: `Assinatura: Plano ${plan.name}`,
                value: totalPlanAmount,
                quantity: 1
            });
        }

        // 2.2 Processar Add-ons
        for (const slug of finalAddonsSlugs) {
            const { data: addon } = await getSupabaseAdmin().from('system_addons').select('*').eq('slug', slug).single();
            if (!addon) continue;

            const addonAmount = Number((Number(addon.price) * interval).toFixed(2));
            totalAddonAmount += addonAmount;
            itemNames.push(`Módulo ${addon.name}`);
            checkoutItems.push({
                name: `Adicional: Módulo ${addon.name}`,
                value: addonAmount,
                quantity: 1
            });
        }

        if (checkoutItems.length === 0) {
            throw new Error('Nenhum plano ou add-on selecionado');
        }

        let totalAmount = Number((totalPlanAmount + totalAddonAmount).toFixed(2));
        const itemDescription = `791 Barber: ${itemNames.join(' + ')}`;

        // Aplicar cupom se fornecido (fora o desconto de 10% automático)
        let couponDiscount = 0;
        if (coupon) {
            const { data: dbCoupon } = await getSupabaseAdmin()
                .from('system_coupons')
                .select('*')
                .eq('code', coupon.toUpperCase())
                .eq('is_active', true)
                .maybeSingle();

            if (dbCoupon) {
                if (dbCoupon.expires_at && new Date(dbCoupon.expires_at) < new Date()) {
                    throw new Error('Cupom expirado');
                }
                if (dbCoupon.discount_percent) {
                    couponDiscount = totalAmount * (Number(dbCoupon.discount_percent) / 100);
                } else if (dbCoupon.discount_value) {
                    couponDiscount = Number(dbCoupon.discount_value);
                }
                totalAmount = Math.max(0, totalAmount - couponDiscount);
            }
        }

        // Lógica de Desconto de Boas-vindas (10% no primeiro ciclo sobre o TOTAL)
        const isNotActive = !tenant.subscription_status ||
            ['trial', 'trial_expired', 'past_due', 'unpaid', 'incomplete'].includes(tenant.subscription_status || '');
        const isFirstSubscription = !tenant.asaas_subscription_id || isNotActive;
        const applyWelcomeDiscount = isFirstSubscription || (coupon?.toUpperCase() === 'WELCOME791');

        // 3. Garantir Cliente no Asaas (Identificação por E-mail conforme solicitado)
        console.log(`[ASAAS 2.0 SECURITY] Tenant ID: ${tenant.id} | User: ${user.email} | Target Name: ${tenant.name}`);

        const cpfCnpj = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
        const phone = (tenant.phone || '').replace(/\D/g, '');

        const customerData = {
            name: tenant.name || 'Cliente 791',
            email: user.email,
            cpfCnpj: cpfCnpj,
            mobilePhone: phone,
            address: tenant.street || tenant.address_street || 'Endereço não informado',
            addressNumber: tenant.number || 'SN',
            postalCode: (tenant.address_zip || tenant.cep || '').replace(/\D/g, ''),
            province: tenant.neighborhood || tenant.address_neighborhood || 'Bairro',
            phone: phone // Add phone property initialized with the same value as mobilePhone or empty string
        };

        let customer = await asaas.getCustomerByEmail(customerData.email);

        if (!customer) {
            console.log('[ASAAS 2.0] Criando novo cliente:', tenant.name);

            // FALLBACK AUTOMÁTICO: Preencher dados faltantes para não travar testes
            // Se o usuário não preencheu, enviamos dados genéricos aceitos pelo Asaas
            if (!customerData.mobilePhone) customerData.mobilePhone = '47999999999';
            if (!customerData.phone) customerData.phone = '4733333333';
            if (customerData.address === 'Endereço não informado' || !customerData.address) customerData.address = 'Rua de Teste';
            if (customerData.addressNumber === 'SN' || !customerData.addressNumber) customerData.addressNumber = '100';
            if (!customerData.postalCode) customerData.postalCode = '89200000';
            if (customerData.province === 'Bairro' || !customerData.province) customerData.province = 'Centro';

            customer = await asaas.createCustomer(customerData);
        } else if (customer.name !== (tenant.name || 'Cliente 791')) {
            console.log('[ASAAS 2.0] Sincronizando nome da barbearia no cliente Asaas:', customer.id);
            try {
                await asaas.updateCustomer(customer.id, { name: tenant.name || 'Cliente 791' });
            } catch (e) {
                console.error('[ASAAS 2.0] Erro ao sincronizar nome:', e);
            }
        }

        // 4. Preparar referências e Itens Seguros (Asaas tem limite de 30 chars no item.name)
        const externalReference = crypto.randomUUID();
        const baseUrl = 'https://791barber.com';

        // 5. Calcular valor final (TOTAL)
        // RAMON FIX: Mantemos o valor dos itens CHEIO para exibição na fatura.
        // O desconto será aplicado no objeto 'discount' ou 'payment' dependendo do tipo.
        const finalCheckoutItems = checkoutItems.map(item => ({
            name: item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name,
            value: item.value, // Valor ORIGINAL (Cheio)
            quantity: 1
        }));

        const totalFullValue = finalCheckoutItems.reduce((acc, it) => acc + it.value, 0);
        // FIX CRÍTICO: Restaurando firstPaymentValue para lógica de comparação e fallback
        const firstPaymentValue = applyWelcomeDiscount ? Number((totalFullValue * 0.9).toFixed(2)) : totalFullValue;

        // 6. CRIAÇÃO DA COBRANÇA (Checkouts)
        // Se for Crédito + Mensal, gerar RECORRENTE
        if (paymentMethod === 'CREDIT_CARD' && interval === 1) {
            // FIX: Data de vencimento para HOJE (Cobrança Imediata)
            const today = new Date();
            const dueDateString = today.toISOString().split('T')[0];

            const shortDescription = `Assinatura: ${itemNames.join(' + ')}`.substring(0, 100);

            // Lógica de Desconto na Assinatura (Apenas 1º Ciclo)
            let discountObj = null;
            if (applyWelcomeDiscount) {
                // Se o desconto é 10% do total
                const discountVal = Number((totalAmount * 0.10).toFixed(2));
                discountObj = {
                    value: discountVal,
                    type: 'FIXED' // Valor fixo para garantir precisão
                };
            }

            const checkoutPayload: any = {
                customer: customer.id,
                billingTypes: ['CREDIT_CARD'],
                chargeTypes: ['RECURRENT'],
                description: shortDescription,
                observations: itemDescription,
                externalReference: externalReference,
                // subscription: Configuração da recorrência
                subscription: {
                    cycle: 'MONTHLY',
                    value: totalAmount, // Valor CHEIO para as renovações
                    nextDueDate: dueDateString, // Começa HOJE
                    description: shortDescription,
                    discount: discountObj ? { ...discountObj, cycles: 1 } : null // Desconto apenas no ciclo 1
                },
                callback: {
                    successUrl: `${baseUrl}/asaas/checkout/success`,
                    cancelUrl: `${baseUrl}/asaas/checkout/cancel`
                },
                items: finalCheckoutItems, // Itens com valor CHEIO
                discount: discountObj // Desconto aplicado no TOTALda primeira parcela
            };

            console.log('[ASAAS 2.0] Criando Checkout Recorrente (Imediato):', JSON.stringify(checkoutPayload, null, 2));
            const checkout = await asaas.createCheckout(checkoutPayload);

            // Registro no banco
            await getSupabaseAdmin().from('finance').insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: firstPaymentValue,
                description: itemDescription,
                date: new Date().toISOString().split('T')[0],
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    asaas_checkout_id: checkout.id,
                    external_reference: externalReference,
                    payment_method: paymentMethod,
                    plan: planSlug,
                    addons: finalAddonsSlugs,
                    is_first_payment: true,
                    original_value: totalAmount
                }
            });

            const asaasPortalUrl = environment === 'sandbox' ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';
            return addCorsHeaders(req, NextResponse.json({
                success: true,
                checkoutId: checkout.id,
                checkoutUrl: `${asaasPortalUrl}/checkoutSession/show?id=${checkout.id}`,
                amount: firstPaymentValue
            }));
        }

        const shortDescription = `Pagamento: ${itemNames.join(' + ')}`.substring(0, 50) + (itemNames.join(' + ').length > 50 ? '...' : '');

        // FALLBACK: createCheckout (Pix, Boleto, Parcelados)
        const checkoutPayload: any = {
            customer: customer.id,
            billingTypes: [paymentMethod],
            chargeTypes: ['DETACHED'],
            description: shortDescription,
            observations: itemDescription,
            externalReference: externalReference,
            totalValue: firstPaymentValue,
            minutesToExpire: 60,
            callback: {
                successUrl: `${baseUrl}/asaas/checkout/success`,
                cancelUrl: `${baseUrl}/asaas/checkout/cancel`
            },
            items: finalCheckoutItems
        };

        if (paymentMethod === 'CREDIT_CARD' && interval > 1) {
            checkoutPayload.chargeTypes = ['DETACHED', 'INSTALLMENT'];
            checkoutPayload.installment = {
                maxInstallmentCount: interval === 12 ? 12 : 6
            };
        }

        const checkout = await asaas.createCheckout(checkoutPayload);

        // 5. Salvar Registro de Auditoria no Banco para o Webhook encontrar
        await getSupabaseAdmin().from('finance').insert({
            tenant_id: tenant.id,
            type: 'expense',
            value: firstPaymentValue,
            description: itemDescription,
            date: new Date().toISOString().split('T')[0],
            is_paid: false,
            metadata: {
                is_saas_payment: true,
                asaas_checkout_id: checkout.id,
                asaas_customer_id: customer.id,
                external_reference: externalReference,
                payment_method: paymentMethod,
                plan: planSlug,
                addons: finalAddonsSlugs,
                interval: interval,
                is_first_payment: true,
                original_value: totalAmount
            }
        });

        const asaasPortalUrl = environment === 'sandbox' ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            checkoutId: checkout.id,
            checkoutUrl: `${asaasPortalUrl}/checkoutSession/show?id=${checkout.id}`,
            amount: firstPaymentValue
        }));

    } catch (error: any) {
        console.error('[ASAAS 2.0 ERROR]', error);
        const msg = error.response?.data?.errors?.[0]?.description || error.message || 'Erro interno';
        return addCorsHeaders(req, NextResponse.json({ error: msg }, { status: 500 }));
    }
}
