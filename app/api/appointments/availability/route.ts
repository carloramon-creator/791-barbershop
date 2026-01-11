
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { addMinutes, format, parse, isBefore, isAfter, addDays, subDays } from 'date-fns';

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

        // 1. Fetch appointments for that day
        // Using strict ISO filtering to avoid timezone issues, assuming DB stores UTC or compatible
        // Widen range to catch appointments that might overlap due to timezone (e.g. GMT-3)
        const startDay = `${dateStr}T00:00:00Z`;
        const endDay = `${format(addDays(parse(dateStr, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd')}T23:59:59Z`;

        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenant.id)
            .eq('barber_id', barberId)
            .neq('status', 'cancelled')
            .gte('start_time', startDay)
            .lte('start_time', endDay);

        if (error) throw error;

        // 2. Fetch barber status for "offline" check
        const { data: barber, error: barberError } = await supabaseAdmin
            .from('barbers')
            .select('status')
            .eq('id', barberId)
            .single();

        if (barberError) throw barberError;

        const isTodayRequested = dateStr === format(new Date(), 'yyyy-MM-dd');
        const isOffline = isTodayRequested && barber?.status === 'offline';

        // 3. Generate slots
        const openingHours = (tenant as any).opening_hours || {
            work_days: [1, 2, 3, 4, 5, 6],
            start_time: '09:00',
            end_time: '19:00',
            days: null,
            lunch_start: '12:00',
            lunch_duration: 0,
            overtime_tolerance_percent: 0
        };

        const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        const dayOfWeek = baseDate.getDay();

        let startH, startM, endHour, endMin;

        if (openingHours.days && openingHours.days[dayOfWeek]) {
            const dayConfig = openingHours.days[dayOfWeek];
            if (!dayConfig.active) return NextResponse.json([]);
            [startH, startM] = (dayConfig.start || '09:00').split(':').map(Number);
            [endHour, endMin] = (dayConfig.end || '19:00').split(':').map(Number);
        } else {
            if (Array.isArray(openingHours.work_days) && !openingHours.work_days.includes(dayOfWeek)) {
                return NextResponse.json([]);
            }
            [startH, startM] = (openingHours.start_time || '09:00').split(':').map(Number);
            [endHour, endMin] = (openingHours.end_time || '19:00').split(':').map(Number);
        }

        const workStart = new Date(baseDate); workStart.setHours(startH, startM, 0, 0);
        const workEnd = new Date(baseDate); workEnd.setHours(endHour, endMin, 0, 0);

        // Lunch logic
        const [lH, lM] = (openingHours.lunch_start || '12:00').split(':').map(Number);
        const lunchStart = new Date(baseDate); lunchStart.setHours(lH, lM, 0, 0);
        const lunchEnd = addMinutes(lunchStart, Number(openingHours.lunch_duration || 0));

        const slots: any[] = [];
        let current = workStart;

        while (current < workEnd) {
            const slotEnd = addMinutes(current, duration);
            let status: 'available' | 'occupied' | 'lunch' | 'offline' = 'available';

            let exceedsWorkHours = isAfter(slotEnd, workEnd);
            if (exceedsWorkHours) {
                const tolerance = Number(openingHours.overtime_tolerance_percent || 0);
                if (tolerance > 0 && current < workEnd) {
                    const remainingMs = workEnd.getTime() - current.getTime();
                    const excessMs = slotEnd.getTime() - workEnd.getTime();
                    if (remainingMs > 0 && (excessMs / remainingMs) * 100 <= tolerance) {
                        exceedsWorkHours = false;
                    }
                }
                if (exceedsWorkHours) break;
            }

            if (isOffline) {
                status = 'offline';
            } else if (openingHours.lunch_duration > 0 && current < lunchEnd && slotEnd > lunchStart) {
                status = 'lunch';
            } else {
                const isOccupied = appointments?.some((apt: any) => {
                    const aptStart = new Date(apt.start_time);
                    const aptEnd = new Date(apt.end_time);
                    return (current < aptEnd && slotEnd > aptStart);
                });
                if (isOccupied) status = 'occupied';
            }

            slots.push({
                time: format(current, 'HH:mm'),
                status,
                available: status === 'available'
            });

            current = addMinutes(current, 30);
        }

        return NextResponse.json(slots);

    } catch (error: any) {
        console.error('Availability Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
