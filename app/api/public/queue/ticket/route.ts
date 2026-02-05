import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * Endpoint PÚBLICO para cliente consultar status do seu ticket.
 * Não requer autenticação.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ticketId = searchParams.get('id');

        if (!ticketId) {
            return NextResponse.json({ error: 'ID do ticket é obrigatório' }, { status: 400 });
        }

        // Buscar o ticket e o barbeiro
        const { data: ticket, error: ticketError } = await getSupabaseAdmin()
            .from('client_queue')
            .select(`
                *,
                clients (
                    photo_url,
                    name
                ),
                barbers (
                    id,
                    name,
                    avg_time_minutes,
                    users (
                        photo_url,
                        name,
                        nickname
                    )
                )
            `)
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
        }

        let realPosition = ticket.position;
        let estimatedWait = 0;
        const avgTime = ticket.barbers?.avg_time_minutes || 30;

        if (ticket.status === 'waiting') {
            const { count } = await getSupabaseAdmin()
                .from('client_queue')
                .select('*', { count: 'exact', head: true })
                .eq('barber_id', ticket.barber_id)
                .eq('status', 'waiting')
                .lt('position', ticket.position);

            realPosition = (count || 0) + 1;
            estimatedWait = (count || 0) * avgTime;

            // Adiciona o tempo restante de quem está na cadeira
            const { data: attendingItem } = await getSupabaseAdmin()
                .from('client_queue')
                .select('started_at')
                .eq('barber_id', ticket.barber_id)
                .eq('status', 'attending')
                .maybeSingle();

            if (attendingItem && attendingItem.started_at) {
                const elapsed = (new Date().getTime() - new Date(attendingItem.started_at).getTime()) / 60000;
                const remaining = Math.max(2, avgTime - elapsed);
                estimatedWait += Math.round(remaining);
            }
        } else if (ticket.status === 'attending' && ticket.started_at) {
            const elapsed = (new Date().getTime() - new Date(ticket.started_at).getTime()) / 60000;
            estimatedWait = Math.round(Math.max(2, avgTime - elapsed));
        }

        const barberData = ticket.barbers;
        const formattedBarber = barberData ? {
            id: barberData.id,
            name: barberData.users?.name || barberData.name,
            photo_url: barberData.users?.photo_url || (barberData as any).photo_url,
            avg_time_minutes: barberData.avg_time_minutes
        } : null;

        const rawName = ticket.clients?.name || ticket.client_name || 'Cliente';
        const nameParts = rawName.trim().split(' ');
        const maskedName = nameParts.length > 1
            ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
            : nameParts[0];

        return NextResponse.json({
            id: ticket.id,
            client_name: maskedName,
            client_photo: ticket.clients?.photo_url,
            status: ticket.status,
            position: ticket.position,
            barbers: formattedBarber,
            real_position: realPosition,
            estimated_wait_minutes: estimatedWait,
            created_at: ticket.created_at,
            started_at: ticket.started_at
        });

    } catch (error: any) {
        console.error('[PUBLIC TICKET ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
