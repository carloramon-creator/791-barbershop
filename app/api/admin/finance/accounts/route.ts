
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const client = await supabase();
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await client
            .from('holding_accounts')
            .select('*')
            .order('is_default', { ascending: false })
            .order('name', { ascending: true });

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

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const json = await req.json();
        const { name, type, bank_name, is_default } = json;

        // Validations
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        // If is_default is true, uncheck others? Assuming DB trigger or frontend logic handling, 
        // but explicit update here is safer.
        if (is_default) {
            await client
                .from('holding_accounts')
                .update({ is_default: false })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
        }

        const { data, error } = await client
            .from('holding_accounts')
            .insert({
                name,
                type: type || 'checking',
                bank_name,
                is_default: !!is_default,
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
