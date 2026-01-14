import { getSupabaseAdmin } from './lib/supabase-server';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    const admin = getSupabaseAdmin();
    const migrationPath = path.join(process.cwd(), 'migrations', 'security_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executando migração de segurança (RLS)...');

    // Executar via rpc genérico se disponível, ou via comandos individuais
    // Como SQL de RLS é complexo para o PostgREST, usamos um helper de sistema se existir
    // ou tentamos executar via admin direto para o banco.

    // Tentativa: Enviar o SQL bruto através de um RPC helper (se o projeto tiver)
    // Se não tiver, o usuário precisará rodar no dashboard.

    const { error } = await admin.rpc('exec_sql', { sql_query: sql });

    if (error) {
        if (error.code === 'PGRST202') {
            console.error('\n[AVISO]: O RPC "exec_sql" não está instalado no seu Supabase.');
            console.error('Por favor, siga estas etapas:');
            console.error('1. Abra o Dashboard do Supabase.');
            console.error('2. Vá em "SQL Editor".');
            console.error('3. Copie o conteúdo de: migrations/security_rls.sql');
            console.error('4. Cole e clique em "Run".\n');
        } else {
            console.error('Erro ao executar migração:', error);
        }
        process.exit(1);
    }

    console.log('Migração concluída com sucesso!');
}

runMigration();
