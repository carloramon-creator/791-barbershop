
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

        const { data: tenant } = await getSupabaseAdmin().from('tenants').select('opening_hours').eq('id', tenantId).single();

        const baseDate = new Date(); // Hoje
        // Forçar baseDate para 00:00 local
        baseDate.setHours(0, 0, 0, 0);

        const slots = getAvailableSlots(
            baseDate,
            [], // Sem agendamentos para testar apenas a geração de slots
            tenant.opening_hours,
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
