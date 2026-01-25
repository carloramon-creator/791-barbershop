import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function POST(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;

    try {
        const { tenant } = await getCurrentUserAndTenant();
        const body = await req.json();
        const { items } = body;

        if (!items) {
            return NextResponse.json({ error: 'Itens não fornecidos' }, { status: 400 });
        }

        const { error } = await getSupabaseAdmin()
            .from('appointments')
            .update({ draft_items: items })
            .eq('id', id)
            .eq('tenant_id', tenant.id); // Security check

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
