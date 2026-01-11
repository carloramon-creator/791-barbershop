import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { findOrCreateClientByPhone } from '@/lib/clients';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { tenant } = await getCurrentUserAndTenant();

        // 1. Buscar o agendamento
        const { data: appt, error: apptError } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .single();

        if (apptError || !appt) throw new Error('Agendamento não encontrado');
        if (appt.status !== 'scheduled') throw new Error('Agendamento já processado ou cancelado');

        // 2. Encontrar ou Criar Cliente
        const client = await findOrCreateClientByPhone(
            supabaseAdmin,
            tenant.id,
            appt.client_name,
            appt.client_phone
        );

        // 3. Inserir na Fila (com status 'attending' ou 'waiting' conforme desejado)
        // Aqui vamos inserir como 'attending' para ser direto, ou 'waiting' se quiser passar por etapa
        // O usuário pediu "Iniciar Procedimento", então 'attending' faz mais sentido.

        const { data: queueEntry, error: queueError } = await supabaseAdmin
            .from('client_queue')
            .insert({
                tenant_id: tenant.id,
                barber_id: appt.barber_id,
                client_id: client.id,
                client_name: appt.client_name,
                client_phone: appt.client_phone,
                status: 'attending',
                started_at: new Date().toISOString(),
                position: 0 // Início imediato
            })
            .select()
            .single();

        if (queueError) throw queueError;

        // 4. Marcar agendamento como concluído/processado
        await supabaseAdmin
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', id);

        return NextResponse.json({ success: true, queueId: queueEntry.id });

    } catch (error: any) {
        console.error('[START PROCEDURE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
