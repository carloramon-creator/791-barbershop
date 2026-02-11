import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO: Variáveis de ambiente não encontradas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateIPMPassword() {
    console.log("=".repeat(60));
    console.log("ATUALIZAR SENHA IPM NO BANCO DE DADOS");
    console.log("=".repeat(60));
    console.log();

    // Solicitar nova senha
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Digite a NOVA senha do IPM: ', async (newPassword: string) => {
        readline.close();

        if (!newPassword || newPassword.trim() === '') {
            console.log("❌ Senha vazia. Operação cancelada.");
            return;
        }

        console.log("\nAtualizando senha no banco de dados...");

        // Buscar configuração atual
        const { data, error: fetchError } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'nfse_config')
            .single();

        if (fetchError) {
            console.error("❌ Erro ao buscar configuração:", fetchError);
            return;
        }

        const config = data?.value || {};
        config.ipm_password = newPassword.trim();

        // Atualizar no banco
        const { error: updateError } = await supabase
            .from('system_settings')
            .update({ value: config })
            .eq('key', 'nfse_config');

        if (updateError) {
            console.error("❌ Erro ao atualizar:", updateError);
            return;
        }

        console.log("✅ Senha atualizada com sucesso!");
        console.log("\nAgora execute o teste:");
        console.log("npx tsx debug-ipm-emission.ts");
    });
}

updateIPMPassword();
