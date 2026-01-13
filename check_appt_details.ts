
import { getSupabaseAdmin } from './lib/supabase-server';

async function checkApptDetails() {
    const admin = getSupabaseAdmin();
    console.log('--- DETALHES AGENDAMENTO 16/01 ---');

    const { data: record, error } = await admin
        .from('appointments')
        .select('*')
        .eq('start_time', '2026-01-16T17:00:00+00:00')
        .eq('tenant_id', '04e6a8df-99c4-4546-9e52-787b8718faf7')
        .single();

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(`ID: ${record.id}`);
    console.log(`Status: ${record.status}`);
    console.log(`Cliente: ${record.client_name}`);
    console.log(`Telefone: ${record.client_phone}`);
    console.log(`Queue ID: ${record.queue_id}`);
    console.log(`Created At: ${record.created_at}`);
}

checkApptDetails();
