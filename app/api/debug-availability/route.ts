
import { NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/availability-utils';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenantId');
        const barberId = searchParams.get('barberId');

        if (!tenantId || !barberId) return NextResponse.json({ error: 'Missing params' });

        const now = new Date();
        const nowBRT = new Date(now.getTime() - 3 * 60 * 60 * 1000);

        const debugInfo: any = {
            serverTimeUTC: now.toISOString(),
            serverTimeLocalStr: now.toString(),
            calculatedBRT: nowBRT.toISOString(),
            rawSlots: []
        };

        const { data: tenant } = await getSupabaseAdmin().from('tenants').select('opening_hours, id').eq('id', tenantId).single();

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' });

        const baseDate = new Date(); // Hoje
        baseDate.setHours(0, 0, 0, 0);

        // Buscar agendamentos reais
        const startWindow = new Date(baseDate); startWindow.setDate(startWindow.getDate() - 1);
        const endWindow = new Date(baseDate); endWindow.setDate(endWindow.getDate() + 1);

        const { data: appointments } = await getSupabaseAdmin()
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenant.id)
            .eq('barber_id', barberId)
            .neq('status', 'cancelled')
            .gte('start_time', startWindow.toISOString())
            .lte('start_time', endWindow.toISOString());

        debugInfo.realAppointments = appointments;

        const slots = getAvailableSlots(
            baseDate,
            appointments || [],
            tenant.opening_hours || {},
            30,
            'available',
            true // isToday = true
        );

        debugInfo.slots = slots;

        return NextResponse.json(debugInfo);
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
