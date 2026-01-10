import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Listar produtos utilizados em um serviço
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: serviceId } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();

        const { data, error } = await supabaseAdmin
            .from('service_products')
            .select('product_id, products(id, name, price, category_id)')
            .eq('service_id', serviceId);

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[SERVICE PRODUCTS GET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Atualizar produtos de um serviço (substitui todos)
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: serviceId } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { productIds } = await req.json();

        // Verificar se o serviço pertence ao tenant
        const { data: service } = await supabaseAdmin
            .from('services')
            .select('id')
            .eq('id', serviceId)
            .eq('tenant_id', tenant.id)
            .single();

        if (!service) {
            return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
        }

        // Remover produtos antigos
        await supabaseAdmin
            .from('service_products')
            .delete()
            .eq('service_id', serviceId);

        // Adicionar novos produtos
        if (productIds && productIds.length > 0) {
            const inserts = productIds.map((productId: string) => ({
                service_id: serviceId,
                product_id: productId
            }));

            const { error } = await supabaseAdmin
                .from('service_products')
                .insert(inserts);

            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[SERVICE PRODUCTS PUT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
