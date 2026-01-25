import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addCorsHeaders, resolveTenantId } from '@/lib/server-utils';

export async function OPTIONS(req: Request) {
    return addCorsHeaders(req, new NextResponse(null, { status: 200 }));
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Slug não fornecido' }, { status: 400 }));
        }

        const tenantId = await resolveTenantId(slug);
        if (!tenantId) {
            return addCorsHeaders(req, NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 }));
        }

        const { data, error } = await getSupabaseAdmin()
            .from('barbers')
            .select('*, users(photo_url, name, nickname), barber_services(service_id)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        // Formatar para resposta limpa
        // Buscar contagem da fila para cada barbeiro
        const { data: queueCounts, error: queueError } = await getSupabaseAdmin()
            .from('client_queue')
            .select('barber_id')
            .eq('status', 'waiting')
            .eq('tenant_id', tenantId);

        // Mapa de contagem
        const queueMap = new Map();
        if (queueCounts) {
            queueCounts.forEach((q: any) => {
                queueMap.set(q.barber_id, (queueMap.get(q.barber_id) || 0) + 1);
            });
        }

        // Formatar para resposta limpa
        const formatted = data?.map(b => {
            const peopleWaiting = queueMap.get(b.id) || 0;
            const avgTime = b.avg_time_minutes || 30; // Default 30 min

            return {
                id: b.id,
                name: b.name || (b as any).users?.name,
                nickname: b.nickname || (b as any).users?.nickname,
                photo_url: (b as any).users?.photo_url || b.photo_url,
                // Status online/offline baseado em status para consistência com dashboard
                is_online: b.status === 'available' || b.status === 'busy',
                status: b.status, // available, busy, offline
                people_waiting: peopleWaiting,
                estimated_wait: peopleWaiting * avgTime,
                service_ids: (b as any).barber_services?.map((bs: any) => bs.service_id) || []
            };
        }) || [];

        return addCorsHeaders(req, NextResponse.json(formatted));
    } catch (error: any) {
        return addCorsHeaders(req, NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
