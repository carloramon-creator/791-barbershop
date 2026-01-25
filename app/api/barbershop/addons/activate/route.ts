import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        if (!tenant || !user) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Não autenticado' }, { status: 401 }));
        }

        const { addonSlug } = await req.json();
        if (!addonSlug) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Add-on não especificado' }, { status: 400 }));
        }

        // 1. Buscar Add-on e verificar se já possui
        const { data: addon } = await getSupabaseAdmin()
            .from('system_addons')
            .select('*')
            .eq('slug', addonSlug)
            .single();

        if (!addon) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Add-on não encontrado' }, { status: 404 }));
        }

        const { data: existing } = await getSupabaseAdmin()
            .from('tenant_addons')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('addon_id', addon.id)
            .single();

        if (existing) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Você já possui este Add-on ativo' }, { status: 400 }));
        }

        // 3. Obter Configuração Stripe (Dinâmico do Banco)
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'stripe_config')
            .single();

        const stripeKey = settingsData?.value?.secret_key;
        if (!stripeKey) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Stripe não configurado pelo administrador' }, { status: 500 }));
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2025-12-15.clover' as any,
        });

        // 2. Verificar se o Tenant tem assinatura Stripe ativa (Auto-Heal if stale)
        let activeSubscriptionId = tenant.stripe_subscription_id;

        if (activeSubscriptionId) {
            try {
                const sub = await stripe.subscriptions.retrieve(activeSubscriptionId);
                if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
                    activeSubscriptionId = null;
                }
            } catch (err: any) {
                if (err.status === 404 || err.code === 'resource_missing') {
                    console.warn(`[ADDON] Subscription ${activeSubscriptionId} não existe no Stripe. Limpando...`);
                    activeSubscriptionId = null;
                    // Limpa no banco para não tentar de novo
                    await getSupabaseAdmin().from('tenants').update({ stripe_subscription_id: null }).eq('id', tenant.id);
                } else {
                    throw err;
                }
            }
        }

        if (!activeSubscriptionId) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Para ativação imediata, é necessário possuir uma assinatura ativa via cartão. Caso sua assinatura tenha sido cancelada ou não exista, utilize os botões de Upgrade no painel de Planos.'
            }, { status: 400 }));
        }

        // 4. Garantir que o Add-on tenha um Price no Stripe (Auto-Create se necessário)
        if (!addon.stripe_price_id) {
            console.log(`[ADDON ACTIVATE] ${addonSlug} sem stripe_price_id. Criando automaticamente no Stripe...`);
            try {
                // Criar Produto para o Addon
                const product = await stripe.products.create({
                    name: `791 Barber Add-on: ${addon.name}`,
                    metadata: { addon_slug: addonSlug }
                });

                const price = await stripe.prices.create({
                    product: product.id,
                    unit_amount: Math.round(addon.price * 100),
                    currency: 'brl',
                    recurring: { interval: 'month' },
                });

                // Salvar no banco para futuras compras
                await getSupabaseAdmin()
                    .from('system_addons')
                    .update({ stripe_price_id: price.id })
                    .eq('id', addon.id);

                addon.stripe_price_id = price.id;
                console.log(`[ADDON ACTIVATE] stripe_price_id criado e salvo: ${price.id}`);
            } catch (err: any) {
                console.error('[ADDON AUTO-CREATE ERROR]', err);
                return addCorsHeaders(req, NextResponse.json({
                    error: `Não foi possível configurar o preço deste add-on no Stripe: ${err.message}. Tente novamente ou contate o suporte.`
                }, { status: 500 }));
            }
        }

        // 5. Adicionar Add-on como Subscription Item no Stripe
        let stripeSubscriptionItemId: string | null = null;
        try {
            const subscriptionItem = await stripe.subscriptionItems.create({
                subscription: tenant.stripe_subscription_id,
                price: addon.stripe_price_id,
                quantity: 1,
                proration_behavior: 'create_prorations',
            });
            stripeSubscriptionItemId = subscriptionItem.id;
            console.log(`[ADDON ACTIVATE] Stripe item criado: ${subscriptionItem.id}`);
        } catch (stripeError: any) {
            console.error('[STRIPE ERROR]', stripeError);
            return addCorsHeaders(req, NextResponse.json({
                error: `Erro ao adicionar no Stripe: ${stripeError.message}`
            }, { status: 500 }));
        }

        // 6. Criar registro em tenant_addons
        const { error: activateError } = await getSupabaseAdmin()
            .from('tenant_addons')
            .insert({
                tenant_id: tenant.id,
                addon_id: addon.id,
                status: 'active',
                price_at_purchase: addon.price,
                stripe_subscription_item_id: stripeSubscriptionItemId
            });

        if (activateError) {
            if (stripeSubscriptionItemId) {
                try {
                    await stripe.subscriptionItems.del(stripeSubscriptionItemId);
                } catch (e) {
                    console.error('[ROLLBACK ERROR]', e);
                }
            }
            throw activateError;
        }

        console.log(`[ADDON ACTIVATE] ${addonSlug} ativado para ${tenant.name}`);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            message: addon.stripe_price_id
                ? 'Add-on ativado! Valor será cobrado proporcionalmente na próxima fatura.'
                : 'Add-on ativado! Cobrança manual necessária.'
        }));

    } catch (error: any) {
        console.error('[ADDON ACTIVATE ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
