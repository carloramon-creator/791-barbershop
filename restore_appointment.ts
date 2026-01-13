
import { getSupabaseAdmin } from './lib/supabase-server';

async function restoreAppointment() {
    const admin = getSupabaseAdmin();
    console.log('--- RESTAURANDO AGENDAMENTO 16/01 ---');

    const apptId = '6b52f798-4b22-4a34-abae-a63bb2a349fc';
    const queueId = '46d5f5ed-8ec4-4028-9e4f-c8a6ee6bd5be';

    // 1. Reset Agendamento
    const { error: apptError } = await admin
        .from('appointments')
        .update({
            status: 'scheduled',
            queue_id: null
        })
        .eq('id', apptId);

    if (apptError) console.error('Erro appt:', apptError);
    else console.log('Agendamento restaurado para scheduled.');

    // 2. Buscar Vendas vinculadas
    const { data: sales } = await admin.from('sales').select('id').eq('client_queue_id', queueId);
    if (sales && sales.length > 0) {
        console.log(`Limpando ${sales.length} vendas bogus...`);
        for (const s of sales) {
            await admin.from('sale_items').delete().eq('sale_id', s.id);
            await admin.from('sales').delete().eq('id', s.id);
        }
    }

    // 3. Deletar item da fila
    const { error: queueError } = await admin.from('client_queue').delete().eq('id', queueId);
    if (queueError) console.error('Erro queue:', queueError);
    else console.log('Item da fila removido.');

    console.log('Fim.');
}

restoreAppointment();
