import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function POST(req: Request) {
    try {
        const { tenant, roles } = await getCurrentUserAndTenant();

        if (!tenant || !roles.includes('owner')) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        // Se não tem ID no banco, apenas atualiza localmente para garantir consistência
        if (!tenant.stripe_subscription_id) {
            await supabaseAdmin
                .from('tenants')
                .update({ subscription_status: 'canceled' })
                .eq('id', tenant.id);
            return addCorsHeaders(req, NextResponse.json({ success: true }));
        }

        // 0. Obter Configuração Stripe (Dinâmico do Banco)
        const { data: settingsData } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'stripe_config')
            .single();

        const stripeKey = settingsData?.value?.secret_key;
        if (!stripeKey || stripeKey.includes('dummy')) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Stripe não configurado corretamente no sistema' }, { status: 500 }));
        }

        const stripeClient = new Stripe(stripeKey, {
            apiVersion: '2025-12-15.clover' as any,
            typescript: true,
        });

        // Cancelar no Stripe (ao final do período)
        try {
            await stripeClient.subscriptions.update(tenant.stripe_subscription_id, {
                cancel_at_period_end: true,
            });
        } catch (stripeErr: any) {
            console.warn('[CANCEL SUBSCRIPTION] Erro no Stripe (ignorando se já não existir):', stripeErr.message);
            // Se já não existe ou erro de ID, prosseguimos para cancelar no banco local
        }

        // Atualizar status no banco
        await supabaseAdmin
            .from('tenants')
            .update({ subscription_status: 'canceled' })
            .eq('id', tenant.id);

        return addCorsHeaders(req, NextResponse.json({ success: true }));
    } catch (error: any) {
        console.error('[CANCEL SUBSCRIPTION ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
