import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

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
        const { data: addon } = await supabaseAdmin
            .from('system_addons')
            .select('*')
            .eq('slug', addonSlug)
            .single();

        if (!addon) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Add-on não encontrado' }, { status: 404 }));
        }

        const { data: existing } = await supabaseAdmin
            .from('tenant_addons')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('addon_id', addon.id)
            .single();

        if (existing) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Você já possui este Add-on ativo' }, { status: 400 }));
        }

        // 2. Verificar se o Tenant tem assinatura Stripe ativa
        if (!tenant.stripe_subscription_id) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Para ativação imediata, é necessário possuir uma assinatura ativa via cartão. Caso contrário, utilize o checkout.'
            }, { status: 400 }));
        }

        // 3. Atualizar no Stripe (Soma para a próxima fatura)
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'stripe_config')
            .single();

        const stripeKey = settingsData?.value?.secret_key;
        if (!stripeKey) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 }));
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2025-12-15.clover' as any,
        });

        // 4. Adicionar Add-on como Subscription Item no Stripe
        let stripeSubscriptionItemId: string | null = null;

        if (addon.stripe_price_id) {
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
        } else {
            console.warn(`[ADDON ACTIVATE] ${addonSlug} sem stripe_price_id. Cobrança manual necessária.`);
        }

        // 5. Criar registro em tenant_addons
        const { error: activateError } = await supabaseAdmin
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
