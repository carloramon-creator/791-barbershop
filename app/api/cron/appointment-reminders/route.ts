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
                minutes: 24 * 60,
                message: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Passando para lembrar do seu agendamento de *amanhã* (${date}) às *${time}* para *${service}*. Confirmado?`
            },
            {
                type: '1_HOUR',
                minutes: 60,
                message: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Seu agendamento para *${service}* é daqui a *1 hora* (${time}). Já estamos te esperando!`
            },
            {
                type: '30_MIN',
                minutes: 30,
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
            // Janela: de (agora + X min - 15 min) até (agora + X min + 15 min)
            const targetStart = new Date(now.getTime() + (window.minutes - 15) * 60000);
            const targetEnd = new Date(now.getTime() + (window.minutes + 15) * 60000);

            // Mapeamento de tipo para coluna
            const colMap: any = {
                '1_DAY': 'notified_24h',
                '1_HOUR': 'notified_1h',
                '30_MIN': 'notified_30m'
            };
            const col = colMap[window.type];

            // Buscar agendamentos na janela de tempo que ainda não receberam ESSE lembrete específico
            const { data: appts, error } = await (supabase as any)
                .from('appointments')
                .select('*, services(name), barbers(name, nickname)')
                .eq('status', 'scheduled')
                .eq(col, false) // Usa a coluna booleana correta
                .gte('start_time', targetStart.toISOString())
                .lte('start_time', targetEnd.toISOString());

            if (error) {
                console.error(`[CRON ERROR] Fetching ${window.type}:`, error);
                continue;
            }

            for (const appt of appts) {
                try {
                    // Buscar config de WhatsApp do tenant
                    const { data: wapConfig } = await supabase
                        .from('whatsapp_configs')
                        .select('access_token, phone_number_id')
                        .eq('tenant_id', appt.tenant_id)
                        .maybeSingle();

                    if (!wapConfig || !wapConfig.access_token) {
                        results.skipped++;
                        continue;
                    }

                    const creds = {
                        accessToken: wapConfig.access_token,
                        phoneNumberId: wapConfig.phone_number_id
                    };

                    const firstName = appt.client_name?.split(' ')[0] || 'Cliente';

                    // Conversão robusta de fuso para exibição na mensagem
                    const brTimeStr = new Intl.DateTimeFormat('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit'
                    }).format(new Date(appt.start_time));

                    const [dateStr, timeStr] = brTimeStr.split(', ');

                    const serviceName = appt.services?.name || appt.notes?.replace('Serviço: ', '').replace('Serviços: ', '') || 'seu horário';

                    await WhatsAppClient.sendText(
                        creds,
                        appt.client_phone,
                        window.message(firstName, dateStr, timeStr, serviceName)
                    );

                    // Marcar como enviado na coluna correta
                    await supabase
                        .from('appointments')
                        .update({ [col]: true })
                        .eq('id', appt.id);

                    results.sent++;
                } catch (err: any) {
                    results.errors.push(`Appt ${appt.id}: ${err.message}`);
                    console.error(`[REMINDER_SEND_ERROR] Appt ${appt.id}:`, err);
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[CRON REMINDERS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
