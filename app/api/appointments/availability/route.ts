
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { addMinutes, format, parse, isBefore, isAfter } from 'date-fns';

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
        const startDay = `${dateStr}T00:00:00`;
        const endDay = `${dateStr}T23:59:59`;

        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenant.id)
            .eq('barber_id', barberId)
            .neq('status', 'cancelled')
            .gte('start_time', startDay)
            .lte('start_time', endDay);

        if (error) throw error;

        // 2. Generate slots
        // Parse opening hours from tenant or use defaults
        const openingHours = (tenant as any).opening_hours || {
            work_days: [1, 2, 3, 4, 5, 6],
            start_time: '09:00',
            end_time: '19:00',
            days: null
        };

        const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        const dayOfWeek = baseDate.getDay(); // 0=Sun, 6=Sat

        let startH, startM, endHour, endMin;

        // NEW LOGIC: Check for per-day configuration first
        if (openingHours.days && openingHours.days[dayOfWeek]) {
            const dayConfig = openingHours.days[dayOfWeek];

            if (!dayConfig.active) {
                return NextResponse.json([]); // Closed specific day
            }

            [startH, startM] = (dayConfig.start || '09:00').split(':').map(Number);
            [endHour, endMin] = (dayConfig.end || '19:00').split(':').map(Number);
        }
        // FALLBACK LOGIC: Global configuration
        else {
            if (Array.isArray(openingHours.work_days) && !openingHours.work_days.includes(dayOfWeek)) {
                return NextResponse.json([]); // Closed globally
            }
            [startH, startM] = (openingHours.start_time || '09:00').split(':').map(Number);
            // Fix previous typo/bug where end time was using start_time fallback
            [endHour, endMin] = (openingHours.end_time || '19:00').split(':').map(Number);
        }

        const workStart = new Date(baseDate); workStart.setHours(startH, startM, 0, 0);
        const workEnd = new Date(baseDate); workEnd.setHours(endHour, endMin, 0, 0);


        const slots: string[] = [];
        let current = workStart;

        // Generate candidates every 30 minutes
        while (current < workEnd) {
            const slotEnd = addMinutes(current, duration);

            // Check if slot exceeds working hours
            let exceedsWorkHours = isAfter(slotEnd, workEnd);

            if (exceedsWorkHours) {
                const tolerance = Number(openingHours.overtime_tolerance_percent || 0);

                // Only evaluate tolerance if configured and if the slot starts BEFORE closing time
                if (tolerance > 0 && current < workEnd) {
                    const remainingMs = workEnd.getTime() - current.getTime(); // Time left until close
                    const excessMs = slotEnd.getTime() - workEnd.getTime();    // Time exceeding close

                    if (remainingMs > 0) { // Avoid division by zero if current is exactly workEnd
                        const ratio = (excessMs / remainingMs) * 100;
                        // Example: 20min excess / 30min remaining = 66.6%. If tolerance is 70, it passes.
                        if (ratio <= tolerance) {
                            exceedsWorkHours = false; // Authorized by tolerance
                        }
                    }
                }

                // If still exceeding (or tolerance logic failed), stop generating slots
                if (exceedsWorkHours) break;
            }

            // Check collision
            const isOccupied = appointments?.some((apt: any) => {
                const aptStart = new Date(apt.start_time);
                const aptEnd = new Date(apt.end_time);

                // Basic Overlap logic: (StartA < EndB) and (EndA > StartB)
                // Note: 'current' is StartA, 'slotEnd' is EndA
                return (current < aptEnd && slotEnd > aptStart);
            });

            if (!isOccupied) {
                slots.push(format(current, 'HH:mm'));
            }

            // Increment 30 mins for next possible start time
            current = addMinutes(current, 30);
        }

        return NextResponse.json(slots);

    } catch (error: any) {
        console.error('Availability Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
