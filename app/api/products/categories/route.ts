import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Listar categorias de produtos
 */
export async function GET() {
    try {
        const { tenant } = await getCurrentUserAndTenant();

        const { data, error } = await getSupabaseAdmin()
            .from('product_categories')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('name');

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[PRODUCT CATEGORIES GET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Criar nova categoria
 */
export async function POST(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
        }

        const { data, error } = await getSupabaseAdmin()
            .from('product_categories')
            .insert({
                tenant_id: tenant.id,
                name
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[PRODUCT CATEGORIES POST ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
