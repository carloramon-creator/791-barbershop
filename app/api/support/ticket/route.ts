import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET() {
    try {
        const { user, tenantId, role } = await getCurrentUserAndTenant();

        console.log(`[SUPPORT GET] Fetching history for user ${user.id} (${user.email}), role: ${role}, tenant: ${tenantId}`);

        let query = supabaseAdmin
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        // Se for dono, vê tudo da barbearia. Se não, vê só o que ele abriu.
        if (role === 'owner') {
            query = query.eq('tenant_id', tenantId);
        } else {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        console.log(`[SUPPORT GET] Found ${data?.length || 0} tickets`);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[SUPPORT GET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
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
                tenant_id: context?.tenantId,
                user_id: context?.userId,
                context: {
                    ...context,
                    timestamp: new Date().toISOString()
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
