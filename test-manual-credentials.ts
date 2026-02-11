import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// INSTRUÇÕES:
// 1. Edite as variáveis abaixo com as credenciais que você quer testar
// 2. Execute: npx tsx test-manual-credentials.ts

const TEST_USERNAME = "61887941000183"; // Tente: CNPJ, código de usuário, etc.
const TEST_PASSWORD = "SUA_SENHA_AQUI";  // Coloque a senha real aqui

async function testManualAuth() {
    console.log("=".repeat(60));
    console.log("TESTE MANUAL DE AUTENTICAÇÃO IPM");
    console.log("=".repeat(60));
    console.log("URL: https://ws-saojose.atende.net/?pg=rest&service=WNERestServiceNFSe");
    console.log("Username:", TEST_USERNAME);
    console.log("Password:", TEST_PASSWORD.substring(0, 2) + "***" + TEST_PASSWORD.slice(-2));
    console.log("=".repeat(60));

    const authHeader = 'Basic ' + Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString('base64');

    try {
        console.log("\nEnviando requisição GET para testar autenticação...\n");

        const response = await fetch('https://ws-saojose.atende.net/?pg=rest&service=WNERestServiceNFSe', {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });

        const responseText = await response.text();

        console.log("Status HTTP:", response.status);
        console.log("Resposta:", responseText);
        console.log();

        if (response.status === 401) {
            console.log("❌ ERRO 401: Credenciais inválidas!");
            console.log("\nO que fazer:");
            console.log("1. Verifique se a senha está correta");
            console.log("2. Confirme se o username é realmente o CNPJ");
            console.log("3. Entre em contato com o suporte IPM/Atende.net");
            console.log("4. Pergunte sobre credenciais específicas para API REST");
        } else if (response.status === 200 || response.status === 405) {
            console.log("✅ AUTENTICAÇÃO OK!");
            console.log("(Status 405 é normal para GET, significa que a autenticação passou)");
        } else {
            console.log("⚠️  Status inesperado:", response.status);
        }

    } catch (error: any) {
        console.error("❌ Erro na requisição:", error.message);
    }
}

if (TEST_PASSWORD === "SUA_SENHA_AQUI") {
    console.log("❌ ERRO: Você precisa editar o arquivo e colocar a senha real!");
    console.log("Abra o arquivo: test-manual-credentials.ts");
    console.log("Edite a linha: const TEST_PASSWORD = \"SUA_SENHA_AQUI\";");
    process.exit(1);
}

testManualAuth();
