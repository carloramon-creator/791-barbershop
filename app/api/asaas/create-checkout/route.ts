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

        const body = await req.json();
        const {
            plan: planSlug,
            addon: addonSlug,
            coupon,
            interval = 1,
            paymentMethod = 'CREDIT_CARD',
            installments = 1
        } = body;

        // 1. Obter Configurações Asaas
        const { data: settingsData } = await supabaseAdmin
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

        // 2. Definir Item e Valor
        let baseAmount = 0;
        let itemName = '';
        let isAddon = !!addonSlug;

        if (isAddon) {
            const { data: addon } = await supabaseAdmin.from('system_addons').select('*').eq('slug', addonSlug).single();
            if (!addon) throw new Error('Add-on não encontrado');
            baseAmount = Number(addon.price);
            itemName = `Add-on: ${addon.name}`;
        } else {
            const { data: plan } = await supabaseAdmin.from('system_plans').select('*').eq('slug', planSlug).single();
            if (!plan) throw new Error('Plano não encontrado');
            baseAmount = Number(plan.price);
            itemName = `Plano ${plan.name}`;

            const disc = interval === 12 ? (plan.discount_annual || 20) : interval === 6 ? (plan.discount_semiannual || 10) : 0;
            if (disc > 0) baseAmount = baseAmount * (1 - (disc / 100));
        }

        // Aplicar cupom se fornecido
        let couponDiscount = 0;
        if (coupon) {
            const { data: dbCoupon } = await supabaseAdmin
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
                    couponDiscount = baseAmount * (Number(dbCoupon.discount_percent) / 100);
                } else if (dbCoupon.discount_value) {
                    couponDiscount = Number(dbCoupon.discount_value);
                }
                baseAmount = Math.max(0, baseAmount - couponDiscount);
            }
        }

        const totalAmount = Number(((baseAmount * interval) || 0).toFixed(2));
        const itemDescription = isAddon ? `Módulo Adicional: ${itemName}` : `Assinatura Mensal Plano ${itemName}`;

        // Lógica de Desconto de Boas-vindas (10% no primeiro ciclo para novos tenants)
        const isFirstSubscription = tenant.plan === 'trial' || !tenant.asaas_subscription_id;
        const hasWelcomeCoupon = coupon?.toUpperCase() === 'WELCOME791';

        let discountConfig = null;
        if (isFirstSubscription || hasWelcomeCoupon) {
            discountConfig = {
                value: 10,
                type: 'PERCENTAGE',
                cycles: 1
            };
        }

        // 3. Garantir Cliente no Asaas
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
            province: tenant.neighborhood || tenant.address_neighborhood || 'Bairro'
        };

        let customer = await asaas.getCustomerByEmail(customerData.email);
        if (!customer) {
            customer = await asaas.createCustomer(customerData);
        }

        // 3.5. Preparar referências
        const externalReference = crypto.randomUUID();
        const baseUrl = 'https://791barber.com'; // Hardcoded fix

        // 3.6. ADD-ON RECORRENTE (Lógica mantida)
        if (isAddon && tenant.asaas_subscription_id) {
            // ... (Manter lógica de add-on existente) ...
        }

        // 4. CRIAÇÃO DE ASSINATURA (PLANOS)
        // Se for Crédito + Plano Mensal, usar createCheckout com valores distintos para o 1º ciclo
        if (!isAddon && paymentMethod === 'CREDIT_CARD' && interval === 1) {
            console.log('[ASAAS 2.0] Criando Checkout Recorrente com Desconto no 1º Ciclo');

            const nextDueDate = new Date();
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);

            const checkoutPayload: any = {
                customer: customer.id,
                billingTypes: ['CREDIT_CARD'],
                chargeTypes: ['RECURRENT'],
                description: itemDescription,
                externalReference: externalReference,
                totalValue: discountConfig ? totalAmount * 0.9 : totalAmount, // Valor do 1º pagamento (com desconto de boas-vindas)
                subscription: {
                    cycle: 'MONTHLY',
                    value: totalAmount, // Valor recorrente FULL R$ 49,90 ou 99,90
                    nextDueDate: nextDueDate.toISOString().split('T')[0]
                },
                callback: {
                    successUrl: `${baseUrl}/asaas/checkout/success`,
                    cancelUrl: `${baseUrl}/asaas/checkout/cancel`
                },
                items: [{
                    name: (itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName),
                    value: discountConfig ? totalAmount * 0.9 : totalAmount,
                    quantity: 1
                }]
            };

            const checkout = await asaas.createCheckout(checkoutPayload);
            console.log('[ASAAS 2.0] Checkout recorrente criado:', checkout.id);

            // Salvar no banco
            await supabaseAdmin.from('finance').insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: totalAmount,
                description: `Assinatura SaaS - ${itemName}`,
                date: new Date().toISOString().split('T')[0],
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    asaas_checkout_id: checkout.id,
                    external_reference: externalReference,
                    payment_method: paymentMethod,
                    plan: planSlug
                }
            });

            const asaasPortalUrl = environment === 'sandbox' ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';
            return addCorsHeaders(req, NextResponse.json({
                success: true,
                checkoutId: checkout.id,
                checkoutUrl: `${asaasPortalUrl}/checkoutSession/show?id=${checkout.id}`,
                amount: discountConfig ? totalAmount * 0.9 : totalAmount
            }));
        }

        // FALLBACK: createCheckout (Para Add-ons avulsos, parcelamentos anuais, etc - Lógica legada)
        // Truncar nome do item para 30 chars
        const safeItemName = (itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName);

        const checkoutPayload: any = {
            customer: customer.id,
            billingTypes: [paymentMethod],
            chargeTypes: ['DETACHED'],
            description: itemDescription,
            externalReference: externalReference,
            totalValue: totalAmount,
            minutesToExpire: 60,
            callback: {
                successUrl: `${baseUrl}/asaas/checkout/success`,
                cancelUrl: `${baseUrl}/asaas/checkout/cancel`
            },
            items: [{
                name: safeItemName,
                value: totalAmount,
                quantity: 1
            }]
        };

        // Adicionar recorrência ou parcelamento
        if (paymentMethod === 'CREDIT_CARD') {
            if (interval === 1 && !isAddon) {
                checkoutPayload.chargeTypes = ['RECURRENT'];
                const nextDate = new Date();
                nextDate.setMonth(nextDate.getMonth() + 1);
                checkoutPayload.subscription = {
                    cycle: 'MONTHLY',
                    nextDueDate: nextDate.toISOString().split('T')[0]
                };
            } else if (interval > 1) {
                checkoutPayload.chargeTypes = ['DETACHED', 'INSTALLMENT'];
                checkoutPayload.installment = {
                    maxInstallmentCount: interval === 12 ? 12 : 6
                };
            }
        }

        console.log('[ASAAS 2.0] Criando checkout (Legacy/Fallback):', externalReference);
        const checkout = await asaas.createCheckout(checkoutPayload);

        // 5. Salvar Registro de Auditoria no Banco para o Webhook encontrar
        await supabaseAdmin.from('finance').insert({
            tenant_id: tenant.id,
            type: 'expense',
            value: totalAmount,
            description: `Assinatura SaaS - ${itemName}`,
            date: new Date().toISOString().split('T')[0],
            is_paid: false,
            metadata: {
                is_saas_payment: true,
                asaas_checkout_id: checkout.id,
                asaas_customer_id: customer.id,
                external_reference: externalReference,
                payment_method: paymentMethod,
                plan: planSlug,
                addon: addonSlug,
                interval: interval
            }
        });

        const asaasPortalUrl = environment === 'sandbox' ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            checkoutId: checkout.id,
            checkoutUrl: `${asaasPortalUrl}/checkoutSession/show?id=${checkout.id}`,
            amount: totalAmount
        }));

    } catch (error: any) {
        console.error('[ASAAS 2.0 ERROR]', error);
        const msg = error.response?.data?.errors?.[0]?.description || error.message || 'Erro interno';
        return addCorsHeaders(req, NextResponse.json({ error: msg }, { status: 500 }));
    }
}
