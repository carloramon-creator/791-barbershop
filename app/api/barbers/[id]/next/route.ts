import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Barbeiro chama o próximo cliente da fila.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: barberId } = await params;
    try {
        const { tenant, role } = await getCurrentUserAndTenant();
        if (role !== 'owner' && role !== 'barber') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const client = getSupabaseAdmin();

        // 1. Garantir que não há ninguém 'attending' agora para esse barbeiro
        await client
            .from('client_queue')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('barber_id', barberId)
            .eq('tenant_id', tenant.id)
            .eq('status', 'attending');

        // 2. Buscar o próximo 'waiting' - prioridade primeiro, depois menor posição
        const { data: nextClient, error: fetchError } = await client
            .from('client_queue')
            .select('*')
            .eq('barber_id', barberId)
            .eq('tenant_id', tenant.id)
            .eq('status', 'waiting')
            .order('is_priority', { ascending: false, nullsFirst: false })
            .order('position', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!nextClient) {
            // Se não tem ninguém esperando, barbeiro fica 'available'
            await client.from('barbers')
                .update({ status: 'available' })
                .eq('id', barberId)
                .eq('tenant_id', tenant.id);

            return NextResponse.json({ message: 'Não há clientes na fila' });
        }

        // 3. Atualizar cliente para 'attending'
        const { data: updatedClient, error: updateError } = await client
            .from('client_queue')
            .update({ status: 'attending', started_at: new Date().toISOString() })
            .eq('id', nextClient.id)
            .eq('tenant_id', tenant.id)
            .eq('status', 'waiting') // Race condition guard
            .select()
            .single();

        // Se falhou (alguém já chamou ou retentativa), garantir que pegamos o cliente correto
        if (updateError || !updatedClient) {
            const { data: current } = await client
                .from('client_queue')
                .select('*')
                .eq('id', nextClient.id)
                .single();

            if (current?.status !== 'attending') {
                return NextResponse.json({ error: 'Falha ao iniciar atendimento do próximo' }, { status: 500 });
            }
        }

        const finalClient = updatedClient || (await client.from('client_queue').select('*').eq('id', nextClient.id).single()).data;

        // 4. Atualizar barbeiro para 'busy'
        await client.from('barbers')
            .update({ status: 'busy' })
            .eq('id', barberId)
            .eq('tenant_id', tenant.id);

        // 5. Enviar Notificações (Idempotentes)
        try {
            // 5.1 Push FCM (Idempotente)
            const { data: pushLock } = await client
                .from('client_queue')
                .update({ notified_start_push: true })
                .eq('id', nextClient.id)
                .eq('notified_start_push', false)
                .select('id')
                .maybeSingle();

            if (pushLock) {
                const { data: clientData } = await client
                    .from('clients')
                    .select('fcm_token, last_notified_at')
                    .eq('id', nextClient.client_id)
                    .single();

                const lastPush = clientData?.last_notified_at;
                const isPushRecent = lastPush && (Date.now() - new Date(lastPush).getTime() < 30000);

                if (clientData?.fcm_token && !isPushRecent) {
                    const { firebaseAdmin } = await import('@/lib/firebase-admin');
                    if (firebaseAdmin.apps.length) {
                        try {
                            await firebaseAdmin.messaging().send({
                                token: clientData.fcm_token,
                                notification: {
                                    title: 'Sua vez chegou!',
                                    body: `O barbeiro já está te aguardando. Dirija-se à cadeira.`,
                                },
                                webpush: {
                                    fcmOptions: {
                                        link: `https://app.791barber.com/queue/status?id=${nextClient.id}`
                                    }
                                }
                            });
                            console.log('[PUSH] Notificação enviada para cliente', nextClient.client_id);

                            // Atualizar timestamp global
                            await client.from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', nextClient.client_id);
                            await client.from('client_queue').update({ last_notified_at: new Date().toISOString() }).eq('id', nextClient.id);
                        } catch (e: any) {
                            console.error('[PUSH_ERROR] next client notification:', e.message);
                        }
                    }
                }
            }

            // 5.2 WhatsApp (Idempotente)
            const { data: wapLock } = await client
                .from('client_queue')
                .update({ notified_start_wap: true })
                .eq('id', nextClient.id)
                .eq('notified_start_wap', false)
                .select('id')
                .maybeSingle();

            if (wapLock) {
                const { data: clientData } = await client
                    .from('clients')
                    .select('phone, name, last_notified_at')
                    .eq('id', nextClient.client_id)
                    .single();

                const lastWap = clientData?.last_notified_at;
                const isWapRecent = lastWap && (Date.now() - new Date(lastWap).getTime() < 10000); // 10s debounce for WA

                if (clientData?.phone && !isWapRecent) {
                    const { data: wapConfig } = await client
                        .from('whatsapp_configs')
                        .select('access_token, phone_number_id')
                        .eq('tenant_id', tenant.id)
                        .maybeSingle();

                    if (wapConfig) {
                        const { WhatsAppClient } = await import('@/lib/whatsapp/client');
                        const firstName = clientData.name ? clientData.name.split(' ')[0] : 'Cliente';

                        const { data: barberData } = await client
                            .from('barbers')
                            .select('nickname, name')
                            .eq('id', barberId)
                            .single();

                        const barberName = barberData?.nickname || barberData?.name || 'seu barbeiro';

                        await WhatsAppClient.sendText(
                            { accessToken: wapConfig.access_token, phoneNumberId: wapConfig.phone_number_id },
                            clientData.phone,
                            `Olá *${firstName}*! 👋\n\nSua vez chegou! O profissional *${barberName}* já está te aguardando na cadeira. ✂️`
                        );
                        console.log('[WHATSAPP] Notificação de "Sua Vez" enviada para', clientData.phone);

                        // Atualizar timestamp global
                        await client.from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', nextClient.client_id);
                        await client.from('client_queue').update({ last_notified_at: new Date().toISOString() }).eq('id', nextClient.id);
                    }
                }
            }
        } catch (error) {
            console.error('[NOTIF ERROR] Falha ao enviar notificações no call next:', error);
        }

        return NextResponse.json(finalClient || updatedClient);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
