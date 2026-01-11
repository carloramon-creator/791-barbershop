
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { addMinutes, format, parse, isBefore, isAfter, addDays, subDays, isSameDay } from 'date-fns';

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

        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenant.id)
            .eq('barber_id', barberId)
            .neq('status', 'cancelled')
            .gte('start_time', startWindow)
            .lte('start_time', endWindow);

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

        // 3. Generate slots base config with deep merging defaults
        const rawOpeningHours = (tenant as any).opening_hours || {};
        const openingHours = {
            work_days: [1, 2, 3, 4, 5, 6],
            start_time: '09:00',
            end_time: '19:00',
            lunch_start: '12:00',
            lunch_duration: 0,
            overtime_tolerance_percent: 0,
            ...rawOpeningHours,
            days: rawOpeningHours.days || null
        };

        const dayOfWeek = baseDate.getDay(); // 0=Sun, 1=Mon...
        let startH, startM, endHour, endMin;

        // Priority 1: Individual Day config
        if (openingHours.days && openingHours.days[dayOfWeek]) {
            const dayConfig = openingHours.days[dayOfWeek];
            if (!dayConfig.active) {
                console.log(`Day ${dayOfWeek} is inactive for tenant ${tenant.id}`);
                return NextResponse.json([]);
            }
            [startH, startM] = (dayConfig.start || '09:00').split(':').map(Number);
            [endHour, endMin] = (dayConfig.end || '19:00').split(':').map(Number);
        } else {
            // Priority 2: Generic Work Days
            const workDays = Array.isArray(openingHours.work_days) ? openingHours.work_days : [1, 2, 3, 4, 5, 6];
            if (!workDays.includes(dayOfWeek)) {
                console.log(`Day ${dayOfWeek} not in workDays [${workDays}] for tenant ${tenant.id}`);
                return NextResponse.json([]);
            }
            [startH, startM] = (openingHours.start_time || '09:00').split(':').map(Number);
            [endHour, endMin] = (openingHours.end_time || '19:00').split(':').map(Number);
        }

        const workStart = new Date(baseDate); workStart.setHours(startH, startM, 0, 0);
        const workEnd = new Date(baseDate); workEnd.setHours(endHour, endMin, 0, 0);

        // 4. Normalize appointments to Local Clock Time (GMT-3)
        const normalizedAppointments = appointments?.map((apt: any) => {
            const date = new Date(apt.start_time);

            // Adjust to Brazil time (-3h) for clock-time comparison
            const brTime = new Date(date.getTime() - (3 * 60 * 60 * 1000));

            const start = new Date(baseDate);
            start.setHours(brTime.getUTCHours(), brTime.getUTCMinutes(), 0, 0);

            const durationMs = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();
            const end = addMinutes(start, durationMs / 60000);
            return { start, end };
        }).filter(apt => isSameDay(apt.start, baseDate)) || [];

        // 5. Lunch Logic - DYNAMIC DISPLACEMENT
        let effLunchStart = new Date(baseDate);
        const [lH, lM] = (openingHours.lunch_start || '12:00').split(':').map(Number);
        effLunchStart.setHours(lH, lM, 0, 0);
        let effLunchEnd = addMinutes(effLunchStart, Number(openingHours.lunch_duration || 0));

        // If an appointment overlaps the NOMINAL start of lunch, push lunch to after that appointment.
        if (openingHours.lunch_duration > 0) {
            const blockingApt = normalizedAppointments.find(apt =>
                apt.start <= effLunchStart && apt.end > effLunchStart
            );
            if (blockingApt) {
                effLunchStart = new Date(blockingApt.end);
                effLunchEnd = addMinutes(effLunchStart, Number(openingHours.lunch_duration));
            }
        }

        const slots: any[] = [];
        let current = workStart;

        while (current < workEnd) {
            const slotEnd = addMinutes(current, duration);
            let status: 'available' | 'occupied' | 'lunch' | 'offline' = 'available';

            // Work hours check
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

            // Status decision
            if (isOffline) {
                status = 'offline';
            }
            else if (openingHours.lunch_duration > 0 && current < effLunchEnd && slotEnd > effLunchStart) {
                status = 'lunch';
            }
            else {
                const isOccupied = normalizedAppointments.some((apt: any) => {
                    return (current < apt.end && slotEnd > apt.start);
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
