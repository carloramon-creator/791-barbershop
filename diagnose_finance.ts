
import { getSupabaseAdmin } from './lib/supabase-server';

async function diagnoseFinance() {
    const admin = getSupabaseAdmin();
    console.log('--- DIAGNÓSTICO FINANCEIRO ---');

    // Tenant ID da Barbearia Ingleses
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';

    const { data: records, error } = await admin
        .from('finance')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(`Registros financeiros para Barbearia Ingleses: ${records?.length}\n`);

    records?.forEach(r => {
        console.log(`- [${r.type.toUpperCase()}] ${r.date} | Vlr: R$ ${r.value} | Status: ${r.is_paid ? 'PAID' : 'PENDING'}`);
        console.log(`  Descrição: ${r.description}`);
        console.log(`  Metadata: ${JSON.stringify(r.metadata)}`);
        console.log('---');
    });
}

diagnoseFinance();
