
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { addMinutes, format, parse, isBefore, isAfter, addDays, subDays, isSameDay } from 'date-fns';
import { getAvailableSlots } from '@/lib/availability-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get('date'); // YYYY-MM-DD
        const barberId = searchParams.get('barberId');
        const duration = parseInt(searchParams.get('duration') || '30');

        if (!dateStr || !barberId) {
            return NextResponse.json({ error: 'Missing date or barberId' }, { status: 400 });
        }

        // 1. Fetch appointments for that day (+/- 1 day to catch timezone overlaps GMT-3)
        const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        const startWindow = format(subDays(baseDate, 1), "yyyy-MM-dd'T'00:00:00'Z'");
        const endWindow = format(addDays(baseDate, 1), "yyyy-MM-dd'T'23:59:59'Z'");

        const { data: appointments, error } = await getSupabaseAdmin()
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenant.id)
            .eq('barber_id', barberId)
            .neq('status', 'cancelled')
            .gte('start_time', startWindow)
            .lte('start_time', endWindow);

        if (error) throw error;

        // 2. Fetch barber status for "offline" check
        const { data: barber, error: barberError } = await getSupabaseAdmin()
            .from('barbers')
            .select('status')
            .eq('id', barberId)
            .single();

        if (barberError) throw barberError;

        // 3. Obter slots usando o utilitário compartilhado
        const isTodayRequested = dateStr === format(new Date(), 'yyyy-MM-dd');

        const slots = getAvailableSlots(
            baseDate,
            appointments || [],
            tenant.opening_hours,
            duration,
            barber?.status,
            isTodayRequested
        );

        return NextResponse.json(slots);

        return NextResponse.json(slots);

    } catch (error: any) {
        console.error('Availability Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
