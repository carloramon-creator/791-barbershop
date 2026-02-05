import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCurrentUserAndTenant } from '@/lib/server-utils';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { format } from 'date-fns';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { tenant } = await getCurrentUserAndTenant();
        const { id } = params;

        // 1. Buscar o agendamento
        const { data: appt, error: apptError } = await getSupabaseAdmin()
            .from('appointments')
            .select(`
                *,
                clients(name, phone)
            `)
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .single();

        if (apptError || !appt) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
        }

        // 2. Buscar config do WhatsApp
        const { data: config, error: configError } = await getSupabaseAdmin()
            .from('whatsapp_configs')
            .select('*')
            .eq('tenant_id', tenant.id)
            .single();

        if (configError || !config) {
            return NextResponse.json({ error: 'WhatsApp não configurado para esta barbearia' }, { status: 400 });
        }

        // 3. Preparar mensagem
        const clientName = appt.client_name || appt.clients?.name || 'Cliente';
        const phone = appt.client_phone || appt.clients?.phone;

        if (!phone) {
            return NextResponse.json({ error: 'Telefone do cliente não encontrado' }, { status: 400 });
        }

        const time = format(new Date(appt.start_time), 'HH:mm');
        const message = `Olá ${clientName}! 👋\nEstamos te aguardando para o seu agendamento das ${time}. Até já! 💈`;

        // 4. Enviar via Meta API
        await WhatsAppClient.sendText({
            accessToken: config.access_token,
            phoneNumberId: config.phone_number_id
        }, phone, message);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[APPOINTMENT_NOTIFY_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
