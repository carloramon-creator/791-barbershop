import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Atualizar agendamento
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { id: _, tenant_id: __, created_at: ___, ...updates } = await req.json();

        const { data, error } = await getSupabaseAdmin()
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[APPOINTMENTS PUT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Excluir agendamento
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();

        const { error } = await getSupabaseAdmin()
            .from('appointments')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[APPOINTMENTS DELETE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
