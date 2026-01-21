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

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[ADMIN SUPPORT GET ERROR]', error);
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
