import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
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
        const { data: appt, error: apptError } = await getSupabaseAdmin()
            .from('appointments')
            .select('*, services(id, name, price)')
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .single();

        if (apptError || !appt) throw new Error('Agendamento não encontrado');
        if (appt.status !== 'scheduled' && appt.status !== 'in_service') {
            throw new Error('Agendamento já processado ou cancelado');
        }

        // 2. Encontrar ou Criar Cliente
        const client = await findOrCreateClientByPhone(
            getSupabaseAdmin(),
            tenant.id,
            appt.client_name,
            appt.client_phone
        );

        // 3. Preparar Draft Items (Serviço do Agendamento)
        let draftItems: any[] = [];

        // Se já tiver draft_items salvo no appointment (futuro), usamos. 
        // Senão, pegamos o serviço vinculado.
        if (appt.draft_items && Array.isArray(appt.draft_items) && appt.draft_items.length > 0) {
            draftItems = appt.draft_items;
        } else if (appt.services) {
            // O select services(id,name,price) retorna um objeto ou array dependendo da relação.
            // Assumindo relação 1:1 ou N:1 (appointment -> service)
            const srv = Array.isArray(appt.services) ? appt.services[0] : appt.services;
            if (srv) {
                draftItems.push({
                    id: srv.id,
                    name: srv.name,
                    price: srv.price,
                    type: 'service',
                    qty: 1
                });
            }
        }

        // 4. Inserir na Fila
        const { data: queueEntry, error: queueError } = await getSupabaseAdmin()
            .from('client_queue')
            .insert({
                tenant_id: tenant.id,
                barber_id: appt.barber_id,
                client_id: client.id,
                client_name: appt.client_name,
                client_phone: appt.client_phone,
                status: 'attending',
                started_at: new Date().toISOString(),
                position: 0, // Início imediato
                draft_items: draftItems
            })
            .select()
            .single();

        if (queueError) throw queueError;

        // 4. Marcar agendamento como 'in_service' e vincular a entrada da fila
        const { error: updateError } = await getSupabaseAdmin()
            .from('appointments')
            .update({
                status: 'in_service',
                queue_id: queueEntry.id
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 5. Enviar Notificação Push para o cliente
        try {
            // Re-busca o client para garantir que temos o fcm_token mais atualizado
            const { data: clientData } = await getSupabaseAdmin()
                .from('clients')
                .select('fcm_token')
                .eq('id', client.id)
                .single();

            if (clientData?.fcm_token) {
                const { firebaseAdmin } = await import('@/lib/firebase-admin');
                if (firebaseAdmin.apps.length) {
                    await firebaseAdmin.messaging().send({
                        token: clientData.fcm_token,
                        notification: {
                            title: 'Sua vez chegou!',
                            body: `O seu atendimento foi iniciado. Dirija-se à cadeira!`,
                        },
                        webpush: {
                            fcmOptions: {
                                link: `https://app.791barber.com/appointments/status?id=${id}`
                            }
                        }
                    });
                }
            }
        } catch (pushError) {
            console.error('[PUSH ERROR] Falha ao enviar notificação:', pushError);
        }

        return NextResponse.json({ success: true, queueId: queueEntry.id });

    } catch (error: any) {
        console.error('[START PROCEDURE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
