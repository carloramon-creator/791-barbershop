
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function debugStatus() {
    console.log('--- DEBUGGING SYSTEM STATUS ---');

    // 1. Verificar Tenants recentes
    const { data: tenants, error: tError } = await supabase
        .from('tenants')
        .select('id, name, plan, subscription_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (tError) console.error('Tenant Error:', tError);
    else {
        console.log('\n[LATEST TENANTS]');
        tenants.forEach(t => {
            console.log(`${t.id.slice(0, 8)} | ${t.name.padEnd(20)} | Plan: ${t.plan.padEnd(10)} | Status: ${t.subscription_status}`);
        });
    }

    // 2. Verificar Faturas Recentes
    const { data: finance, error: fError } = await supabase
        .from('finance')
        .select('id, description, is_paid, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (fError) console.error('Finance Error:', fError);
    else {
        console.log('\n[LATEST FINANCE]');
        finance.forEach(f => {
            const shortId = f.id.slice(0, 8);
            const paidStr = f.is_paid ? 'PAID' : 'PENDING';
            const extRef = f.metadata?.external_reference || 'N/A';
            console.log(`${shortId} | ${f.description.padEnd(40)} | ${paidStr.padEnd(8)} | Ref: ${extRef}`);
        });
    }
}

debugStatus();
