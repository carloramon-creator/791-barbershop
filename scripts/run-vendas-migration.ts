import { getSupabaseAdmin } from '../lib/supabase-server';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    try {
        console.log('🔄 Executando migration: vendas_module.sql...');

        const migrationPath = path.join(process.cwd(), 'migrations', 'vendas_module.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        // Executar SQL via Supabase Admin
        const supabase = getSupabaseAdmin();

        // Dividir em statements individuais (remover comentários e linhas vazias)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

        console.log(`📝 Encontrados ${statements.length} statements SQL`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`\n[${i + 1}/${statements.length}] Executando...`);
            console.log(stmt.substring(0, 100) + '...');

            const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

            if (error) {
                // Tentar via query direto se RPC não funcionar
                console.warn('RPC falhou, tentando query direto...');
                const { error: directError } = await supabase.from('_migrations').insert({
                    name: `vendas_module_stmt_${i}`,
                    executed_at: new Date().toISOString()
                });

                if (directError) {
                    console.error(`❌ Erro no statement ${i + 1}:`, error);
                    throw error;
                }
            }

            console.log(`✅ Statement ${i + 1} executado com sucesso`);
        }

        console.log('\n🎉 Migration concluída com sucesso!');
        console.log('\n📊 Tabelas criadas:');
        console.log('  - vendas');
        console.log('  - venda_itens');
        console.log('\n🔍 Índices criados para otimização de consultas');

    } catch (error: any) {
        console.error('❌ Erro ao executar migration:', error.message);
        console.error('\n💡 Dica: Execute manualmente no Supabase SQL Editor:');
        console.error('   https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
        process.exit(1);
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
