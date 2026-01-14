import { getSupabaseAdmin } from './lib/supabase-server';

async function auditSchema() {
    const admin = getSupabaseAdmin();
    const tables = [
        'tenants',
        'barbershop_users',
        'appointments',
        'system_settings',
        'system_plans',
        'system_addons',
        'system_coupons',
        'product_categories',
        'service_products',
        'services',
        'products',
        'finance',
        'sales',
        'product_movements',
        'client_queue'
    ];

    console.log('--- Database Schema Audit ---');
    for (const table of tables) {
        const { data, error } = await admin.from(table).select('*').limit(1);
        if (error) {
            console.log(`[${table}]: ERROR - ${error.message}`);
        } else {
            const columns = Object.keys(data?.[0] || {});
            console.log(`[${table}]: ${columns.join(', ')}`);
        }
    }
}

auditSchema();
