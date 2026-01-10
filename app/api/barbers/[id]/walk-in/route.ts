import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Atendimento Avulso: Cria uma entrada na fila já em atendimento.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: barberId } = await params;
    const { clientName } = await req.json();

    try {
        const { tenant, role } = await getCurrentUserAndTenant();
        if (role !== 'owner' && role !== 'barber') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const client = supabaseAdmin;

        // 1. Finalizar qualquer atendimento em aberto para este barbeiro
        await client
            .from('client_queue')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('barber_id', barberId)
            .eq('tenant_id', tenant.id)
            .eq('status', 'attending');

        // 2. Criar nova entrada 'attending' diretamente
        const { data: newQueue, error: queueError } = await client
            .from('client_queue')
            .insert({
                tenant_id: tenant.id,
                barber_id: barberId,
                client_name: clientName || 'Cliente Avulso',
                status: 'attending',
                position: 0,
                started_at: new Date().toISOString(),
                is_priority: false
            })
            .select()
            .single();

        if (queueError) throw queueError;

        // 3. Marcar barbeiro como ocupado
        await client.from('barbers')
            .update({ status: 'busy' })
            .eq('id', barberId)
            .eq('tenant_id', tenant.id);

        return NextResponse.json(newQueue);
    } catch (error: any) {
        console.error('[WALK-IN ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
