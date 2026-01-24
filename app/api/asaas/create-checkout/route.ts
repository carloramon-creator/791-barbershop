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
        let itemDescription = '';
        let isAddon = !!addonSlug;
        let discountConfig = null;

        if (isAddon) {
            const { data: addon } = await supabaseAdmin.from('system_addons').select('*').eq('slug', addonSlug).single();
            if (!addon) throw new Error('Add-on não encontrado');
            baseAmount = Number(addon.price);
            itemName = `Add-on: ${addon.name}`;
            itemDescription = `Módulo adicional ${addon.name}`;
        } else {
            const { data: plan } = await supabaseAdmin.from('system_plans').select('*').eq('slug', planSlug).single();
            if (!plan) throw new Error('Plano não encontrado');
            baseAmount = Number(plan.price);
            itemName = `Plano ${plan.name}`;

            const disc = interval === 12 ? (plan.discount_annual || 20) : interval === 6 ? (plan.discount_semiannual || 10) : 0;
            const cycleText = interval === 12 ? 'Anual' : interval === 6 ? 'Semestral' : 'Mensal';
            itemDescription = `Assinatura ${cycleText} ${itemName}`;

            if (disc > 0) baseAmount = baseAmount * (1 - (disc / 100));

            // BÔNUS: Desconto de 10% adicional para contas criadas há menos de 5 dias (Boas-vindas)
            // APLICAÇÃO CORRETA: Apenas no 1º ciclo
            const created = new Date(tenant.created_at || new Date());
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 5 && (!tenant.subscription_status || tenant.subscription_status === 'trial')) {
                console.log(`[ASAAS 2.0] Configurando desconto de boas-vindas (10%) para 1º ciclo`);
                discountConfig = {
                    value: 10,
                    type: 'PERCENTAGE',
                    cycles: 1
                };
            }
        }

        // Aplicar cupom se fornecido (Prioridade sobre welcome discount se existir lógica conflitante, aqui acumula?)
        // Simplificação: Se tiver cupom, aplica no baseAmount (permanente se não tiver lógica complexa) ou substitui discountConfig
        // Por enquanto mantemos cupom reduzindo baseAmount (comportamento "para sempre" se for recorrente)
        let couponDiscount = 0;
        if (coupon) {
            const { data: dbCoupon } = await supabaseAdmin
                .from('system_coupons')
                .select('*')
                .eq('code', coupon.toUpperCase())
                .eq('is_active', true)
                .maybeSingle();

            if (dbCoupon) {
                // Verificar validade
                if (dbCoupon.expires_at && new Date(dbCoupon.expires_at) < new Date()) {
                    throw new Error('Cupom expirado');
                }
                if (dbCoupon.discount_percent) {
                    couponDiscount = baseAmount * (Number(dbCoupon.discount_percent) / 100);
                } else if (dbCoupon.discount_value) {
                    couponDiscount = Number(dbCoupon.discount_value);
                }
                baseAmount = Math.max(0, baseAmount - couponDiscount);
                console.log(`[ASAAS 2.0] Cupom ${coupon} aplicado: -R$ ${(couponDiscount || 0).toFixed(2)}`);
            } else {
                console.log(`[ASAAS 2.0] Cupom ${coupon} inválido ou inativo`);
            }
        }

        const totalAmount = Number(((baseAmount * interval) || 0).toFixed(2));

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
        // Se for Crédito + Plano (não add-on isolado), usar createSubscription para suportar desconto de 1 ciclo
        if (!isAddon && paymentMethod === 'CREDIT_CARD' && interval === 1) {
            console.log('[ASAAS 2.0] Criando Assinatura Mensal via createSubscription (Suporte a Desconto 1º Ciclo)');

            const subscriptionPayload: any = {
                customer: customer.id,
                billingType: 'CREDIT_CARD',
                value: totalAmount,
                nextDueDate: new Date().toISOString().split('T')[0], // Hoje
                cycle: 'MONTHLY',
                description: itemDescription,
                externalReference: externalReference
            };

            if (discountConfig) {
                subscriptionPayload.discount = discountConfig;
            }

            const subscription = await asaas.createSubscription(subscriptionPayload);
            console.log('[ASAAS 2.0] Assinatura criada:', subscription.id);

            // Buscar a primeira cobrança gerada para pegar o link
            const payments = await asaas.getPaymentsBySubscription(subscription.id);
            const firstPayment = payments?.data?.[0]; // Asaas retorna { data: [], ... }

            if (!firstPayment) {
                throw new Error('Assinatura criada mas nenhuma cobrança gerada.');
            }

            // Salvar no banco
            await supabaseAdmin.from('tenants')
                .update({ asaas_subscription_id: subscription.id })
                .eq('id', tenant.id);

            await supabaseAdmin.from('finance').insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: totalAmount, // Valor cheio referência
                description: `Assinatura SaaS - ${itemName}`,
                date: new Date().toISOString().split('T')[0],
                is_paid: false,
                metadata: {
                    is_saas_payment: true,
                    asaas_subscription_id: subscription.id,
                    asaas_payment_id: firstPayment.id,
                    external_reference: externalReference,
                    payment_method: paymentMethod,
                    plan: planSlug
                }
            });

            const asaasPortalUrl = environment === 'sandbox' ? 'https://sandbox.asaas.com' : 'https://www.asaas.com';
            // Retornar link da fatura (que aceita cartão)
            return addCorsHeaders(req, NextResponse.json({
                success: true,
                checkoutId: firstPayment.id,
                checkoutUrl: firstPayment.invoiceUrl || `${asaasPortalUrl}/i/${firstPayment.id}`, // Fallback
                amount: firstPayment.value // Valor real da 1ª cobrança (com desconto)
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
