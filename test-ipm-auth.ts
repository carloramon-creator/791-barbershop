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

async function testIPMAuth() {
    console.log("Testando autenticação IPM...\n");

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
    const username = config.ipm_username?.replace(/\D/g, '');
    const password = config.ipm_password;

    console.log("Testando com:");
    console.log("- URL: https://ws-saojose.atende.net/?pg=rest&service=WNERestServiceNFSe");
    console.log("- Username:", username);
    console.log("- Password:", password ? "***" + password.slice(-4) : "NÃO CONFIGURADO");
    console.log();

    // Teste 1: Autenticação simples
    console.log("=".repeat(60));
    console.log("TESTE 1: Verificando autenticação Basic Auth");
    console.log("=".repeat(60));

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    console.log("Authorization header (primeiros 30 chars):", authHeader.substring(0, 30) + "...");

    try {
        const response = await fetch('https://ws-saojose.atende.net/?pg=rest&service=WNERestServiceNFSe', {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });

        const responseText = await response.text();
        console.log("\nStatus:", response.status);
        console.log("Response:", responseText.substring(0, 200));

        if (response.status === 401) {
            console.log("\n❌ ERRO 401: Credenciais inválidas!");
            console.log("\nPossíveis causas:");
            console.log("1. Senha incorreta no banco de dados");
            console.log("2. Username deveria ser diferente (não o CNPJ)");
            console.log("3. Conta não tem permissão para API REST");
            console.log("\nVERIFIQUE:");
            console.log("- Tente fazer login no painel web: https://nfse-saojose.atende.net");
            console.log("- Use o mesmo usuário e senha que estão no banco");
            console.log("- Se funcionar no painel mas não na API, pode ser permissão");
        } else if (response.status === 200) {
            console.log("\n✅ Autenticação OK!");
        } else {
            console.log("\n⚠️  Status inesperado:", response.status);
        }

    } catch (error: any) {
        console.error("\n❌ Erro na requisição:", error.message);
    }
}

testIPMAuth();
