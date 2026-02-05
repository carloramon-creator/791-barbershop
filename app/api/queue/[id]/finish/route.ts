import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';

/**
 * Finaliza o atendimento de um cliente.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: queueId } = await params;
    try {
        const { tenant, role } = await getCurrentUserAndTenant();
        if (role !== 'owner' && role !== 'barber') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Usar getSupabaseAdmin() para by-passar RLS se necessário,
        // garantindo a segurança pelo tenant_id abaixo
        const client = getSupabaseAdmin();

        // 1. Buscar a entrada da fila para saber quem é o barbeiro e validar tenant
        const { data: queueEntry, error: fetchError } = await client
            .from('client_queue')
            .select('id, barber_id, tenant_id, status')
            .eq('id', queueId)
            .single();

        if (fetchError || !queueEntry) {
            console.error('[FINISH_ERROR]', fetchError);
            return NextResponse.json({ error: 'Atendimento não encontrado' }, { status: 404 });
        }

        // SEGURANÇA: Validar se pertence ao tenant atual
        if (queueEntry.tenant_id !== tenant.id) {
            return NextResponse.json({ error: 'Acesso não autorizado a este recurso' }, { status: 403 });
        }

        // 2. Finalizar o atendimento
        // Só tenta finalizar se estiver 'attending' (evita duplicação de encerramento)
        const { error: finishError, data: finishedItem } = await client
            .from('client_queue')
            .update({
                status: 'finished',
                finished_at: new Date().toISOString()
            })
            .eq('id', queueId)
            .eq('status', 'attending')
            .select()
            .maybeSingle();

        if (finishError) throw finishError;

        // 3. Resetar status do barbeiro para 'available' (Livre) pois ele acabou de terminar um atendimento
        await client.from('barbers').update({ status: 'available' }).eq('id', queueEntry.barber_id);

        // 3.1 Se houver agendamento vinculado a este item da fila, marcá-lo como finalizado
        await client
            .from('appointments')
            .update({ status: 'completed' })
            .eq('queue_id', queueId);

        // 4. Retornar se o plano permite venda (intermediate, complete, premium ou trial)
        const canCreateSale = ['intermediate', 'complete', 'premium', 'trial'].includes(tenant.plan);

        // 5. Enviar Mensagem de Agradecimento no WhatsApp (Idempotente)
        try {
            // Tenta marcar como notificado de finalização
            const { data: wapLock } = await client
                .from('client_queue')
                .update({ notified_finish_wap: true })
                .eq('id', queueId)
                .eq('notified_finish_wap', false)
                .select('id')
                .maybeSingle();

            if (wapLock) {
                // Buscar telefone, nome e client_id
                const { data: queueData } = await client
                    .from('client_queue')
                    .select('client_phone, client_name, client_id')
                    .eq('id', queueId)
                    .single();

                if (queueData?.client_phone) {
                    // Check global debounce
                    const { data: clientData } = await client
                        .from('clients')
                        .select('last_notified_at')
                        .eq('id', queueData.client_id)
                        .maybeSingle();

                    const lastWap = clientData?.last_notified_at;
                    const isWapRecent = lastWap && (Date.now() - new Date(lastWap).getTime() < 10000);

                    if (!isWapRecent) {
                        const { data: wapConfig } = await client
                            .from('whatsapp_configs')
                            .select('access_token, phone_number_id')
                            .eq('tenant_id', tenant.id)
                            .maybeSingle();

                        if (wapConfig) {
                            const { WhatsAppClient } = await import('@/lib/whatsapp/client');
                            const firstName = queueData.client_name ? queueData.client_name.split(' ')[0] : 'Cliente';

                            await WhatsAppClient.sendText(
                                { accessToken: wapConfig.access_token, phoneNumberId: wapConfig.phone_number_id },
                                queueData.client_phone,
                                `Olá, *${firstName}*! Seu atendimento foi finalizado. ✅\n\nAgradecemos a preferência e esperamos te ver em breve! 💈`
                            );
                            console.log('[WHATSAPP] Agradecimento enviado para', queueData.client_phone);

                            // Update global debounce
                            if (queueData.client_id) {
                                await client.from('clients').update({ last_notified_at: new Date().toISOString() }).eq('id', queueData.client_id);
                            }
                            await client.from('client_queue').update({ last_notified_at: new Date().toISOString() }).eq('id', queueId);
                        }
                    }
                }
            }
        } catch (msgError) {
            console.error('[WHATSAPP_FINISH_ERROR]', msgError);
        }

        return NextResponse.json({
            message: 'Atendimento finalizado',
            canCreateSale,
            queueId
        });
    } catch (error: any) {
        console.error('[FINISH_FATAL_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
