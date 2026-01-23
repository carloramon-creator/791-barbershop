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

        // 3. Garantir Cliente no Asaas (Pre-requisito para Checkout Robusto)
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

        console.log('[ASAAS 2.0] Verificando cliente:', customerData.email);
        let customer = await asaas.getCustomerByEmail(customerData.email);
        if (!customer) {
            console.log('[ASAAS 2.0] Criando novo cliente');
            customer = await asaas.createCustomer(customerData);
        }

        // 3.5. Preparar referências
        const externalReference = crypto.randomUUID();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';

        // 3.6. LÓGICA DE ADD-ON RECORRENTE (Replicar comportamento Stripe)
        let subscriptionMode = false;
        let subscriptionId = null;

        if (isAddon && tenant.asaas_subscription_id) {
            console.log('[ASAAS 2.0] 🔄 Add-on detectado com assinatura ativa. Iniciando upgrade...');

            try {
                // Buscar assinatura atual
                const currentSubscription = await asaas.getSubscription(tenant.asaas_subscription_id);
                console.log('[ASAAS 2.0] Assinatura atual:', {
                    id: currentSubscription.id,
                    value: currentSubscription.value,
                    nextDueDate: currentSubscription.nextDueDate
                });

                // Calcular dias restantes
                const nextDueDate = new Date(currentSubscription.nextDueDate);
                const today = new Date();
                const daysRemaining = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                console.log('[ASAAS 2.0] Dias restantes até próxima cobrança:', daysRemaining);

                // Calcular pro-rata
                const currentPlanValue = Number(currentSubscription.value);
                const addonValue = baseAmount;
                const newSubscriptionValue = currentPlanValue + addonValue;

                // Pro-rata do add-on (cobrar apenas os dias restantes)
                const addonProRata = (addonValue / 31) * daysRemaining;
                console.log('[ASAAS 2.0] Cálculo pro-rata:', {
                    planAtual: currentPlanValue,
                    addon: addonValue,
                    novoValor: newSubscriptionValue,
                    addonProRata: (addonProRata || 0).toFixed(2)
                });

                // Cancelar assinatura atual
                console.log('[ASAAS 2.0] Cancelando assinatura atual...');
                await asaas.cancelSubscription(tenant.asaas_subscription_id);

                // Criar nova assinatura com valor combinado
                console.log('[ASAAS 2.0] Criando nova assinatura com valor combinado...');
                const newSubscription = await asaas.createSubscription({
                    customer: customer.id,
                    billingType: 'CREDIT_CARD',
                    value: newSubscriptionValue,
                    cycle: 'MONTHLY',
                    nextDueDate: currentSubscription.nextDueDate,
                    description: `${currentSubscription.description || 'Plano'} + ${itemName}`,
                    externalReference: externalReference
                });

                subscriptionId = newSubscription.id;
                subscriptionMode = true;

                // Atualizar valor base para cobrar apenas o pro-rata do add-on
                baseAmount = addonProRata;
                itemName = `${itemName} (Pro-rata ${daysRemaining} dias)`;

                console.log('[ASAAS 2.0] ✅ Nova assinatura criada:', newSubscription.id);
                console.log('[ASAAS 2.0] Cobrando pro-rata do add-on: R$', (addonProRata || 0).toFixed(2));

                // Atualizar tenant com novo subscription_id imediatamente
                await supabaseAdmin
                    .from('tenants')
                    .update({ asaas_subscription_id: newSubscription.id })
                    .eq('id', tenant.id);

            } catch (error: any) {
                console.error('[ASAAS 2.0] ❌ Erro ao processar add-on recorrente:', error.message);
                // Se falhar, continuar com fluxo normal (pagamento único)
                console.log('[ASAAS 2.0] Continuando com fluxo de pagamento único...');
            }
        }

        // 4. Criar Checkout Minimalista (RECOMENDADO PELA DOC V3)
        // Truncar nome do item para 30 chars (Limite rígido Asaas)
        const safeItemName = (itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName);

        const checkoutPayload: any = {
            customer: customer.id, // APENAS ID, SEM CUSTOMERDATA (Resolve conflito)
            billingTypes: [paymentMethod],
            chargeTypes: ['DETACHED'], // Valor padrão
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
                // Permitir parcelamento para planos anuais/semestrais
                checkoutPayload.chargeTypes = ['DETACHED', 'INSTALLMENT'];
                checkoutPayload.installment = {
                    maxInstallmentCount: interval === 12 ? 12 : 6
                };
            }
        }

        console.log('[ASAAS 2.0] Criando checkout:', externalReference);
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
