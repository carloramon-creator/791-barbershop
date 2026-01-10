
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://syvstjuxfkgzdzgixpmu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found in env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- BUSCANDO TENANT ---');
    const { data: tenant } = await supabase.from('tenants').select('id, name').ilike('name', '%Barbearia teste%').single();
    if (!tenant) { console.log('Tenant não encontrado'); return; }
    console.log('Tenant:', tenant.name, 'ID:', tenant.id);

    console.log('\n--- ÚLTIMAS 10 FATURAS DO TENANT ---');
    const { data: invoices } = await supabase
        .from('finance')
        .select('*')
        .eq('metadata->>tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(10);

    invoices?.forEach(inv => {
        console.log(`Data: ${inv.created_at} | Valor: ${inv.value} | Pago: ${inv.is_paid} | Método: ${inv.metadata?.method} | ID Inter: ${inv.metadata?.txid || inv.metadata?.nosso_numero || 'N/A'}`);
    });
}
run();
