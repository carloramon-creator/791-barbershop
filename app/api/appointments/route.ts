import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Listar agendamentos (opcionalmente filtrados por data e barbeiro)
 */
export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date'); // YYYY-MM-DD
        const barberId = searchParams.get('barberId');

        let query = supabaseAdmin
            .from('appointments')
            .select('*, barbers(name, nickname)')
            .eq('tenant_id', tenant.id);

        if (date) {
            const start = `${date}T00:00:00Z`;
            const end = `${date}T23:59:59Z`;
            query = query.gte('start_time', start).lte('start_time', end);
        }

        if (barberId) {
            query = query.eq('barber_id', barberId);
        }

        const { data, error } = await query.order('start_time', { ascending: true });

        if (error) throw error;

        // Flatten data to include barber name/nickname directly
        const flattened = data.map((appt: any) => ({
            ...appt,
            barber_name: appt.barbers?.name,
            barber_nickname: appt.barbers?.nickname
        }));

        return NextResponse.json(flattened);
    } catch (error: any) {
        console.error('[APPOINTMENTS GET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Criar novo agendamento
 */
export async function POST(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const payload = await req.json();

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert({
                ...payload,
                tenant_id: tenant.id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[APPOINTMENTS POST ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
