
import { getSupabaseAdmin } from '../lib/supabase-server';
import * as fs from 'fs';
import * as path from 'path';

async function fixStorageRLS() {
    console.log('🛡️ Iniciando correção de RLS para fotos...\n');

    const migrationPath = path.join(process.cwd(), 'migrations', 'security', '006_storage_logos_policy.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    const supabase = getSupabaseAdmin();

    // Dividir em statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executando ${statements.length} comandos SQL...`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`[${i + 1}/${statements.length}] Executando...`);

        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

        if (error) {
            console.error(`❌ Erro no comando ${i + 1}:`, error.message);
            console.log('\n💡 Dica: Se o erro for "function exec_sql does not exist", você precisará rodar o SQL abaixo manualmente no Supabase Dashboard.');
            process.exit(1);
        }
        console.log(`✅ Sucesso.`);
    }

    console.log('\n✨ Correção de RLS concluída com sucesso!');
}

fixStorageRLS().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
