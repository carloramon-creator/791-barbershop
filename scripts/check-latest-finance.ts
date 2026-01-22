
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function checkLatest() {
    const { data: finance, error } = await supabase
        .from('finance')
        .select('id, description, is_paid, metadata, created_at, tenant_id')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- LATEST 5 FINANCE RECORDS ---');
    finance.forEach(f => {
        console.log(`
ID: ${f.id}
Tenant: ${f.tenant_id}
Desc: ${f.description}
Paid: ${f.is_paid}
Created: ${f.created_at}
Meta: ${JSON.stringify(f.metadata, null, 2)}
`);
    });
}

checkLatest();
