import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * CRUD de Vouchers da Barbearia
 */
export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('clientId');

        let query = getSupabaseAdmin()
            .from('client_vouchers')
            .select(`
                *,
                clients (
                    name
                )
            `)
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        }

        const { data: vouchers, error } = await query;
        if (error) throw error;

        return NextResponse.json(vouchers || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { tenant, user } = await getCurrentUserAndTenant();
        const body = await req.json();
        const { client_id, code, discount_type, discount_value, expires_at, is_birthday } = body;

        const { data: voucher, error } = await getSupabaseAdmin()
            .from('client_vouchers')
            .insert({
                tenant_id: tenant.id,
                client_id,
                code: code.toUpperCase(),
                discount_type,
                discount_value,
                expires_at,
                is_birthday: is_birthday || false
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(voucher);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });

        const { error } = await getSupabaseAdmin()
            .from('client_vouchers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenant.id);

        if (error) throw error;

        return NextResponse.json({ message: 'Voucher removido' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
