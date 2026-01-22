
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const client = await supabase();
        const { id } = await params;
        const { data: { user } } = await client.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const json = await req.json();

        const { data, error } = await client
            .from('holding_categories')
            .update(json)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const client = await supabase();
        const { id } = await params;
        const { data: { user } } = await client.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check usage in transactions
        const { count } = await client
            .from('holding_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (count && count > 0) {
            return NextResponse.json({ error: 'Cannot delete category in use.' }, { status: 400 });
        }

        // Check usage in subcategories
        const { count: subCount } = await client
            .from('holding_categories')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', id);

        if (subCount && subCount > 0) {
            return NextResponse.json({ error: 'Cannot delete category that has subcategories.' }, { status: 400 });
        }

        const { error } = await client
            .from('holding_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
