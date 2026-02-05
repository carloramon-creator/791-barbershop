import { addMinutes, format, isAfter, subHours } from 'date-fns';

export interface TimeSlot {
    time: string;
    status: 'available' | 'occupied' | 'lunch' | 'offline';
    available: boolean;
}

export interface AppointmentRange {
    start_time: string;
    end_time: string;
}

export function getAvailableSlots(
    baseDate: Date,
    appointments: AppointmentRange[],
    openingHours: any,
    duration: number,
    barberStatus?: string,
    isToday: boolean = false
): TimeSlot[] {
    const rawOpeningHours = openingHours || {};
    const config = {
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

    const dayConfig = config.days ? (config.days[dayOfWeek] || config.days[String(dayOfWeek)]) : null;

    if (dayConfig) {
        if (!dayConfig.active) return [];
        [startH, startM] = (dayConfig.start || '09:00').split(':').map(Number);
        [endHour, endMin] = (dayConfig.end || '19:00').split(':').map(Number);
    } else {
        const workDays = Array.isArray(config.work_days) ? config.work_days.map(Number) : [1, 2, 3, 4, 5, 6];
        if (!workDays.includes(dayOfWeek)) return [];
        [startH, startM] = (config.start_time || '09:00').split(':').map(Number);
        [endHour, endMin] = (config.end_time || '19:00').split(':').map(Number);
    }

    const workStart = new Date(baseDate); workStart.setHours(startH, startM, 0, 0);
    const workEnd = new Date(baseDate); workEnd.setHours(endHour, endMin, 0, 0);

    // Normalizar agendamentos para horário local (BR GMT-3)
    const normalizedAppointments = appointments?.map((apt: any) => {
        const startUTC = new Date(apt.start_time);
        const endUTC = new Date(apt.end_time);

        // Ajuste para hora oficial do Brasil (-3h)
        const startBr = subHours(startUTC, 3);
        const endBr = subHours(endUTC, 3);

        // Representar no grid do dia alvo
        const startGrid = new Date(baseDate);
        startGrid.setHours(startBr.getUTCHours(), startBr.getUTCMinutes(), 0, 0);

        const durationMin = Math.round((endUTC.getTime() - startUTC.getTime()) / 60000);
        const endGrid = addMinutes(startGrid, durationMin);

        const isSameDay =
            startBr.getUTCFullYear() === baseDate.getFullYear() &&
            startBr.getUTCMonth() === baseDate.getMonth() &&
            startBr.getUTCDate() === baseDate.getDate();

        return { start: startGrid, end: endGrid, isSameDay };
    }).filter(a => a.isSameDay) || [];

    // Almoço
    let effLunchStart = new Date(baseDate);
    const [lH, lM] = (config.lunch_start || '12:00').split(':').map(Number);
    effLunchStart.setHours(lH, lM, 0, 0);
    let effLunchEnd = addMinutes(effLunchStart, Number(config.lunch_duration || 0));

    if (Number(config.lunch_duration) > 0) {
        const blockingApt = normalizedAppointments.find(apt =>
            (apt.start.getTime() <= effLunchStart.getTime() && apt.end.getTime() > effLunchStart.getTime())
        );
        if (blockingApt) {
            effLunchStart = new Date(blockingApt.end);
            effLunchEnd = addMinutes(effLunchStart, Number(config.lunch_duration));
        }
    }

    const slots: TimeSlot[] = [];
    let current = workStart;

    // Para comparar corretamente, precisamos do "agora" no mesmo fuso que baseDate
    // baseDate é uma data local (sem timezone), então criamos "now" da mesma forma
    const nowUTC = new Date();
    const nowLocal = new Date(baseDate);
    nowLocal.setHours(nowUTC.getUTCHours() - 3, nowUTC.getUTCMinutes(), 0, 0); // Converte UTC para BRT (-3h)

    while (current < workEnd) {
        const slotEnd = addMinutes(current, duration);
        let status: 'available' | 'occupied' | 'lunch' | 'offline' = 'available';

        // Filtro de horários passados (se for hoje)
        if (isToday && current < nowLocal) {
            current = addMinutes(current, 30);
            continue;
        }

        let exceedsWorkHours = isAfter(slotEnd, workEnd);
        if (exceedsWorkHours) {
            const tolerance = Number(config.overtime_tolerance_percent || 0);
            if (tolerance > 0 && current < workEnd) {
                const remainingMs = workEnd.getTime() - current.getTime();
                const excessMs = slotEnd.getTime() - workEnd.getTime();
                if (remainingMs > 0 && (excessMs / remainingMs) * 100 <= tolerance) {
                    exceedsWorkHours = false;
                }
            }
            if (exceedsWorkHours) break;
        }

        if (isToday && barberStatus === 'offline') {
            status = 'offline';
        } else if (config.lunch_duration > 0 &&
            (current.getTime() >= effLunchStart.getTime() && current.getTime() < effLunchEnd.getTime())) {
            status = 'lunch';
        } else {
            const isOccupied = normalizedAppointments.some((apt: any) => {
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

    return slots;
}
