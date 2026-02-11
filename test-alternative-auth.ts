
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TEST_USERNAME = "9099566"; // Cadastro que aparece no print: 9099566
const TEST_PASSWORD = "R@myas2025!!";

async function testAlternativeAuth() {
    console.log("=".repeat(60));
    console.log("TESTE DE AUTENTICAÇÃO COM CÓDIGO [148897]");
    console.log("=".repeat(60));

    const authHeader = 'Basic ' + Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString('base64');

    try {
        const response = await fetch('https://ws-saojose.atende.net/?pg=rest&service=WNERestServiceNFSe', {
            method: 'GET',
            headers: {
                'Authorization': authHeader
            }
        });

        const responseText = await response.text();
        console.log("Status HTTP:", response.status);
        console.log("Resposta:", responseText);

        if (response.status === 200 || response.status === 405) {
            console.log("\n✅ SUCESSO! O usuário correto é o código: " + TEST_USERNAME);
        } else {
            console.log("\n❌ Falhou também com o código.");
        }
    } catch (e: any) {
        console.error("Erro:", e.message);
    }
}

testAlternativeAuth();
