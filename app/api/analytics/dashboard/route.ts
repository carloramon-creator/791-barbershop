import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';

export async function GET(req: Request) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'today'; // today, week, fortnight, month

        // Ajuste robusto de fuso horário para o Dashboard (Brasília -03:00)
        // O dia em Brasília começa às 03:00:00 UTC.

        const now = new Date();
        const startOfTodayUTC = startOfDay(now);
        const brStartOfDay = new Date(startOfTodayUTC);
        brStartOfDay.setUTCHours(3);

        // Se agora for antes das 03:00 UTC, o dia de hoje (em Brasília) ainda é o dia anterior UTC.
        if (now < brStartOfDay) {
            brStartOfDay.setUTCDate(brStartOfDay.getUTCDate() - 1);
        }

        let startDate = new Date(brStartOfDay);
        const endDate = new Date(brStartOfDay);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        endDate.setUTCHours(2, 59, 59, 999); // Fim do dia em Brasília (02:59:59 UTC do dia seguinte)

        if (period === 'week') startDate = subWeeks(startDate, 1);
        else if (period === 'fortnight') startDate = subDays(startDate, 15);
        else if (period === 'month') startDate = subMonths(startDate, 1);

        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        console.log(`[DASHBOARD DEBUG] Period: ${period} | Range: ${startIso} to ${endIso}`);

        // 1. Faturamento no período (Consolidado: sales + vendas)
        // Otimizado: somando via rpc ou pelo menos reduzindo tráfego
        const [salesRes, vendasRes] = await Promise.all([
            getSupabaseAdmin()
                .from('sales')
                .select('total_amount')
                .eq('tenant_id', tenant.id)
                .gte('created_at', startIso)
                .lte('created_at', endIso),
            getSupabaseAdmin()
                .from('vendas')
                .select('total')
                .eq('tenant_id', tenant.id)
                .gte('created_at', startIso)
                .lte('created_at', endIso)
        ]);

        if (salesRes.error) throw salesRes.error;
        if (vendasRes.error) throw vendasRes.error;

        const salesTotal = salesRes.data?.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0) || 0;
        const vendasTotal = vendasRes.data?.reduce((acc, v) => acc + (Number(v.total) || 0), 0) || 0;
        const totalBilling = salesTotal + vendasTotal;

        // 2. Total de atendimentos feitos (finished)
        const { count: servicesDone, error: queueError } = await getSupabaseAdmin()
            .from('client_queue')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id)
            .eq('status', 'finished')
            .gte('finished_at', startIso)
            .lte('finished_at', endIso);

        if (queueError) throw queueError;

        // 3. Média de espera entre todos os atendidos (started_at - created_at)
        const { data: servedClients, error: servedError } = await getSupabaseAdmin()
            .from('client_queue')
            .select('created_at, started_at')
            .eq('tenant_id', tenant.id)
            .eq('status', 'finished')
            .not('started_at', 'is', null)
            .gte('finished_at', startIso)
            .lte('finished_at', endIso);

        if (servedError) throw servedError;

        let avgWaitTime = 0;
        if (servedClients && servedClients.length > 0) {
            const totalWait = servedClients.reduce((acc, c) => {
                const wait = (new Date(c.started_at!).getTime() - new Date(c.created_at).getTime()) / 60000;
                return acc + wait;
            }, 0);
            avgWaitTime = Math.round(totalWait / servedClients.length);
        }

        return NextResponse.json({
            totalBilling,
            servicesDone: servicesDone || 0,
            avgWaitTime,
            period
        });
    } catch (error: any) {
        console.error('[DASHBOARD METRICS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
