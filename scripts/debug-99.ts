
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function debug99() {
    console.log('--- DEBUGGING INVOICE 99.90 ---');

    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .eq('value', 99.9)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} records with value 99.90`);
    data.forEach((f: any) => {
        console.log(`
ID: ${f.id}
Tenant: ${f.tenant_id}
Desc: ${f.description}
Paid: ${f.is_paid}
Date: ${f.date}
Meta: ${JSON.stringify(f.metadata, null, 2)}
`);
    });

    const { data: logs, error: lError } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!lError) {
        console.log('\n--- LATEST 10 AUDIT LOGS ---');
        logs.forEach((l: any) => {
            console.log(`[${l.created_at}] ${l.action} | ${JSON.stringify(l.metadata).slice(0, 100)}`);
        });
    }
}

debug99();
