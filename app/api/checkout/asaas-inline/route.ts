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
            coupon,
            interval = 1,
            paymentMethod = 'CREDIT_CARD', // CREDIT_CARD, PIX, BOLETO
            installments = 1,
            recurrent = false // Se true, cria assinatura recorrente
        } = await req.json();

        // 1. Buscar Preço Dinâmico e Descontos
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
            itemName = addon.name;
            itemDescription = addon.description || `Módulo ${addon.name}`;
            isAddon = true;
        } else {
            const { data: planData } = await supabaseAdmin
                .from('system_plans')
                .select('*')
                .eq('slug', planSlug)
                .single();

            if (!planData) return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));

            baseAmount = Number(planData.price);
            itemName = `Plano ${planData.name}`;
            itemDescription = planData.description || `Acesso completo ao 791 Barber - ${planData.name}`;

            if (interval === 6) {
                discountPercent = Number(planData.discount_semiannual || 10);
            } else if (interval === 12) {
                discountPercent = Number(planData.discount_annual || 20);
            }
        }

        // Calcular valor total
        let totalAmount = baseAmount * interval;
        if (discountPercent > 0) {
            totalAmount = totalAmount * (1 - (discountPercent / 100));
        }

        let finalAmount = totalAmount;

        // 2. Processar Cupom
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
                    discountFromCoupon = (finalAmount * Number(couponData.discount_percent)) / 100;
                } else if (couponData.discount_value) {
                    discountFromCoupon = Number(couponData.discount_value);
                }
            }
        }

        // 3. Desconto automático de Trial
        if (discountFromCoupon === 0 && interval === 1 && !isAddon) {
            const isTrial = tenant.plan === 'trial' || !tenant.stripe_subscription_id;
            const tenantCreated = new Date(tenant.created_at || new Date());
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - tenantCreated.getTime()) / (1000 * 60 * 60 * 24));
            const isNewAccount = diffDays <= 5;

            if (isTrial && isNewAccount) {
                discountFromCoupon = (finalAmount * 10) / 100;
                couponApplied = 'TRIAL_WELCOME_10';
            }
        }

        finalAmount = Math.max(0, finalAmount - discountFromCoupon);
        // Garantir 2 casas decimais para o Asaas não rejeitar o valor
        finalAmount = Number(finalAmount.toFixed(2));

        // 4. Configurar Asaas
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

        // 5. Preparar dados do cliente
        const cpfCnpj = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');

        if (!cpfCnpj || cpfCnpj.length < 11) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'CPF/CNPJ necessário. Configure nas informações da barbearia.'
            }, { status: 400 }));
        }

        // 6. Determinar billingTypes e chargeTypes
        let billingTypes: string[] = [];
        let chargeTypes: string[] = [];

        if (paymentMethod === 'CREDIT_CARD') {
            billingTypes = ['CREDIT_CARD'];
            if (recurrent) {
                chargeTypes = ['RECURRENT'];
            } else {
                // O Asaas exige DETACHED junto com INSTALLMENT para checkout de cartão não-recorrente
                chargeTypes = ['DETACHED', 'INSTALLMENT'];
            }
        } else if (paymentMethod === 'PIX') {
            billingTypes = ['PIX'];
            chargeTypes = recurrent ? ['RECURRENT'] : ['DETACHED'];
        } else if (paymentMethod === 'BOLETO') {
            billingTypes = ['BOLETO'];
            chargeTypes = recurrent ? ['RECURRENT'] : ['DETACHED'];
        } else {
            // Permitir todos os métodos
            billingTypes = ['CREDIT_CARD', 'PIX', 'BOLETO'];
            chargeTypes = recurrent ? ['RECURRENT'] : ['DETACHED', 'INSTALLMENT'];
        }

        // 7. Criar checkout inline
        const origin = req.headers.get('origin') || 'https://791barber.com';

        // Garantir que a cidade seja um número (IBGE)
        const cityCode = tenant.city_code ? parseInt(String(tenant.city_code)) : 4205407;

        const checkoutData: any = {
            billingTypes,
            chargeTypes,
            minutesToExpire: 60,
            callback: {
                successUrl: `${origin}/checkout/success`,
                cancelUrl: `${origin}/checkout/cancel`,
                expiredUrl: `${origin}/checkout/expired`
            },
            items: [{
                name: itemName,
                description: itemDescription,
                quantity: 1,
                value: finalAmount
            }],
            customerData: {
                name: tenant.name || 'Cliente',
                cpfCnpj: cpfCnpj,
                email: user.email || '',
                phone: (tenant.phone || '').replace(/\D/g, ''),
                address: tenant.street || tenant.address_street || '',
                addressNumber: tenant.number || 'S/N',
                complement: tenant.complement || '',
                postalCode: (tenant.address_zip || tenant.cep || '').replace(/\D/g, ''),
                province: tenant.neighborhood || tenant.address_neighborhood || '',
                city: isNaN(cityCode) ? 4205407 : cityCode
            }
        };

        // Adicionar configurações específicas
        if (chargeTypes.includes('INSTALLMENT') && installments > 1) {
            checkoutData.installment = {
                maxInstallmentCount: Math.min(installments, 12)
            };
        }

        if (chargeTypes.includes('RECURRENT')) {
            const nextDueDate = new Date();
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);

            checkoutData.subscription = {
                cycle: interval === 1 ? 'MONTHLY' : interval === 6 ? 'SEMIANNUALLY' : 'YEARLY',
                nextDueDate: nextDueDate.toISOString().split('T')[0]
            };
        }

        console.log('[ASAAS INLINE] Criando checkout:', JSON.stringify(checkoutData, null, 2));

        const checkout = await asaas.createCheckout(checkoutData);

        console.log('[ASAAS INLINE] Checkout criado:', checkout.id);

        // 8. Salvar no banco
        await supabaseAdmin
            .from('finance')
            .insert({
                tenant_id: tenant.id,
                type: 'expense',
                value: finalAmount,
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
                    installments: installments,
                    recurrent: recurrent
                }
            });

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            checkoutId: checkout.id,
            checkoutUrl: checkout.url, // Usar a URL oficial retornada pelo Asaas
            amount: finalAmount
        }));


    } catch (error: any) {
        console.error('[ASAAS INLINE CHECKOUT ERROR]', error);

        const errorMessage = error.response?.data?.errors?.[0]?.description ||
            error.response?.data?.error ||
            error.message ||
            'Erro ao processar pagamento';

        return addCorsHeaders(req, NextResponse.json({
            error: errorMessage
        }, { status: error.response?.status || 500 }));
    }
}
