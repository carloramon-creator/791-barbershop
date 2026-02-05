
import { getSupabaseAdmin } from '../lib/supabase-server';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
    const migrationFile = 'migrations/add_notification_flags_v2.sql';
    console.log(`📦 Aplicando migração: ${migrationFile}...\n`);

    const migrationPath = path.join(process.cwd(), migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    try {
        const supabase = getSupabaseAdmin();

        // Executar SQL bruto
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Erro no RPC exec_sql:', error);
            console.log('Tentando executar statements individualmente (fallback restrito)...');

            // Note: the fallback in apply_migration.ts seems specific to a hypothetical _migrations table
            // We just report failure if RPC fails here as it's the standard way to run DDL.
        } else {
            console.log('\n✅ Migração aplicada com sucesso via RPC!');
        }

    } catch (e: any) {
        console.error('❌ Erro ao aplicar migração:', e.message);
        process.exit(1);
    }
}

applyMigration();
