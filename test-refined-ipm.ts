
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CNPJ_FORMATADO = "61.887.941/0001-83";
const PASSWORD = "R@myas2025!!";
const CIDADE = "saojose"; // conforme print do usuário nfse-saojose.atende.net

async function testRefinedIPM() {
    console.log("=".repeat(60));
    console.log("TESTE REFINADO IPM (BASEADO NA DOCUMENTAÇÃO)");
    console.log("=".repeat(60));

    // O print mostra: https://nomedomunicipio.atende.net/atende.php?pg=rest&service=WNERestServiceNFSecidade=padrao
    // Vamos tentar seguir exatamente esse padrão, ajustando para São José
    const url = `https://nfse-${CIDADE}.atende.net/atende.php?pg=rest&service=WNERestServiceNFSecidade=padrao`;

    console.log("- URL:", url);
    console.log("- Username (Formatado):", CNPJ_FORMATADO);

    const auth = Buffer.from(`${CNPJ_FORMATADO}:${PASSWORD}`).toString('base64');

    // Conforme print: $xmldata = ['xml'=>$cfile];
    // Content-Type: multipart/form-data
    const form = new FormData();
    const xmlMock = `<?xml version="1.0" encoding="UTF-8"?>
<nfse>
  <nfse_teste>1</nfse_teste>
  <identificador>TESTE-${Date.now()}</identificador>
  <nf>
    <serie_nfse>1</serie_nfse>
    <data_fato_gerador>11/02/2026</data_fato_gerador>
    <valor_total>1,00</valor_total>
    <observacao>Teste de Autenticação - Documentação</observacao>
  </nf>
  <prestador>
    <cpfcnpj>${CNPJ_FORMATADO.replace(/\D/g, '')}</cpfcnpj>
    <cidade>8303</cidade>
  </prestador>
</nfse>`;

    form.append('xml', Buffer.from(xmlMock), {
        filename: 'arquivo.xml',
        contentType: 'text/xml'
    });

    try {
        console.log("\nEnviando requisição POST (multipart/form-data)...");
        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Basic ${auth}`
            },
            validateStatus: () => true // Pega qualquer status
        });

        console.log("Status HTTP:", response.status);
        console.log("Headers:", JSON.stringify(response.headers, null, 2));
        console.log("Resposta:", JSON.stringify(response.data, null, 2));

        if (response.status === 200) {
            console.log("\n✅ SUCESSO! A autenticação funcionou com CNPJ formatado.");
        } else if (response.status === 401) {
            console.log("\n❌ Erro 401: Tentando SEM formatação...");

            // Tentar sem formatação no Basic Auth mas mantendo o resto
            const authSimples = Buffer.from(`${CNPJ_FORMATADO.replace(/\D/g, '')}:${PASSWORD}`).toString('base64');
            const response2 = await axios.post(url, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Basic ${authSimples}`
                },
                validateStatus: () => true
            });
            console.log("Status HTTP (Sem Formatação):", response2.status);
            console.log("Resposta:", JSON.stringify(response2.data, null, 2));
        }

    } catch (e: any) {
        console.error("Erro fatal:", e.message);
    }
}

testRefinedIPM();
