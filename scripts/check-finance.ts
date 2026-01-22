
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    // Buscar tenant do usuário "Pinto"
    const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .ilike('name', '%Pinto%');

    if (!tenants || tenants.length === 0) {
        console.log('Tenant not found');
        return;
    }

    const tenantId = tenants[0].id;
    console.log(`Debuging tenant: ${tenants[0].name} (${tenantId})`);

    // Buscar faturas recentes
    const { data: finance } = await supabase
        .from('finance')
        .select('id, description, is_paid, metadata, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (!finance) {
        console.log('No finance records found');
        return;
    }

    console.log('Recent Invoices:');
    finance.forEach(f => {
        console.log(`---
ID: ${f.id}
Desc: ${f.description}
Paid: ${f.is_paid}
Created: ${f.created_at}
Meta: ${JSON.stringify(f.metadata, null, 2)}`);
    });
}

debug();
