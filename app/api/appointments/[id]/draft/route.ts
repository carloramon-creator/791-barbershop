import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function POST(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;

    try {
        const body = await req.json();
        const { items } = body; // items: SelectedItem[]

        if (!items) {
            return NextResponse.json({ error: 'Itens não fornecidos' }, { status: 400 });
        }

        const { error } = await supabaseClient
            .from('appointments')
            .update({ draft_items: items })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
