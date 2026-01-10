import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Atualizar categoria
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { name } = await req.json();

        const { data, error } = await supabaseAdmin
            .from('product_categories')
            .update({ name })
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[PRODUCT CATEGORY PATCH ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Excluir categoria
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();

        const { error } = await supabaseAdmin
            .from('product_categories')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[PRODUCT CATEGORY DELETE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
