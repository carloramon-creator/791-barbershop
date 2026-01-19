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
            installments = 1
        } = await req.json();

        // 1. Buscar Preço Dinâmico e Descontos
        let baseAmount = 0;
        let itemName = '';
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
            isAddon = true;
        } else {
            const { data: planData } = await supabaseAdmin
                .from('system_plans')
                .select('*')
                .eq('slug', planSlug)
                .single();

            if (!planData) return addCorsHeaders(req, NextResponse.json({ error: 'Plano inválido' }, { status: 400 }));

            baseAmount = Number(planData.price);
            itemName = planData.name;

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
        if (discountFromCoupon === 0 && interval === 1) {
            const isTrial = tenant.plan === 'trial' || !tenant.stripe_subscription_id;
            const tenantCreated = new Date(tenant.created_at || new Date());
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - tenantCreated.getTime()) / (1000 * 60 * 60 * 24));
            const isNewAccount = diffDays <= 5;

            if (isTrial && !isAddon && isNewAccount) {
                discountFromCoupon = (finalAmount * 10) / 100;
                couponApplied = 'TRIAL_WELCOME_10';
            }
        }

        finalAmount = Math.max(0, finalAmount - discountFromCoupon);

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

        // 5. Criar ou buscar cliente no Asaas
        let asaasCustomer = await asaas.getCustomerByEmail(user.email || '');

        if (!asaasCustomer) {
            const cpfCnpj = (tenant.cnpj || tenant.cpf || tenant.document || '').replace(/\D/g, '');

            if (!cpfCnpj || cpfCnpj.length < 11) {
                return addCorsHeaders(req, NextResponse.json({
                    error: 'CPF/CNPJ necessário. Configure nas informações da barbearia.'
                }, { status: 400 }));
            }

            asaasCustomer = await asaas.createCustomer({
                name: tenant.name || 'Cliente',
                email: user.email || '',
                cpfCnpj: cpfCnpj,
                phone: tenant.phone?.replace(/\D/g, '') || '',
                postalCode: (tenant.address_zip || tenant.cep || '').replace(/\D/g, ''),
                address: tenant.street || tenant.address_street,
                addressNumber: tenant.number || 'S/N',
                province: tenant.neighborhood || tenant.address_neighborhood,
            });
        }

        // 6. Criar cobrança
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const paymentData: any = {
            customer: asaasCustomer.id,
            billingType: paymentMethod,
            value: finalAmount,
            dueDate: dueDateStr,
            description: `791 Barber - ${itemName} (${interval} ${interval === 1 ? 'mês' : 'meses'})`,
            externalReference: `${tenant.id}_${Date.now()}`,
        };

        // Configurar parcelamento para cartão
        // Se o plano for > 1 mês (Semestral/Anual), permitimos parcelar.
        // Se for mensal, forçamos 1x (conforme solicitado para não confundir).
        if (paymentMethod === 'CREDIT_CARD') {
            let finalInstallments = 1;

            if (interval > 1) {
                // Se interval > 1 (ex: 6 ou 12), aceitamos o que vem do front, limitado a 12 ou ao intervalo?
                // Geralmente anual pode ser em 12x. Semestral em 6x.
                // Vamos dar flexibilidade até 12x, mas o front já limita.
                finalInstallments = Math.min(installments, 12);
                if (finalInstallments < 1) finalInstallments = 1;
            }

            if (finalInstallments > 1) {
                paymentData.installmentCount = finalInstallments;
                paymentData.installmentValue = finalAmount / finalInstallments;
            }
        }

        const payment = await asaas.createPayment(paymentData);

        // 7. Salvar no banco
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
                    asaas_payment_id: payment.id,
                    payment_method: paymentMethod,
                    [isAddon ? 'addon' : 'plan']: addonSlug || planSlug,
                    is_addon: isAddon,
                    interval: interval,
                    installments: paymentData.installmentCount || 1
                }
            });

        // 8. Retornar dados específicos por método
        if (paymentMethod === 'PIX') {
            const pixData = await asaas.getPixQrCode(payment.id);
            return addCorsHeaders(req, NextResponse.json({
                success: true,
                paymentId: payment.id,
                pixQrCode: pixData.encodedImage,
                pixCopyPaste: pixData.payload,
                amount: finalAmount,
                expiresAt: payment.dueDate
            }));
        }

        if (paymentMethod === 'BOLETO') {
            return addCorsHeaders(req, NextResponse.json({
                success: true,
                paymentId: payment.id,
                boletoUrl: payment.bankSlipUrl,
                barCode: payment.identificationField,
                amount: finalAmount,
                dueDate: payment.dueDate
            }));
        }

        // CREDIT_CARD - Retorna URL de checkout
        return addCorsHeaders(req, NextResponse.json({
            success: true,
            paymentId: payment.id,
            checkoutUrl: payment.invoiceUrl,
            amount: finalAmount,
            installments: paymentData.installmentCount || 1
        }));

    } catch (error: any) {
        console.error('[ASAAS CHECKOUT ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({
            error: error.message || 'Erro ao processar pagamento'
        }, { status: 500 }));
    }
}
