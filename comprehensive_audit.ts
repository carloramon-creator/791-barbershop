import { getSupabaseAdmin } from './lib/supabase-server';

async function listAllTables() {
    const admin = getSupabaseAdmin();
    // We cannot query pg_catalog.pg_tables directly via PostgREST easily.
    // Instead, we will try to iterate over a list of common names or a few we know.
    // Actually, I can use the same technique to just try and see what's there.

    // I will try to see if I can use a generic query to get some schema info.
    // But since I don't have RPC, I'll just try the names I suspect.

    const candidates = [
        'users',
        'barbershop_users',
        'tenants',
        'appointments',
        'finance',
        'sales',
        'products',
        'services',
        'product_categories',
        'service_products',
        'product_movements',
        'system_settings',
        'system_plans',
        'system_addons',
        'system_coupons',
        'subscription_plans',
        'subscription_addons',
        'barbers',
        'client_queue'
    ];

    console.log('--- Comprehensive Schema Audit ---');
    for (const table of candidates) {
        const { data, error } = await admin.from(table).select('*').limit(1);
        if (error) {
            // console.log(`[${table}]: MISSING or ERROR - ${error.message}`);
        } else {
            const columns = Object.keys(data?.[0] || {});
            console.log(`[${table}]: ${columns.join(', ')}`);
        }
    }
}

listAllTables();
