import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Barbeiro inicia atendimento de um cliente específico da fila.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: queueId } = await params;
    console.log('[START_CLIENT] Tentando iniciar atendimento para fila:', queueId);

    try {
        const { tenant, role } = await getCurrentUserAndTenant();
        if (role !== 'owner' && role !== 'barber') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const client = getSupabaseAdmin();

        // 1. Buscar o item da fila
        const { data: queueItem, error: fetchError } = await client
            .from('client_queue')
            .select('*')
            .eq('id', queueId)
            .single();

        if (fetchError || !queueItem) {
            console.error('[START_CLIENT] Erro ao buscar item:', fetchError);
            return NextResponse.json({ error: 'Cliente não encontrado na fila' }, { status: 404 });
        }

        // SEGURANÇA: Verificar se o item pertence ao mesmo tenant do usuário
        if (queueItem.tenant_id !== tenant.id) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
        }

        // 2. Verificar se já está sendo atendido
        if (queueItem.status === 'attending') {
            return NextResponse.json({ error: 'Este cliente já está sendo atendido' }, { status: 400 });
        }

        // 3. Finalizar qualquer atendimento em curso do mesmo barbeiro
        await client
            .from('client_queue')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('barber_id', queueItem.barber_id)
            .eq('status', 'attending');

        // 4. Atualizar o cliente selecionado para 'attending'
        // Adicionada condição .eq('status', 'waiting') para evitar race conditions
        const { data: updatedClient, error: updateError } = await client
            .from('client_queue')
            .update({ status: 'attending', started_at: new Date().toISOString() })
            .eq('id', queueId)
            .eq('status', 'waiting')
            .select()
            .single();

        // Se deu erro ou não afetou nenhuma linha (retentativa), buscamos o estado atual
        if (updateError || !updatedClient) {
            const { data: current } = await client
                .from('client_queue')
                .select('*')
                .eq('id', queueId)
                .single();

            if (current?.status !== 'attending') {
                throw updateError || new Error('Falha ao iniciar atendimento');
            }
            // Se já está 'attending', continuamos para garantir que as notificações (se falharam antes) sejam tentadas
            // mas o mecanismo de flag abaixo vai garantir que não duplique.
        }

        const finalClient = updatedClient || (await client.from('client_queue').select('*').eq('id', queueId).single()).data;

        // 5. Atualizar barbeiro para 'busy'
        await client.from('barbers').update({ status: 'busy' }).eq('id', queueItem.barber_id);

        // 6. Enviar Notificação WhatsApp (Idempotente)
        try {
            // Tenta marcar como notificado. Se já estava true, .select() virá vazio.
            const { data: wapLock } = await client
                .from('client_queue')
                .update({ notified_start_wap: true })
                .eq('id', queueId)
                .eq('notified_start_wap', false)
                .select('id')
                .maybeSingle();

            if (wapLock) {
                const { data: wapConfig } = await client
                    .from('whatsapp_configs')
                    .select('access_token, phone_number_id')
                    .eq('tenant_id', tenant.id)
                    .maybeSingle();

                if (wapConfig && wapConfig.access_token && queueItem.client_phone) {
                    const { data: clientData } = await client
                        .from('clients')
                        .select('last_notified_at')
                        .eq('id', queueItem.client_id)
                        .maybeSingle();

                    const lastWap = clientData?.last_notified_at;
                    const isWapRecent = lastWap && (Date.now() - new Date(lastWap).getTime() < 10000);

                    if (!isWapRecent) {
                        const { WhatsAppClient } = await import('@/lib/whatsapp/client');
                        const firstName = queueItem.client_name ? queueItem.client_name.split(' ')[0] : 'Cliente';

                        await WhatsAppClient.sendText(
                            { accessToken: wapConfig.access_token, phoneNumberId: wapConfig.phone_number_id },
                            queueItem.client_phone,
                            `Olá, *${firstName}*! Sua vez chegou! 🎉\n\nO barbeiro já está te aguardando. Pode se dirigir à cadeira agora. 💈`
                        );
                        console.log('[WHATSAPP] Notificação enviada com sucesso');

                        // Atualizar timestamp global
                        await client.from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', queueItem.client_id);
                        await client.from('client_queue').update({ last_notified_at: new Date().toISOString() }).eq('id', queueId);
                    }
                }
            } else {
                console.log('[WHATSAPP] Notificação ignorada (já enviada ou em processamento)');
            }
        } catch (msgError) {
            console.error('[WHATSAPP_START_ERROR]', msgError);
            // Opcional: resetar flag se falhou categoricamente? 
            // Melhor não, para evitar loops de retry infinito se o erro for persistente.
        }

        // 7. Enviar Notificação Push para o cliente (Idempotente)
        try {
            const { data: pushLock } = await client
                .from('client_queue')
                .update({ notified_start_push: true })
                .eq('id', queueId)
                .eq('notified_start_push', false)
                .select('id')
                .maybeSingle();

            if (pushLock) {
                const { data: clientData } = await client
                    .from('clients')
                    .select('fcm_token, last_notified_at')
                    .eq('id', queueItem.client_id)
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
                                body: `O barbeiro já está te aguardando. Dirija-se à cadeira.`,
                            },
                            webpush: {
                                fcmOptions: {
                                    link: `https://app.791barber.com/queue/status?id=${queueId}`
                                }
                            }
                        });

                        // Atualizar timestamp global
                        await client.from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', queueItem.client_id);
                        await client.from('client_queue').update({ last_notified_at: new Date().toISOString() }).eq('id', queueId);
                    }
                }
            }
        } catch (pushError) {
            console.error('[PUSH ERROR]', pushError);
        }

        return NextResponse.json(finalClient || updatedClient);
    } catch (error: any) {
        console.error('[START_FATAL_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
