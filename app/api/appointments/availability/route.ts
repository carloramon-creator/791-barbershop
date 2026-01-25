
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
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

        // Priority 1: Individual Day config (Handle both number and string keys from Supabase)
        const dayConfig = openingHours.days ? (openingHours.days[dayOfWeek] || openingHours.days[String(dayOfWeek)]) : null;

        if (dayConfig) {
            if (!dayConfig.active) {
                console.log(`Day ${dayOfWeek} is inactive for tenant ${tenant.id}`);
                return NextResponse.json([]);
            }
            [startH, startM] = (dayConfig.start || '09:00').split(':').map(Number);
            [endHour, endMin] = (dayConfig.end || '19:00').split(':').map(Number);
        } else {
            // Priority 2: Generic Work Days
            const workDays = Array.isArray(openingHours.work_days) ? openingHours.work_days.map(Number) : [1, 2, 3, 4, 5, 6];
            if (!workDays.includes(dayOfWeek)) {
                console.log(`Day ${dayOfWeek} not in workDays [${workDays}] for tenant ${tenant.id}`);
                return NextResponse.json([]);
            }
            [startH, startM] = (openingHours.start_time || '09:00').split(':').map(Number);
            [endHour, endMin] = (openingHours.end_time || '19:00').split(':').map(Number);
        }

        const workStart = new Date(baseDate); workStart.setHours(startH, startM, 0, 0);
        const workEnd = new Date(baseDate); workEnd.setHours(endHour, endMin, 0, 0);

        // 4. Normalize appointments to Local Clock Time (GMT-3 / Brazil)
        const normalizedAppointments = appointments?.map((apt: any) => {
            const startUTC = new Date(apt.start_time);
            const endUTC = new Date(apt.end_time);

            // Adjust to Brazil Wall Clock Time (-3h)
            const startBr = new Date(startUTC.getTime() - (3 * 60 * 60 * 1000));

            // Components for grid comparison
            const h = startBr.getUTCHours();
            const m = startBr.getUTCMinutes();

            // Represent this appointment on the target date grid (baseDate is 00:00:00 of requested date)
            const startGrid = new Date(baseDate);
            startGrid.setHours(h, m, 0, 0);

            const durationMin = Math.round((endUTC.getTime() - startUTC.getTime()) / 60000);
            const endGrid = addMinutes(startGrid, durationMin);

            // Check if THIS instance belongs to the requested day IN Brazil
            const isSameDayInBR =
                startBr.getUTCFullYear() === baseDate.getFullYear() &&
                startBr.getUTCMonth() === baseDate.getMonth() &&
                startBr.getUTCDate() === baseDate.getDate();

            return { start: startGrid, end: endGrid, isSameDayInBR };
        }).filter(a => a.isSameDayInBR) || [];

        // 5. Lunch Logic - DYNAMIC DISPLACEMENT
        let effLunchStart = new Date(baseDate);
        const [lH, lM] = (openingHours.lunch_start || '12:00').split(':').map(Number);
        effLunchStart.setHours(lH, lM, 0, 0);
        let effLunchEnd = addMinutes(effLunchStart, Number(openingHours.lunch_duration || 0));

        if (Number(openingHours.lunch_duration) > 0) {
            // Check if there is an appointment blocking the start of lunch, if so, push lunch
            // Note: date-fns compare is safer
            const blockingApt = normalizedAppointments.find(apt =>
                (apt.start.getTime() <= effLunchStart.getTime() && apt.end.getTime() > effLunchStart.getTime())
            );
            if (blockingApt) {
                effLunchStart = new Date(blockingApt.end);
                // Re-calculate end based on duration
                effLunchEnd = addMinutes(effLunchStart, Number(openingHours.lunch_duration));
            }
        }

        console.log(`[AVAILABILITY] Tenant: ${tenant.id}, Date: ${dateStr}, Duration: ${duration}`);
        console.log(`[AVAILABILITY] Work: ${startH}:${startM} - ${endHour}:${endMin}`);
        console.log(`[AVAILABILITY] Lunch: ${format(effLunchStart, 'HH:mm')} - ${format(effLunchEnd, 'HH:mm')} (Dur: ${openingHours.lunch_duration})`);

        const slots: any[] = [];
        let current = workStart;
        const safeDuration = duration > 0 ? duration : 30; // Evitar loop infinito ou erros se duration for 0

        while (current < workEnd) {
            const slotEnd = addMinutes(current, safeDuration);
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
            else if (openingHours.lunch_duration > 0 &&
                (current.getTime() >= effLunchStart.getTime() && current.getTime() < effLunchEnd.getTime())) {
                // Bloqueia se o slot INICIA durante o horário de almoço
                status = 'lunch';
            }
            else {
                const isOccupied = normalizedAppointments.some((apt: any) => {
                    // Overlap check: Current slot overlaps with an existing appointment
                    return (current.getTime() < apt.end.getTime() && slotEnd.getTime() > apt.start.getTime());
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
