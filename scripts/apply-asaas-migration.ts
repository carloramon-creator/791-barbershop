import { getSupabaseAdmin } from '../lib/supabase-server';

async function applyMigration() {
    const supabase = getSupabaseAdmin();
    console.log('Aplicando migração: asaas_customer_id...');

    // Como não temos rpc('exec_sql'), vamos tentar verificar se a coluna existe e se não, avisar.
    // Mas podemos tentar fazer um select para ver se falha.
    const { error } = await supabase.from('tenants').select('asaas_customer_id').limit(1);

    if (error && error.code === '42703') { // Column does not exist
        console.log('A coluna asaas_customer_id não existe. Por favor, execute o SQL manualmente no dashboard do Supabase:');
        console.log('ALTER TABLE public.tenants ADD COLUMN asaas_customer_id TEXT;');
        console.log('CREATE INDEX idx_tenants_asaas_customer_id ON public.tenants(asaas_customer_id);');
    } else if (error) {
        console.error('Erro ao verificar coluna:', error);
    } else {
        console.log('A coluna asaas_customer_id já existe ou foi criada.');
    }
}

applyMigration().catch(console.error);
