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
            .select('*, barbers(name, nickname, user_id)')
            .eq('tenant_id', tenant.id)
            .neq('status', 'cancelled');

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

        // Flatten data and include barber details
        const flattened = data.map((appt: any) => ({
            ...appt,
            barber_name: appt.barbers?.name,
            barber_nickname: appt.barbers?.nickname,
            barber_user_id: appt.barbers?.user_id
        }));

        // Fetch client photos for these appointments
        const phones = Array.from(new Set(flattened.map(a => a.client_phone).filter(Boolean)));
        if (phones.length > 0) {
            const { data: clients } = await supabaseAdmin
                .from('clients')
                .select('phone, photo_url')
                .eq('tenant_id', tenant.id)
                .in('phone', phones);

            if (clients) {
                const photoMap = Object.fromEntries(clients.map(c => [c.phone, c.photo_url]));
                flattened.forEach(a => {
                    if (a.client_phone) a.client_photo = photoMap[a.client_phone];
                });
            }
        }

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

        // 1. Basic Validation
        if (!payload.barber_id || !payload.start_time || !payload.end_time) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
        }

        // 2. Overlap Check (Strict Backend Guard)
        // Check for any appointment for the SAME barber that overlaps with the NEW one
        const { data: overlaps, error: overlapError } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('barber_id', payload.barber_id)
            .neq('status', 'cancelled')
            .lt('start_time', payload.end_time) // Start existing < End new
            .gt('end_time', payload.start_time)  // End existing > Start new
            .limit(1);

        if (overlapError) throw overlapError;
        if (overlaps && overlaps.length > 0) {
            return NextResponse.json({ error: 'Este horário já foi preenchido. Por favor, escolha outro.' }, { status: 409 });
        }

        // 3. Insert
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
