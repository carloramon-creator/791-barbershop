import { NextResponse } from 'next/server';
import { getCurrentUserAndTenant, addCorsHeaders } from '@/lib/server-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';

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

        // Buscar assinatura ativa
        const { data: subscription, error } = await getSupabaseAdmin()
            .from('subscriptions')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('status', 'active')
            .single();

        if (error || !subscription) {
            return addCorsHeaders(req, NextResponse.json({
                error: 'Nenhuma assinatura ativa encontrada'
            }, { status: 404 }));
        }

        // Cancelar assinatura
        const { error: updateError } = await getSupabaseAdmin()
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('id', subscription.id);

        if (updateError) {
            console.error('[SUBSCRIPTION CANCEL] Erro ao cancelar:', updateError);
            return addCorsHeaders(req, NextResponse.json({
                error: 'Erro ao cancelar assinatura'
            }, { status: 500 }));
        }

        console.log(`[SUBSCRIPTION CANCEL] Assinatura cancelada para ${tenant.name}`);

        return addCorsHeaders(req, NextResponse.json({
            success: true,
            message: 'Assinatura cancelada com sucesso. Você manterá acesso até o fim do período pago.'
        }));

    } catch (e: any) {
        console.error('[SUBSCRIPTION CANCEL] Erro:', e);
        return addCorsHeaders(req, NextResponse.json({ error: e.message }, { status: 500 }));
    }
}
