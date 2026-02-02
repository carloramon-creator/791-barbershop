import { getSupabaseAdmin } from './lib/supabase-server';
import { WhatsAppClient } from './lib/whatsapp/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testReminders() {
    console.log('--- TESTANDO LEMBRETES AUTOMÁTICOS ---');
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // Simular janelas
    const windows = [
        { type: '24h', minutes: 24 * 60 },
        { type: '1h', minutes: 60 },
        { type: '30m', minutes: 30 }
    ];

    for (const w of windows) {
        const targetStart = new Date(now.getTime() + (w.minutes - 15) * 60000);
        const targetEnd = new Date(now.getTime() + (w.minutes + 15) * 60000);

        console.log(`\nVerificando janela ${w.type}: ${targetStart.toISOString()} até ${targetEnd.toISOString()}`);

        const col = w.type === '24h' ? 'notified_24h' : (w.type === '1h' ? 'notified_1h' : 'notified_30m');

        const { data: appts, error } = await (supabase
            .from('appointments')
            .select('*, services(name)')
            .eq('status', 'scheduled')
            .eq(col, false)
            .gte('start_time', targetStart.toISOString())
            .lte('start_time', targetEnd.toISOString()) as any);

        if (error) {
            console.error('Erro ao buscar:', error);
            continue;
        }

        console.log(`Encontrados ${appts?.length || 0} agendamentos.`);

        if (appts && appts.length > 0) {
            for (const a of appts) {
                console.log(`- Agendamento: ${a.client_name} às ${a.start_time}`);
            }
        }
    }
}

testReminders();
