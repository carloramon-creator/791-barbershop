import { getSupabaseAdmin } from './lib/supabase-server';

async function main() {
    console.log('--- BUSCANDO REGISTROS DE PIX AUTOMÁTICO RECENTES ---');

    // Buscar últimos 5 registros de Pix Automático (sucesso ou falha)
    const { data: records, error } = await getSupabaseAdmin()
        .from('finance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (records) {
        records.forEach(r => {
            console.log(`\nID: ${r.id}`);
            console.log(`Data: ${r.created_at}`);
            console.log(`Valor: ${r.value}`);
            console.log(`Status Pago: ${r.is_paid}`);
            console.log(`Metadata:`, JSON.stringify(r.metadata, null, 2));
        });
    } else {
        console.log('Nenhum registro encontrado ou erro:', error);
    }
}

main();
