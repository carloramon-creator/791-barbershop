import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { firebaseAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Validação de segurança simples (opcional: usar CRON_SECRET)
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const results = {
            '24h': 0,
            '1h': 0,
            '30m': 0,
            errors: [] as string[]
        };

        const lookups = [
            { col: 'notified_24h', minutes: 24 * 60, title: 'Lembrete: Amanhã', getBody: (apt: any) => `Seu agendamento está confirmado para amanhã às ${formatTime(apt.start_time)}. Te esperamos!` },
            { col: 'notified_1h', minutes: 60, title: 'Falta pouco!', getBody: (apt: any) => `Lembrete: Você tem um agendamento às ${formatTime(apt.start_time)}.` },
            { col: 'notified_30m', minutes: 30, title: '30 minutos para seu horário', getBody: (apt: any) => `Estamos te aguardando. Até logo!` },
        ];

        for (const lookup of lookups) {
            // Janela: de (agora + X min - 15 min) até (agora + X min + 15 min)
            // Isso garante que mesmo se o cron atrasar 5-10 min, ele pegue o agendamento.
            const targetStart = new Date(now.getTime() + (lookup.minutes - 15) * 60000);
            const targetEnd = new Date(now.getTime() + (lookup.minutes + 15) * 60000);

            const { data: appts } = await (getSupabaseAdmin()
                .from('appointments')
                .select('*, clients(fcm_token), tenants(name)')
                .eq('status', 'scheduled')
                .eq(lookup.col, false)
                .gte('start_time', targetStart.toISOString())
                .lte('start_time', targetEnd.toISOString()) as any);

            if (appts) {
                for (const apt of appts) {
                    const token = apt.clients?.fcm_token;
                    if (token) {
                        try {
                            await sendPush(token, {
                                title: lookup.title + (apt.tenants?.name ? ` na ${apt.tenants.name}` : ''),
                                body: lookup.getBody(apt),
                            });
                            await getSupabaseAdmin()
                                .from('appointments')
                                .update({ [lookup.col]: true })
                                .eq('id', apt.id);

                            const key = lookup.col.split('_')[1] as '24h' | '1h' | '30m';
                            results[key]++;
                        } catch (e: any) {
                            results.errors.push(`${lookup.col}-${apt.id}: ${e.message}`);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('[CRON REMINDERS ERROR]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function sendPush(token: string, payload: { title: string, body: string }) {
    if (!firebaseAdmin.apps.length) return;

    await firebaseAdmin.messaging().send({
        token,
        notification: {
            title: payload.title,
            body: payload.body,
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } }
    });
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const brTime = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
    return brTime;
}
