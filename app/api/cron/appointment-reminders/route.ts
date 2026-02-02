import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { format, subDays, addMinutes, startOfMinute, endOfMinute, subMinutes, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

/**
 * Job de lembretes de agendamento
 * Deve rodar periodicamente (ex: a cada 5 ou 15 min)
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        if (process.env.CRON_SECRET && searchParams.get('secret') !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const now = new Date();

        // Janelas de tempo para lembretes
        const windows = [
            {
                type: '1_DAY',
                targetTime: addMinutes(now, 24 * 60),
                message: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Passando para lembrar do seu agendamento de *amanhã* (${date}) às *${time}* para *${service}*. Confirmado?`
            },
            {
                type: '1_HOUR',
                targetTime: addMinutes(now, 60),
                message: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Seu agendamento para *${service}* é daqui a *1 hora* (${time}). Já estamos te esperando!`
            },
            {
                type: '30_MIN',
                targetTime: addMinutes(now, 30),
                message: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Faltam apenas *30 minutos* para o seu horário das *${time}* (${service}). Até logo!`
            }
        ];

        const results = {
            sent: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const window of windows) {
            const start = startOfMinute(window.targetTime).toISOString();
            const end = endOfMinute(window.targetTime).toISOString();

            // Buscar agendamentos na janela de tempo que ainda não receberam ESSE lembrete específico
            // A coluna notification_status pode armazenar JSON ou tags: ['1_DAY_SENT', '1_HOUR_SENT', ...]
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('*, services(name), barbers(name)')
                .eq('status', 'scheduled')
                .gte('start_time', start)
                .lte('start_time', end);

            if (error) throw error;

            for (const appt of appts) {
                try {
                    // Verificar se já enviamos esse tipo de lembrete
                    const sentLogs = appt.notification_logs || [];
                    if (sentLogs.includes(window.type)) {
                        results.skipped++;
                        continue;
                    }

                    // Buscar config de WhatsApp do tenant
                    const { data: wapConfig } = await supabase
                        .from('whatsapp_configs')
                        .select('access_token, phone_number_id')
                        .eq('tenant_id', appt.tenant_id)
                        .maybeSingle();

                    if (!wapConfig || !wapConfig.access_token) continue;

                    const creds = {
                        accessToken: wapConfig.access_token,
                        phoneNumberId: wapConfig.phone_number_id
                    };

                    const firstName = appt.client_name?.split(' ')[0] || 'Cliente';
                    const time = format(new Date(appt.start_time), 'HH:mm');
                    const date = format(new Date(appt.start_time), 'dd/MM');
                    const serviceName = appt.services?.name || 'Serviço';

                    await WhatsAppClient.sendText(
                        creds,
                        appt.client_phone,
                        window.message(firstName, date, time, serviceName)
                    );

                    // Registrar que enviamos
                    await supabase
                        .from('appointments')
                        .update({
                            notification_logs: [...sentLogs, window.type]
                        })
                        .eq('id', appt.id);

                    results.sent++;
                } catch (err: any) {
                    results.errors.push(`Appt ${appt.id}: ${err.message}`);
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[CRON REMINDERS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
