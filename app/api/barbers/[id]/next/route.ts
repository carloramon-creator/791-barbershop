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
            .select()
            .single();

        if (updateError) throw updateError;

        // 4. Atualizar barbeiro para 'busy'
        await client.from('barbers')
            .update({ status: 'busy' })
            .eq('id', barberId)
            .eq('tenant_id', tenant.id);

        // 5. Enviar Notificação Push para o cliente
        try {
            // Buscar dados do cliente para pegar o token
            const { data: clientData } = await client
                .from('clients')
                .select('fcm_token')
                .eq('id', nextClient.client_id)
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
                                link: `https://app.791barber.com/queue/status?id=${nextClient.id}` // Link para abrir o app
                            }
                        }
                    });
                    console.log('[PUSH] Notificação enviada para cliente', nextClient.client_id);
                }
            }
        } catch (pushError) {
            console.error('[PUSH ERROR] Falha ao enviar notificação:', pushError);
            // Não falhar a requisição principal por causa do push
        }

        return NextResponse.json(updatedClient);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
