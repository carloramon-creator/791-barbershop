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

        // 1. LEMBRETE 24 HORAS ANTES
        const target24hStart = new Date(now.getTime() + (24 * 60 - 10) * 60000);
        const target24hEnd = new Date(now.getTime() + (24 * 60 + 10) * 60000);

        const { data: apts24h } = await getSupabaseAdmin()
            .from('appointments')
            .select('*, clients(fcm_token), tenants(name)')
            .eq('status', 'scheduled')
            .eq('notified_24h', false)
            .gte('start_time', target24hStart.toISOString())
            .lte('start_time', target24hEnd.toISOString());

        if (apts24h) {
            for (const apt of apts24h) {
                const token = apt.clients?.fcm_token;
                if (token) {
                    try {
                        await sendPush(token, {
                            title: `Lembrete: Amanhã na ${apt.tenants?.name}`,
                            body: `Seu agendamento está confirmado para amanhã às ${formatTime(apt.start_time)}. Te esperamos!`,
                        });
                        await getSupabaseAdmin().from('appointments').update({ notified_24h: true }).eq('id', apt.id);
                        results['24h']++;
                    } catch (e: any) { results.errors.push(`24h-${apt.id}: ${e.message}`); }
                }
            }
        }

        // 2. LEMBRETE 1 HORA ANTES
        const target1hStart = new Date(now.getTime() + (60 - 10) * 60000);
        const target1hEnd = new Date(now.getTime() + (60 + 10) * 60000);

        const { data: apts1h } = await getSupabaseAdmin()
            .from('appointments')
            .select('*, clients(fcm_token), tenants(name)')
            .eq('status', 'scheduled')
            .eq('notified_1h', false)
            .gte('start_time', target1hStart.toISOString())
            .lte('start_time', target1hEnd.toISOString());

        if (apts1h) {
            for (const apt of apts1h) {
                const token = apt.clients?.fcm_token;
                if (token) {
                    try {
                        await sendPush(token, {
                            title: `Falta pouco! 1 hora para seu horário`,
                            body: `Lembrete: Você tem um agendamento na ${apt.tenants?.name} às ${formatTime(apt.start_time)}.`,
                        });
                        await getSupabaseAdmin().from('appointments').update({ notified_1h: true }).eq('id', apt.id);
                        results['1h']++;
                    } catch (e: any) { results.errors.push(`1h-${apt.id}: ${e.message}`); }
                }
            }
        }

        // 3. LEMBRETE 30 MINUTOS ANTES
        const target30mStart = new Date(now.getTime() + (30 - 10) * 60000);
        const target30mEnd = new Date(now.getTime() + (30 + 10) * 60000);

        const { data: apts30m } = await getSupabaseAdmin()
            .from('appointments')
            .select('*, clients(fcm_token), tenants(name)')
            .eq('status', 'scheduled')
            .eq('notified_30m', false)
            .gte('start_time', target30mStart.toISOString())
            .lte('start_time', target30mEnd.toISOString());

        if (apts30m) {
            for (const apt of apts30m) {
                const token = apt.clients?.fcm_token;
                if (token) {
                    try {
                        await sendPush(token, {
                            title: `Seu agendamento é daqui a 30 min`,
                            body: `Estamos te aguardando na ${apt.tenants?.name}. Até logo!`,
                        });
                        await getSupabaseAdmin().from('appointments').update({ notified_30m: true }).eq('id', apt.id);
                        results['30m']++;
                    } catch (e: any) { results.errors.push(`30m-${apt.id}: ${e.message}`); }
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
    // Ajuste simples para o fuso do usuário (considerando que o server está em UTC e a barbearia em -3)
    // Para um sistema real, usaríamos o timezone do tenant.
    d.setHours(d.getHours() - 3);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
