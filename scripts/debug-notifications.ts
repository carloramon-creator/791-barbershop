import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuração simplificada para rodar direto com node/tsx
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas.');
    console.log('Por favor, exporte as variáveis no terminal antes de rodar, ou crie um .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function formatTime(iso: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    }).format(new Date(iso));
}

async function debugNotifications() {
    console.log('\n🔍 --- INICIANDO DIAGNÓSTICO DE NOTIFICAÇÕES --- 🔍');
    const now = new Date();
    console.log(`🕒 Hora do Servidor (Local da execução): ${now.toString()}`);
    console.log(`🕒 Hora do Servidor (UTC ISO): ${now.toISOString()}`);

    const windows = [
        { type: '24h', minutes: 24 * 60, col: 'notified_24h' },
        { type: '1h', minutes: 60, col: 'notified_1h' },
        { type: '30m', minutes: 30, col: 'notified_30m' }
    ];

    // Buscar agendamentos futuros próximos
    console.log('\n📥 Buscando agendamentos "scheduled" para hoje e amanhã...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2); // Pega uma margem boa

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, start_time, status, notified_24h, notified_1h, notified_30m, client_name, client_phone')
        .eq('status', 'scheduled')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true });

    if (error) {
        console.error('❌ Erro ao buscar agendamentos:', error.message);
        return;
    }

    console.log(`📋 Encontrados ${appointments.length} agendamentos futuros.`);

    for (const apt of appointments) {
        console.log(`\n-----------------------------------------------------------`);
        console.log(`🆔 ID: ${apt.id}`);
        console.log(`👤 Cliente: ${apt.client_name || 'N/A'} (${apt.client_phone})`);
        console.log(`📅 Data do Banco (UTC): ${apt.start_time}`);
        console.log(`🇧🇷 Data Formatada (BR): ${await formatTime(apt.start_time)}`);

        const aptDate = new Date(apt.start_time);
        const diffMs = aptDate.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / 60000); // Diferença em minutos

        console.log(`⏱️  Diferença de tempo (Agendamento - Agora): ${diffMinutes} minutos`);

        // Simula a verificação das janelas
        for (const win of windows) {
            const targetMin = win.minutes;
            const margin = 40; // A margem que definimos no código
            const minRange = targetMin - margin;
            const maxRange = targetMin + margin;

            let status = '❌ Fora da Janela';

            if (diffMinutes >= minRange && diffMinutes <= maxRange) {
                status = '✅ DENTRO DA JANELA - DEVERIA NOTIFICAR AGORA';
            }

            console.log(`   [Janela ${win.type} (${targetMin}m)]: Flag Banco: ${(apt as any)[win.col]} | Range aceito: ${minRange} a ${maxRange}m | Status: ${status}`);
        }
    }
    console.log('\n-----------------------------------------------------------');
    console.log('✅ Diagnóstico Concluído.');
}

debugNotifications();
