import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
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

        if (!tenant.stripe_subscription_id) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada no Stripe' }, { status: 400 }));
        }

        // Cancelar no Stripe (ao final do período)
        await stripe.subscriptions.update(tenant.stripe_subscription_id, {
            cancel_at_period_end: true,
        });

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
