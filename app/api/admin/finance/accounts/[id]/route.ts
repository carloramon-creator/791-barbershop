
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const client = await supabase();
        const { id } = await params;
        const { data: { user } } = await client.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const json = await req.json();

        // Handle Default Switch logic if needed
        if (json.is_default) {
            await client
                .from('holding_accounts')
                .update({ is_default: false })
                .neq('id', id);
        }

        const { data, error } = await client
            .from('holding_accounts')
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

        // Check for transactions (Prevent delete if used)
        const { count } = await client
            .from('holding_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', id);

        if (count && count > 0) {
            return NextResponse.json({ error: 'Cannot delete account with existing transactions. Deactivate it instead.' }, { status: 400 });
        }

        const { error } = await client
            .from('holding_accounts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
