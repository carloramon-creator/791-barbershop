
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function findInvoices() {
    console.log('--- SEARCHING FOR SPECIFIC INVOICES ---');

    const { data, error } = await supabase
        .from('finance')
        .select('id, description, value, is_paid, metadata, created_at, tenant_id')
        .ilike('description', '%Assinatura SaaS%')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} records matching "Assinatura SaaS"`);
    data.forEach(f => {
        console.log(`
ID: ${f.id}
Tenant: ${f.tenant_id}
Desc: ${f.description}
Value: ${f.value}
Paid: ${f.is_paid}
Created: ${f.created_at}
Ref: ${f.metadata?.external_reference || 'N/A'}
Nosso Num: ${f.metadata?.nosso_numero || 'N/A'}
`);
    });
}

findInvoices();
