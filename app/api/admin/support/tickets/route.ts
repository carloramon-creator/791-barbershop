import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select(`
                *,
                tenants (
                    name
                ),
                user:users(name, nickname, email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('[ADMIN_SUPPORT_GET] Found tickets:', data?.length || 0);
        if (data && data.length > 0) {
            console.log('[ADMIN_SUPPORT_GET] Sample Ticket Tenant:', data[0].tenants?.name);
            console.log('[ADMIN_SUPPORT_GET] Sample Ticket User:', data[0].user?.nickname || data[0].user?.name);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[ADMIN SUPPORT GET ERROR]', error);

        // Fallback: Tenta buscar sem os JOINS caso o banco esteja desalinhado
        if (error.message?.includes('relationship')) {
            console.warn('[ADMIN_SUPPORT_GET] Fallback to direct select without joins');
            const { data: fallbackData } = await supabaseAdmin
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });
            return NextResponse.json(fallbackData || []);
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id, status, admin_notes } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'ID do ticket é obrigatório' }, { status: 400 });
        }

        const updates: any = {};
        if (status) updates.status = status;
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;

        if (status === 'closed') {
            updates.resolved_at = new Date().toISOString();
        }

        const { error } = await supabaseAdmin
            .from('support_tickets')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[ADMIN SUPPORT PATCH ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
