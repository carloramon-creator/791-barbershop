import { getSupabaseAdmin } from './lib/supabase-server';

async function main() {
    const { data: finance } = await getSupabaseAdmin()
        .from('finance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (finance) {
        console.log('--- ÚLTIMO PAGAMENTO REGISTRADO ---');
        console.log(`Data: ${new Date(finance.created_at).toLocaleString('pt-BR')}`);
        console.log(`Descrição: ${finance.description}`);
        console.log(`Valor: ${finance.value}`);
        console.log(`Status: ${finance.is_paid ? '✅ PAGO' : '⏳ PENDENTE'}`);
        console.log(`Método (Metadata): ${finance.metadata?.method}`);
        console.log(`ID Recorrência (id_rec): ${finance.metadata?.id_rec || '❌ NÃO ENCONTRADO'}`);
        console.log(`Payload Pix: ${Boolean(finance.metadata?.pix_payload)}`);
        console.log('-----------------------------------');
    } else {
        console.log('Nenhum registro encontrado.');
    }
}

main();
