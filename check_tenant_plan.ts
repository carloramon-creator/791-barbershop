import { getSupabaseAdmin } from './lib/supabase-server';

async function main() {
    const { data: tenant } = await getSupabaseAdmin()
        .from('tenants')
        .select('id, name, plan, subscription_status, created_at')
        .limit(1)
        .single();

    if (tenant) {
        console.log('--- TENANT INFO ---');
        console.log(`Plan: ${tenant.plan}`);
        console.log(`Status: ${tenant.subscription_status}`);
        console.log(`Created: ${tenant.created_at}`);
    }
}

main();
