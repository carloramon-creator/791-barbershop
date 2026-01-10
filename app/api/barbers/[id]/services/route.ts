import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Listar serviços que um barbeiro pode executar
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: barberId } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();

        const { data, error } = await supabaseAdmin
            .from('barber_services')
            .select('service_id, services(id, name, price, duration_minutes)')
            .eq('barber_id', barberId);

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[BARBER SERVICES GET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Atualizar serviços que um barbeiro pode executar (substitui todos)
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: barberId } = await params;
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { serviceIds } = await req.json();

        // Verificar se o barbeiro pertence ao tenant
        const { data: barber } = await supabaseAdmin
            .from('barbers')
            .select('id')
            .eq('id', barberId)
            .eq('tenant_id', tenant.id)
            .single();

        if (!barber) {
            return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });
        }

        // Remover serviços antigos
        await supabaseAdmin
            .from('barber_services')
            .delete()
            .eq('barber_id', barberId);

        // Adicionar novos serviços
        if (serviceIds && serviceIds.length > 0) {
            const inserts = serviceIds.map((serviceId: string) => ({
                barber_id: barberId,
                service_id: serviceId
            }));

            const { error } = await supabaseAdmin
                .from('barber_services')
                .insert(inserts);

            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[BARBER SERVICES PUT ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
