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

        // 1. Buscar Preço Dinâmico
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

        // Calcular valor total
        let totalAmount = baseAmount * interval;
        if (discountPercent > 0) {
            totalAmount = totalAmount * (1 - (discountPercent / 100));
        }

        // 2. Configurar Asaas
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

        // 3. Preparar dados do cliente
        const cpfCnpj = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');
        if (!cpfCnpj || cpfCnpj.length < 11) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'CPF/CNPJ necessário. Configure nas informações da barbearia.'
            }, { status: 400 }));
        }

        // 4. Montar payload do checkout
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';

        // Truncar nome do item para 30 caracteres (limite do Asaas informado pelo usuário)
        const safeItemName = itemName.length > 30 ? itemName.substring(0, 27) + '...' : itemName;

        // Determinar chargeTypes e configurações adicionais
        let chargeTypes = ['DETACHED']; // Padrão seguro para Pix e Boleto
        let subscriptionConfig = undefined;
        let installmentConfig = undefined;

        if (paymentMethod === 'CREDIT_CARD') {
            if (interval === 1 && !isAddon) {
                // Mensal no Cartão = Assinatura
                chargeTypes = ['RECURRENT'];

                const nextDueDate = new Date();
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);

                subscriptionConfig = {
                    cycle: 'MONTHLY',
                    nextDueDate: nextDueDate.toISOString().split('T')[0]
                };
            } else if (interval > 1) {
                // Semestral/Anual no Cartão = Parcelado
                // Asaas exige DETACHED junto com INSTALLMENT para cartão parcelado
                chargeTypes = ['DETACHED', 'INSTALLMENT'];

                installmentConfig = {
                    maxInstallmentCount: Math.min(installments, interval)
                };
            }
        }

        const checkoutPayload: any = {
            billingTypes: [paymentMethod],
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
                value: totalAmount
            }],
            customerData: {
                name: tenant.name || 'Cliente',
                cpfCnpj: cpfCnpj,
                email: user.email || '',
                phone: tenant.phone?.replace(/\D/g, '') || undefined,
                address: tenant.street || tenant.address_street || undefined,
                addressNumber: tenant.number || undefined,
                complement: tenant.complement || undefined,
                postalCode: (tenant.address_zip || tenant.cep || '').replace(/\D/g, '') || undefined,
                province: tenant.neighborhood || tenant.address_neighborhood || undefined,
            }
        };

        if (subscriptionConfig) {
            checkoutPayload.subscription = subscriptionConfig;
        }

        if (installmentConfig) {
            checkoutPayload.installment = installmentConfig;
        }

        // 5. Criar checkout
        const checkout = await asaas.createCheckout(checkoutPayload);

        // 6. Salvar no banco para rastreamento
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
                    asaas_checkout_id: checkout.id,
                    payment_method: paymentMethod,
                    [isAddon ? 'addon' : 'plan']: addonSlug || planSlug,
                    is_addon: isAddon,
                    interval: interval,
                    installments: paymentMethod === 'CREDIT_CARD' ? installments : 1
                }
            });

        // 7. Retornar dados do checkout
        const checkoutUrl = `https://asaas.com/checkoutSession/show?id=${checkout.id}`;

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            checkoutId: checkout.id,
            checkoutUrl: checkoutUrl,
            amount: totalAmount
        }));

    } catch (error: any) {
        console.error('[ASAAS CREATE CHECKOUT ERROR]', error);

        const errorMessage = error.response?.data?.errors?.[0]?.description ||
            error.response?.data?.error ||
            error.message ||
            'Erro ao criar checkout';

        return addCorsHeaders(req, NextResponse.json({
            error: errorMessage
        }, { status: error.response?.status || 500 }));
    }
}
