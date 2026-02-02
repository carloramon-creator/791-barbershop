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
        const { data: updatedClient, error: updateError } = await client
            .from('client_queue')
            .update({ status: 'attending', started_at: new Date().toISOString() })
            .eq('id', queueId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 5. Atualizar barbeiro para 'busy'
        await client.from('barbers').update({ status: 'busy' }).eq('id', queueItem.barber_id);

        // 6. Enviar Notificação WhatsApp (Novo)
        try {
            const { data: wapConfig } = await client
                .from('whatsapp_configs')
                .select('access_token, phone_number_id')
                .eq('tenant_id', tenant.id)
                .maybeSingle();

            console.log(`[WHATSAPP_START] Config encontrada? ${!!wapConfig}. Telefone: ${queueItem.client_phone}`);

            if (wapConfig && wapConfig.access_token && queueItem.client_phone) {
                const { WhatsAppClient } = await import('@/lib/whatsapp/client');
                const firstName = queueItem.client_name ? queueItem.client_name.split(' ')[0] : 'Cliente';

                await WhatsAppClient.sendText(
                    { accessToken: wapConfig.access_token, phoneNumberId: wapConfig.phone_number_id },
                    queueItem.client_phone,
                    `Olá, *${firstName}*! Sua vez chegou! 🎉\n\nO barbeiro já está te aguardando. Pode se dirigir à cadeira agora. 💈`
                );
                console.log('[WHATSAPP] Notificação enviada com sucesso');
            }
        } catch (msgError) {
            console.error('[WHATSAPP_START_ERROR]', msgError);
        }

        // 7. Enviar Notificação Push para o cliente
        try {
            const { data: clientData } = await client
                .from('clients')
                .select('fcm_token')
                .eq('id', queueItem.client_id)
                .single();

            if (clientData?.fcm_token) {
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
                }
            }
        } catch (pushError) {
            console.error('[PUSH ERROR]', pushError);
        }

        return NextResponse.json(updatedClient);
    } catch (error: any) {
        console.error('[START_FATAL_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
