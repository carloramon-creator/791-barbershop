import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET() {
    try {
        const { user, tenantId, role } = await getCurrentUserAndTenant();

        let query = supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                user:users(name, nickname, email)
            `)
            .order('created_at', { ascending: false });

        // Se for dono, vê tudo da barbearia. Se não, vê só o que ele abriu.
        if (role === 'owner') {
            query = query.eq('tenant_id', tenantId);
        } else {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[SUPPORT GET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { user, tenantId } = await getCurrentUserAndTenant();
        const payload = await req.json();
        const { type, message, context } = payload;

        if (!type || !message) {
            return NextResponse.json({ error: 'Tipo e mensagem são obrigatórios' }, { status: 400 });
        }

        // Insert into database
        const { error } = await supabaseAdmin
            .from('support_tickets')
            .insert({
                type,
                message,
                tenant_id: tenantId,
                user_id: user.id,
                context: {
                    ...context,
                    serverTime: new Date().toISOString()
                },
                status: 'open'
            });

        if (error) {
            console.error('[SUPPORT TICKET ERROR]', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API SUPPORT ERROR]', error);
        return NextResponse.json({
            error: error.message || 'Erro ao processar chamado'
        }, { status: 500 });
    }
}
