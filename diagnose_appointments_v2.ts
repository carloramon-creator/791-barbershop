
import { supabaseAdmin } from './lib/supabase-server';

async function diagnose() {
    console.log('--- DIAGNÓSTICO DETALHADO 16/01 ---');

    const { data: day16, error } = await supabaseAdmin
        .from('appointments')
        .select('*, tenants(name)')
        .gte('start_time', '2026-01-16T00:00:00Z')
        .lte('start_time', '2026-01-16T23:59:59Z');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(`Encontrados no dia 16/01: ${day16?.length}\n`);

    day16?.forEach(a => {
        console.log(`ID: ${a.id}`);
        console.log(`Cliente: ${a.client_name}`);
        console.log(`Telefone: ${a.client_phone}`);
        console.log(`Barbeiro ID: ${a.barber_id}`);
        console.log(`Status: ${a.status}`);
        console.log(`Hora (Z): ${a.start_time}`);
        console.log('---');
    });

    const phone = '48991305547';
    console.log(`\nBuscando qualquer agendamento com o telefone ${phone}:`);
    const { data: byPhone } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('client_phone', phone);

    byPhone?.forEach(a => {
        console.log(`- ${a.start_time} | Status: ${a.status} | Cliente: ${a.client_name}`);
    });
}

diagnose();
