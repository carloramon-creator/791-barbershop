import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

export async function GET(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const businessUnit = searchParams.get('businessUnit');

        let query = supabaseAdmin
            .from('system_finance_records')
            .select('*')
            .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (businessUnit && businessUnit !== 'all') query = query.eq('business_unit', businessUnit);

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[HOLDING FINANCE GET] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const payload = await req.json();

        const { data, error } = await supabaseAdmin
            .from('system_finance_records')
            .insert({
                ...payload,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[HOLDING FINANCE POST] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { isSystemAdmin } = await getCurrentUserAndTenant();
        if (!isSystemAdmin) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) throw new Error('ID não informado');

        const { error } = await supabaseAdmin
            .from('system_finance_records')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[HOLDING FINANCE DELETE] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
