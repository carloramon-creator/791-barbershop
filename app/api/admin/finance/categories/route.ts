
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const client = await supabase();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'income' or 'expense'

        let query = client
            .from('holding_categories')
            .select('*')
            .order('name', { ascending: true });

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const client = await supabase();
        const { data: { user } } = await client.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const json = await req.json();
        const { name, type, color, parent_id, icon } = json;

        if (!name || !type) return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });

        const { data, error } = await client
            .from('holding_categories')
            .insert({
                name,
                type,
                color: color || '#94a3b8',
                parent_id: parent_id || null,
                icon,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
