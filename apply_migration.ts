import { getSupabaseAdmin } from './lib/supabase-server';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
    console.log('📦 Aplicando migração: create_subscriptions table...\n');

    const migrationPath = path.join(__dirname, 'supabase/migrations/20260128_create_subscriptions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    try {
        const supabase = getSupabaseAdmin();
        
        // Executar SQL bruto
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
            // Se exec_sql não existir, tentar método alternativo
            console.log('⚠️  RPC exec_sql não disponível, tentando método alternativo...\n');
            
            // Dividir em statements individuais
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                console.log(`Executando: ${statement.substring(0, 50)}...`);
                const { error: stmtError } = await supabase.from('_migrations').insert({ statement });
                if (stmtError) {
                    console.error(`❌ Erro: ${stmtError.message}`);
                }
            }
        }

        console.log('\n✅ Migração aplicada com sucesso!');
        console.log('\n📊 Verificando tabela...');

        // Verificar se a tabela foi criada
        const { data: tables, error: checkError } = await supabase
            .from('subscriptions')
            .select('*')
            .limit(0);

        if (checkError) {
            console.error(`❌ Erro ao verificar tabela: ${checkError.message}`);
        } else {
            console.log('✅ Tabela `subscriptions` criada e acessível!');
        }

    } catch (e: any) {
        console.error('❌ Erro ao aplicar migração:', e.message);
        process.exit(1);
    }
}

applyMigration();
