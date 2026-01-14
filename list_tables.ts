import { getSupabaseAdmin } from './lib/supabase-server';

async function listTables() {
    const admin = getSupabaseAdmin();
    const { data: tables, error } = await admin
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

    if (error) {
        console.error('Error fetching tables:', error);
        return;
    }

    console.log('Tables found:', tables.map(t => t.tablename).sort());
}

listTables();
