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

        const totalAmount = Number((baseAmount * interval).toFixed(2));

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

        // 4. Criar Checkout Minimalista (RECOMENDADO PELA DOC V3)
        const externalReference = crypto.randomUUID();
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://791barber.com';

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
