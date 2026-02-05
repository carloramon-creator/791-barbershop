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

        // 1.1 Se já tiver um queue_id, já foi iniciado
        if (appt.queue_id) {
            console.log('[START_APPOINTMENT] Agendamento já iniciado:', id);
            return NextResponse.json({ success: true, queueId: appt.queue_id });
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

        // 4. Inserir na Fila (Apenas se ainda não existir para este agendamento - protegemos pela transação/update abaixo)
        // Note: Supabase doesn't have multi-table atomic transactions in a simple way here, 
        // but updating the appointment FIRST is safer.

        // 4.1 Marcar agendamento como 'in_service' PRIMEIRO para reservar
        const { data: updatedAppt, error: updateError } = await getSupabaseAdmin()
            .from('appointments')
            .update({ status: 'in_service' })
            .eq('id', id)
            .eq('status', 'scheduled') // Proteção contra race condition
            .select()
            .maybeSingle();

        if (updateError) throw updateError;
        if (!updatedAppt && appt.status !== 'in_service') {
            throw new Error('Falha ao reservar agendamento para início');
        }

        // 4.2 Inserir na Fila
        let queueIdToUse = appt.queue_id;
        if (!queueIdToUse) {
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
            queueIdToUse = queueEntry.id;

            // Vincular de volta ao agendamento
            await getSupabaseAdmin()
                .from('appointments')
                .update({ queue_id: queueIdToUse })
                .eq('id', id);
        }

        // 5. Enviar Notificações (Idempotente)
        try {
            // 5.1 WhatsApp (Idempotente flag em appointments)
            const { data: wapLock } = await getSupabaseAdmin()
                .from('appointments')
                .update({ notified_start_wap: true })
                .eq('id', id)
                .eq('notified_start_wap', false)
                .select('id')
                .maybeSingle();

            if (wapLock) {
                const { data: wapConfig } = await getSupabaseAdmin()
                    .from('whatsapp_configs')
                    .select('access_token, phone_number_id')
                    .eq('tenant_id', tenant.id)
                    .maybeSingle();

                if (wapConfig && wapConfig.access_token && appt.client_phone) {
                    const { data: clientData } = await getSupabaseAdmin()
                        .from('clients')
                        .select('last_notified_at')
                        .eq('id', client.id)
                        .maybeSingle();

                    const lastWap = clientData?.last_notified_at;
                    const isWapRecent = lastWap && (Date.now() - new Date(lastWap).getTime() < 10000);

                    if (!isWapRecent) {
                        const { WhatsAppClient } = await import('@/lib/whatsapp/client');
                        const firstName = appt.client_name ? appt.client_name.split(' ')[0] : 'Cliente';
                        await WhatsAppClient.sendText(
                            { accessToken: wapConfig.access_token, phoneNumberId: wapConfig.phone_number_id },
                            appt.client_phone,
                            `Olá, *${firstName}*! Sua vez chegou! 🎉\n\nO barbeiro já está te aguardando. Pode se dirigir à cadeira agora. 💈`
                        );
                        console.log('[WHATSAPP] Notificação de "Sua vez" enviada via Agendamento');

                        await getSupabaseAdmin().from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', client.id);
                        await getSupabaseAdmin().from('appointments').update({ last_notified_at: new Date().toISOString() }).eq('id', id);
                    }
                }
            }

            // 5.2 Push (Idempotente flag em appointments)
            const { data: pushLock } = await getSupabaseAdmin()
                .from('appointments')
                .update({ notified_start_push: true })
                .eq('id', id)
                .eq('notified_start_push', false)
                .select('id')
                .maybeSingle();

            if (pushLock) {
                const { data: clientData } = await getSupabaseAdmin()
                    .from('clients')
                    .select('fcm_token, last_notified_at')
                    .eq('id', client.id)
                    .single();

                const lastPush = clientData?.last_notified_at;
                const isPushRecent = lastPush && (Date.now() - new Date(lastPush).getTime() < 30000);

                if (clientData?.fcm_token && !isPushRecent) {
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

                        await getSupabaseAdmin().from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', client.id);
                        await getSupabaseAdmin().from('appointments').update({ last_notified_at: new Date().toISOString() }).eq('id', id);
                    }
                }
            }
        } catch (pushError) {
            console.error('[NOTIF ERROR] Falha ao enviar notificações:', pushError);
        }

        return NextResponse.json({ success: true, queueId: queueIdToUse });

    } catch (error: any) {
        console.error('[START PROCEDURE ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
