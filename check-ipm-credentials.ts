import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO: Variáveis de ambiente do Supabase não encontradas.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCredentials() {
    console.log("Verificando credenciais IPM no banco...\n");

    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'nfse_config')
        .single();

    if (error) {
        console.error("Erro ao buscar configuração:", error);
        return;
    }

    const config = data?.value || {};

    console.log("=".repeat(60));
    console.log("CONFIGURAÇÃO ATUAL:");
    console.log("=".repeat(60));
    console.log("Municipal Code:", config.municipal_code);
    console.log("IPM Username:", config.ipm_username);
    console.log("IPM Password:", config.ipm_password ? "***" + config.ipm_password.slice(-4) : "NÃO CONFIGURADO");
    console.log("Auto Emit:", config.auto_emit);
    console.log("Test Mode:", config.nfse_test_mode);
    console.log("=".repeat(60));

    // Verificar formato do username
    console.log("\nANÁLISE DO USERNAME:");
    if (config.ipm_username) {
        const cleanUsername = config.ipm_username.replace(/\D/g, '');
        console.log("- Original:", config.ipm_username);
        console.log("- Apenas números:", cleanUsername);
        console.log("- Tamanho:", config.ipm_username.length, "caracteres");
        console.log("- É CNPJ?", cleanUsername.length === 14 ? "SIM" : "NÃO");
    }

    console.log("\n" + "=".repeat(60));
    console.log("FORMATOS POSSÍVEIS PARA TESTAR:");
    console.log("=".repeat(60));
    console.log("1. CNPJ sem formatação:", config.ipm_username?.replace(/\D/g, ''));
    console.log("2. CNPJ com formatação:", config.ipm_username);
    console.log("3. Código de usuário (se diferente do CNPJ)");
    console.log("\nVERIFIQUE: No painel do IPM/Atende.net, qual é o 'usuário' usado para login?");
    console.log("- Se for o CNPJ: use formato sem pontos/barras");
    console.log("- Se for um código específico: atualize no banco");
}

checkCredentials();
