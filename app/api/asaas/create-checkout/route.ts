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
            paymentMethod = 'CREDIT_CARD',
            installments = 1
        } = body;

        // RAMON FIX: Garantir que interval seja número
        const interval = Number(body.interval || 1);

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
        const intervalDiscountPercent = interval === 12 ? 20 : interval === 6 ? 10 : 0;
        const intervalDiscountFactor = (1 - intervalDiscountPercent / 100);

        let totalPlanAmount = 0;
        let totalAddonAmount = 0;
        let checkoutItems: any[] = [];
        let itemNames: string[] = [];

        // 2.1 Processar Plano
        if (planSlug) {
            const { data: plan } = await getSupabaseAdmin().from('system_plans').select('*').eq('slug', planSlug).single();
            if (!plan) throw new Error('Plano não encontrado');

            // RAMON FIX: Usar o mesmo fator de desconto de intervalo
            const planBase = Number(plan.price) * intervalDiscountFactor;
            totalPlanAmount = Number((planBase * interval).toFixed(2));

            const cleanPlanName = plan.name.replace("Plano ", "");
            itemNames.push(`Plano ${cleanPlanName}`);
            checkoutItems.push({
                name: `Assinatura: Plano ${cleanPlanName}`,
                value: totalPlanAmount,
                quantity: 1
            });
        }

        // 2.2 Processar Add-ons
        for (const slug of finalAddonsSlugs) {
            const { data: addon } = await getSupabaseAdmin().from('system_addons').select('*').eq('slug', slug).single();
            if (!addon) continue;

            // RAMON FIX: Aplicar desconto de intervalo aos módulos corretamente
            const addonAmount = Number((Number(addon.price) * intervalDiscountFactor * interval).toFixed(2));
            totalAddonAmount += addonAmount;

            const cleanAddonName = addon.name.replace("Módulo ", "");
            itemNames.push(`Módulo ${cleanAddonName}`);
            checkoutItems.push({
                name: `Adicional: Módulo ${cleanAddonName}`,
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
        // RAMON FIX: Alinhando com a lógica de 5 dias do frontend (+ 1 dia de margem de segurança)
        let isWithinWelcomeWindow = false;
        if (tenant.created_at) {
            const created = new Date(tenant.created_at);
            const now = new Date();
            const diffTime = now.getTime() - created.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Usando 6 dias para cobrir o 5º dia inteiro e evitar problemas de fuso horário/seguraças
            if (diffDays <= 6) isWithinWelcomeWindow = true;
        }

        const isNotActive = !tenant.subscription_status ||
            ['trial', 'trial_expired', 'past_due', 'unpaid', 'incomplete'].includes(tenant.subscription_status || '');
        const isFirstSubscription = !tenant.asaas_subscription_id || isNotActive;

        // O desconto se aplica se for a primeira assinatura E estiver nos primeiros 5-6 dias
        const applyWelcomeDiscount = isFirstSubscription && isWithinWelcomeWindow;

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
        const totalFullValue = checkoutItems.reduce((acc, it) => acc + it.value, 0);

        console.log(`[ASAAS DEBUG] Intervalo: ${interval} | Total Bruto Itens: R$ ${totalFullValue}`);

        // RAMON FIX: O desconto de 10% é sobre apenas 1 MÊS, mesmo em planos anuais/semestrais.
        const oneMonthValue = totalFullValue / interval;
        const welcomeDiscountAmount = applyWelcomeDiscount ? Number((oneMonthValue * 0.1).toFixed(2)) : 0;

        // Calcular desconto do cupom (se houver)
        const totalDiscountFromCoupon = couponDiscount;

        const firstPaymentValue = Number((totalFullValue - welcomeDiscountAmount - totalDiscountFromCoupon).toFixed(2));

        console.log(`[ASAAS DEBUG] Valor 1 Mês: R$ ${oneMonthValue.toFixed(2)}`);
        console.log(`[ASAAS DEBUG] Desconto Welcome (10% de 1 mês): R$ ${welcomeDiscountAmount}`);
        console.log(`[ASAAS DEBUG] Desconto Cupom: R$ ${totalDiscountFromCoupon}`);
        console.log(`[ASAAS DEBUG] Valor Final Pago Hoje: R$ ${firstPaymentValue}`);

        // RAMON FIX: Aplicar desconto proporcional em cada item para o Asaas não se perder
        let itemsSum = 0;
        const finalCheckoutItems = checkoutItems.map((item, index) => {
            // Rateio do desconto total (Welcome + Cupom) proporcional ao valor do item
            const totalDiscountForThisCheckout = welcomeDiscountAmount + totalDiscountFromCoupon;
            const itemDiscount = totalDiscountForThisCheckout > 0
                ? Number(((item.value / totalFullValue) * totalDiscountForThisCheckout).toFixed(2))
                : 0;

            let val = Number((item.value - itemDiscount).toFixed(2));

            // Se for o último item, ajustar centavos para bater com o firstPaymentValue
            if (index === checkoutItems.length - 1) {
                val = Number((firstPaymentValue - itemsSum).toFixed(2));
            } else {
                itemsSum += val;
            }

            return {
                name: (item.name + (applyWelcomeDiscount ? ' (Bônus 1ª Parc)' : '')).substring(0, 30),
                value: val,
                quantity: 1
            };
        });

        const shortDescription = `Pagamento: ${itemNames.join(' + ')}`.substring(0, 50) + (itemNames.join(' + ').length > 50 ? '...' : '');

        // 6. CRIAÇÃO DA COBRANÇA (Checkouts Sessions para tudo)
        // Isso garante a melhor UI, Redirecionamento e Suporte a Itens.
        const isMonthlyRecurring = paymentMethod === 'CREDIT_CARD' && interval === 1;

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
                cancelUrl: `${baseUrl}/configuracoes/plano?error=true`,
                autoRedirect: true
            },
            items: finalCheckoutItems
        };

        // Configuração de Parcelamento (Se for anual/semestral)
        if (paymentMethod === 'CREDIT_CARD' && interval > 1) {
            checkoutPayload.chargeTypes = ['DETACHED', 'INSTALLMENT'];
            checkoutPayload.installment = {
                maxInstallmentCount: interval // Forçar limite máximo de parcelas
            };
        }

        const checkout = await asaas.createCheckout(checkoutPayload);

        // 7. Salvar Registro de Auditoria no Banco para o Webhook encontrar
        const financeDescription = `${itemDescription}${applyWelcomeDiscount ? ' (Bônus Boas-vindas 10%)' : ''}`;

        await getSupabaseAdmin().from('finance').insert({
            tenant_id: tenant.id,
            type: 'expense',
            value: firstPaymentValue,
            description: financeDescription,
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
                original_value: totalAmount, // Valor cheio sem o primeiro desconto de 10%
                recurring_setup: isMonthlyRecurring // Webhook usará isso para criar a assinatura oficial
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
