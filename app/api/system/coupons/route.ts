import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import Stripe from 'stripe';

async function getStripeClient() {
    const { data: settingsData } = await getSupabaseAdmin()
        .from('system_settings')
        .select('value')
        .eq('key', 'stripe_config')
        .single();

    const stripeKey = settingsData?.value?.secret_key;
    if (!stripeKey || stripeKey.includes('dummy')) {
        throw new Error('Stripe não configurado pelo administrador');
    }

    return new Stripe(stripeKey, {
        apiVersion: '2025-12-15.clover' as any,
        typescript: true,
    });
}

export async function OPTIONS(req: Request) {
    const response = new NextResponse(null, { status: 200 });
    return addCorsHeaders(req, response);
}

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const { data: coupons, error } = await getSupabaseAdmin()
            .from('system_coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(coupons));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function POST(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const body = await req.json();
        const code = body.code.toUpperCase();

        // 1. Criar no Stripe Primeiro
        try {
            const stripe = await getStripeClient();
            await stripe.coupons.create({
                id: code,
                percent_off: body.discount_percent || undefined,
                duration: 'once',
                max_redemptions: body.max_uses || undefined,
                redeem_by: body.expires_at ? Math.floor(new Date(body.expires_at).getTime() / 1000) : undefined,
                name: `Cupom 791: ${code}`,
            });
        } catch (err: any) {
            // Se já existir no stripe, apenas logamos (pode ser um resíduo)
            console.warn('[STRIPE SYNC] Coupon might already exist or failed:', err.message);
            if (!err.message.includes('already exists')) {
                throw new Error(`Erro no Stripe: ${err.message}`);
            }
        }

        // 2. Criar no DB
        const { data, error } = await getSupabaseAdmin()
            .from('system_coupons')
            .insert([body])
            .select()
            .single();

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(data));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function PATCH(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const body = await req.json();
        const { id, ...updates } = body;

        const { data, error } = await getSupabaseAdmin()
            .from('system_coupons')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return addCorsHeaders(req, NextResponse.json(data));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}

export async function DELETE(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Acesso negado' }, { status: 403 }));
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return addCorsHeaders(req, NextResponse.json({ error: 'ID não informado' }, { status: 400 }));
        }

        // Buscar o código antes de deletar para remover do Stripe
        const { data: coupon } = await getSupabaseAdmin()
            .from('system_coupons')
            .select('code')
            .eq('id', id)
            .single();

        if (coupon) {
            try {
                const stripe = await getStripeClient();
                await stripe.coupons.del(coupon.code);
            } catch (err) {
                console.warn('[STRIPE SYNC] Failed to delete coupon from Stripe:', err);
            }
        }

        const { error } = await getSupabaseAdmin()
            .from('system_coupons')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[COUPONS DELETE DB ERROR]', error);
            throw new Error('Falha ao excluir do banco de dados. Pode haver registros vinculados.');
        }

        return addCorsHeaders(req, NextResponse.json({ success: true }));
    } catch (error: any) {
        console.error('[COUPONS DELETE ERROR]', error);
        return addCorsHeaders(req, NextResponse.json({ error: error.message || 'Erro ao excluir cupom' }, { status: 500 }));
    }
}
