
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function auditTrace() {
    console.log('--- TRACING ASAAS WEBHOOK SIGNALS ---');

    const { data: logs, error } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    const asaasLogs = logs.filter((l: any) =>
        l.action.toLowerCase().includes('asaas') ||
        JSON.stringify(l.metadata).toLowerCase().includes('asaas')
    );

    console.log(`Found ${asaasLogs.length} Asaas related logs in the last 50 entries.`);

    asaasLogs.forEach((l: any) => {
        console.log(`
[${l.created_at}] 
Action: ${l.action} 
Tenant: ${l.tenant_id || 'N/A'}
Metadata: ${JSON.stringify(l.metadata, null, 2).slice(0, 500)}${JSON.stringify(l.metadata).length > 500 ? '...' : ''}
`);
    });
}

auditTrace();
