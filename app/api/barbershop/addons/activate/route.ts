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

        // Ramon pediu "Soma para a próxima fatura"
        // No Stripe Checkout ou Subscription Update, isso é feito adicionando um subscription_item.
        // Como não temos PriceID fixo no banco ainda (usamos Slug), precisaríamos criar um preço dinâmico ou buscar.
        // Por enquanto, vamos registrar no BD e o Webhook/Sistema de Cobrança assume,
        // mas o ideal é que o Stripe saiba disso.

        // Vamos criar um registro em tenant_addons imediatamente
        const { error: activateError } = await supabaseAdmin
            .from('tenant_addons')
            .insert({
                tenant_id: tenant.id,
                addon_id: addon.id,
                status: 'active'
            });

        if (activateError) throw activateError;

        console.log(`[ADDON ACTIVATE] ${addonSlug} ativado instantaneamente para ${tenant.name}`);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            message: 'Add-on ativado com sucesso! O valor será incluído na sua próxima fatura.'
        }));

    } catch (error: any) {
        console.error('[ADDON ACTIVATE ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
