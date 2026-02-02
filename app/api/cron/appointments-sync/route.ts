import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { subMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

/**
 * Job unificado de lembretes (Push + WhatsApp)
 * Agrupa o que antes era feito em 'reminders' e 'appointment-reminders'
 * para evitar conflitos de flags de notificação.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const now = new Date();

        console.log(`[CRON_SYNC] Started at ${now.toISOString()}. Firebase apps: ${firebaseAdmin.apps.length}`);

        const results = {
            '24h': { push: 0, whatsapp: 0 },
            '1h': { push: 0, whatsapp: 0 },
            '30m': { push: 0, whatsapp: 0 },
            errors: [] as string[]
        };

        const windows = [
            {
                type: '24h',
                col: 'notified_24h',
                minutes: 24 * 60,
                title: 'Lembrete: Amanhã',
                getPushBody: (apt: any) => `Seu agendamento está confirmado para amanhã às ${formatTime(apt.start_time)}. Te esperamos!`,
                getWapMessage: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Passando para lembrar do seu agendamento de *amanhã* (${date}) às *${time}* para *${service}*. Confirmado?`
            },
            {
                type: '1h',
                col: 'notified_1h',
                minutes: 60,
                title: 'Falta pouco!',
                getPushBody: (apt: any) => `Lembrete: Você tem um agendamento às ${formatTime(apt.start_time)}.`,
                getWapMessage: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Seu agendamento para *${service}* é daqui a *1 hora* (${time}). Já estamos te esperando!`
            },
            {
                type: '30m',
                col: 'notified_30m',
                minutes: 30,
                title: '30 minutos para seu horário',
                getPushBody: (apt: any) => `Estamos te aguardando. Até logo!`,
                getWapMessage: (name: string, date: string, time: string, service: string) =>
                    `Olá, *${name}*! 👋 Faltam apenas *30 minutos* para o seu horário das *${time}* (${service}). Até logo!`
            }
        ];

        for (const window of windows) {
            const targetStart = new Date(now.getTime() + (window.minutes - 20) * 60000);
            const targetEnd = new Date(now.getTime() + (window.minutes + 20) * 60000);

            console.log(`[CRON_SYNC] Checking window ${window.type}: [${targetStart.toISOString()} - ${targetEnd.toISOString()}]`);

            const { data: appts, error } = await (supabase as any)
                .from('appointments')
                .select('*, clients(fcm_token), tenants(name, id), services(name)')
                .eq('status', 'scheduled')
                .eq(window.col, false)
                .gte('start_time', targetStart.toISOString())
                .lte('start_time', targetEnd.toISOString());

            if (error) {
                results.errors.push(`Error fetching ${window.type}: ${error.message}`);
                continue;
            }

            if (!appts || appts.length === 0) continue;

            for (const appt of appts) {
                try {
                    let sentPush = false;
                    let sentWap = false;

                    // 1. Tentar Enviar PUSH
                    const pushToken = appt.clients?.fcm_token;
                    if (pushToken && firebaseAdmin.apps.length > 0) {
                        try {
                            await firebaseAdmin.messaging().send({
                                token: pushToken,
                                notification: {
                                    title: window.title + (appt.tenants?.name ? ` na ${appt.tenants.name}` : ''),
                                    body: window.getPushBody(appt),
                                },
                                android: { priority: 'high' },
                                apns: { payload: { aps: { sound: 'default' } } }
                            });
                            sentPush = true;
                        } catch (e: any) {
                            console.error(`[PUSH_ERROR] Appt ${appt.id}:`, e.message);
                        }
                    }

                    // 2. Tentar Enviar WHATSAPP
                    try {
                        const { data: wapConfig } = await supabase
                            .from('whatsapp_configs')
                            .select('access_token, phone_number_id')
                            .eq('tenant_id', appt.tenant_id)
                            .maybeSingle();

                        if (wapConfig?.access_token) {
                            const creds = {
                                accessToken: wapConfig.access_token,
                                phoneNumberId: wapConfig.phone_number_id
                            };

                            const firstName = appt.client_name?.split(' ')[0] || 'Cliente';
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
                                window.getWapMessage(firstName, dateStr, timeStr, serviceName)
                            );
                            sentWap = true;
                        }
                    } catch (e: any) {
                        console.error(`[WAP_ERROR] Appt ${appt.id}:`, e.message);
                    }

                    // 3. Atualizar flag se enviou pelo menos um (ou se tentou ambos e falhou mas queremos evitar repetição)
                    // Marcamos como true para não tentar de novo na próxima rodada do cron
                    await supabase
                        .from('appointments')
                        .update({ [window.col]: true })
                        .eq('id', appt.id);

                    const key = window.type as '24h' | '1h' | '30m';
                    if (sentPush) results[key].push++;
                    if (sentWap) results[key].whatsapp++;

                } catch (err: any) {
                    results.errors.push(`Appt ${appt.id}: ${err.message}`);
                }
            }
        }

        // 4. Lembrete de Inatividade no WhatsApp (Inatividade > 5 min)
        try {
            await handleInactivityReminders();
        } catch (e) {
            console.error('[CRON_INACTIVITY_ERROR]', e);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[CRON_FATAL_ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function handleInactivityReminders() {
    const admin = getSupabaseAdmin();
    const timeoutDate = subMinutes(new Date(), 5).toISOString();

    // Busca sessões que não estão em idle, não foram lembradas recentemente e estão paradas há 5+ min
    const { data: sessions } = await admin
        .from('whatsapp_sessions')
        .select('*')
        .neq('state', 'idle')
        .lt('updated_at', timeoutDate)
        .eq('reminder_count', 0); // Envia apenas um lembrete

    if (!sessions || sessions.length === 0) return;

    for (const session of sessions) {
        try {
            // Buscar credenciais do tenant
            const { data: config } = await admin
                .from('whatsapp_configs')
                .select('access_token, phone_number_id')
                .eq('tenant_id', session.tenant_id)
                .single();

            if (!config) continue;

            const creds = {
                accessToken: config.access_token,
                phoneNumberId: config.phone_number_id
            };

            await WhatsAppClient.sendButtons(creds, session.phone, "Você ainda está aí? Vi que paramos o seu agendamento. Deseja continuar?", [
                { id: 'AGENDAR', title: 'Continuar' },
                { id: 'MENU', title: 'Ir para Menu' }
            ]);

            // Marcar como lembrado para não repetir
            await admin
                .from('whatsapp_sessions')
                .update({
                    reminder_count: 1,
                    last_reminder_at: new Date().toISOString()
                })
                .eq('tenant_id', session.tenant_id)
                .eq('phone', session.phone);

            console.log(`[CRON_REMINDER] Lembrete enviado para ${session.phone} (Tenant: ${session.tenant_id})`);
        } catch (err) {
            console.error(`[CRON_REMINDER_ERROR] Session ${session.phone}:`, err);
        }
    }
}

function formatTime(iso: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(iso));
}
