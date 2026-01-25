import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders, resolveTenantId } from '@/lib/server-utils';
import { addMinutes, format, parse, subDays, addDays, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        const dateStr = searchParams.get('date'); // YYYY-MM-DD
        const barberId = searchParams.get('barberId');
        const duration = parseInt(searchParams.get('duration') || '30');

        if (!slug || !dateStr || !barberId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Faltam parâmetros (slug, date ou barberId)' }, { status: 400 }));
        }

        const tenantId = await resolveTenantId(slug);
        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 }));
        }

        // Buscar dados do Tenant (Horários)
        const { data: tenant } = await getSupabaseAdmin()
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();

        if (!tenant) throw new Error('Dados da barbearia não localizados');

        // 1. Fetch appointments para o dia
        const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        const startWindow = format(subDays(baseDate, 1), "yyyy-MM-dd'T'00:00:00'Z'");
        const endWindow = format(addDays(baseDate, 1), "yyyy-MM-dd'T'23:59:59'Z'");

        const { data: appointments } = await getSupabaseAdmin()
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenantId)
            .eq('barber_id', barberId)
            .neq('status', 'cancelled')
            .gte('start_time', startWindow)
            .lte('start_time', endWindow);

        // 2. Fetch barber status
        const { data: barber } = await getSupabaseAdmin()
            .from('barbers')
            .select('status')
            .eq('id', barberId)
            .single();

        const isTodayRequested = dateStr === format(new Date(), 'yyyy-MM-dd');
        const isOffline = isTodayRequested && barber?.status === 'offline';

        // 3. Configuração de horários
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

        const dayOfWeek = baseDate.getDay();
        let startH, startM, endHour, endMin;

        const dayConfig = openingHours.days ? (openingHours.days[dayOfWeek] || openingHours.days[String(dayOfWeek)]) : null;

        if (dayConfig) {
            if (!dayConfig.active) return addCorsHeaders(req, NextResponse.json([]));
            [startH, startM] = (dayConfig.start || '09:00').split(':').map(Number);
            [endHour, endMin] = (dayConfig.end || '19:00').split(':').map(Number);
        } else {
            const workDays = Array.isArray(openingHours.work_days) ? openingHours.work_days.map(Number) : [1, 2, 3, 4, 5, 6];
            if (!workDays.includes(dayOfWeek)) return addCorsHeaders(req, NextResponse.json([]));
            [startH, startM] = (openingHours.start_time || '09:00').split(':').map(Number);
            [endHour, endMin] = (openingHours.end_time || '19:00').split(':').map(Number);
        }

        const workStart = new Date(baseDate); workStart.setHours(startH, startM, 0, 0);
        const workEnd = new Date(baseDate); workEnd.setHours(endHour, endMin, 0, 0);

        // 4. Normalizar compromissos
        const normalizedAppointments = appointments?.map((apt: any) => {
            const startUTC = new Date(apt.start_time);
            const endUTC = new Date(apt.end_time);
            const startBr = new Date(startUTC.getTime() - (3 * 60 * 60 * 1000));
            const startGrid = new Date(baseDate);
            startGrid.setHours(startBr.getUTCHours(), startBr.getUTCMinutes(), 0, 0);
            const durationMin = Math.round((endUTC.getTime() - startUTC.getTime()) / 60000);
            const endGrid = addMinutes(startGrid, durationMin);
            const isSameDayInBR = startBr.getUTCFullYear() === baseDate.getFullYear() && startBr.getUTCMonth() === baseDate.getMonth() && startBr.getUTCDate() === baseDate.getDate();
            return { start: startGrid, end: endGrid, isSameDayInBR };
        }).filter(a => a.isSameDayInBR) || [];

        // 5. Almoço com Deslocamento Dinâmico
        let effLunchStart = new Date(baseDate);
        const [lH, lM] = (openingHours.lunch_start || '12:00').split(':').map(Number);
        effLunchStart.setHours(lH, lM, 0, 0);
        let effLunchEnd = addMinutes(effLunchStart, Number(openingHours.lunch_duration || 0));

        if (Number(openingHours.lunch_duration) > 0) {
            // Se houver um agendamento que cruza o início do almoço, empurra o almoço para frente
            const blockingApt = normalizedAppointments.find(apt =>
                (apt.start.getTime() <= effLunchStart.getTime() && apt.end.getTime() > effLunchStart.getTime())
            );
            if (blockingApt) {
                effLunchStart = new Date(blockingApt.end);
                effLunchEnd = addMinutes(effLunchStart, Number(openingHours.lunch_duration));
            }
        }

        // 6. Gerar Slots
        const slots: any[] = [];
        let current = workStart;
        const safeDuration = duration > 0 ? duration : 30;

        while (current < workEnd) {
            const slotEnd = addMinutes(current, safeDuration);
            let status: 'available' | 'occupied' | 'lunch' | 'offline' = 'available';

            let exceedsWorkHours = isAfter(slotEnd, workEnd);
            if (exceedsWorkHours) {
                const tolerance = Number(openingHours.overtime_tolerance_percent || 0);
                if (tolerance > 0 && current < workEnd) {
                    const remainingMs = workEnd.getTime() - current.getTime();
                    const excessMs = slotEnd.getTime() - workEnd.getTime();
                    if (remainingMs > 0 && (excessMs / remainingMs) * 100 <= tolerance) exceedsWorkHours = false;
                }
                if (exceedsWorkHours) break;
            }

            if (isOffline) status = 'offline';
            else if (openingHours.lunch_duration > 0 &&
                (current.getTime() >= effLunchStart.getTime() && current.getTime() < effLunchEnd.getTime())) {
                // Bloqueia se o slot INICIA durante o horário de almoço
                status = 'lunch';
            } else {
                const isOccupied = normalizedAppointments.some((apt: any) => (current.getTime() < apt.end.getTime() && slotEnd.getTime() > apt.start.getTime()));
                if (isOccupied) status = 'occupied';
            }

            slots.push({ time: format(current, 'HH:mm'), status, available: status === 'available' });
            current = addMinutes(current, 30);
        }

        return addCorsHeaders(req, NextResponse.json(slots));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
