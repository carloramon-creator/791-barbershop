
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CNPJ_FORMATADO = "61.887.941/0001-83";
const CNPJ_RAW = "61887941000183";
const PASSWORD = "R@myas2025!!";
const CIDADE = "saojose";

async function testCombinations() {
    console.log("=".repeat(60));
    console.log("TESTE DE COMBINAÇÕES IPM (MULTIPART/FORM-DATA)");
    console.log("=".repeat(60));

    const urls = [
        `https://nfse-${CIDADE}.atende.net/atende.php?pg=rest&service=WNERestServiceNFSe`,
        `https://nfse-${CIDADE}.atende.net/atende.php?pg=rest&service=WNERestServiceNFSe&cidade=saojose`,
        `https://nfse-${CIDADE}.atende.net/atende.php?pg=rest&service=WNERestServiceNFSe&cidade=8303`
    ];

    const credentials = [
        { user: CNPJ_FORMATADO, label: "CNPJ Formatado" },
        { user: CNPJ_RAW, label: "CNPJ Raw" }
    ];

    for (const url of urls) {
        for (const cred of credentials) {
            console.log(`\n> TESTANDO: ${cred.label} | URL: ${url}`);

            const auth = Buffer.from(`${cred.user}:${PASSWORD}`).toString('base64');
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
    <cpfcnpj>${CNPJ_RAW}</cpfcnpj>
    <cidade>8303</cidade>
  </prestador>
</nfse>`;

            form.append('xml', Buffer.from(xmlMock), {
                filename: 'arquivo.xml',
                contentType: 'text/xml'
            });

            try {
                const response = await axios.post(url, form, {
                    headers: {
                        ...form.getHeaders(),
                        'Authorization': `Basic ${auth}`
                    },
                    validateStatus: () => true
                });

                console.log("  Status:", response.status);
                if (response.status !== 401 && response.status !== 404 && response.status !== 400) {
                    console.log("  ✅ RESPOSTA SUCESSO OU ERRO DE NEGÓCIO SEGUIDO!");
                    console.log("  Resposta:", JSON.stringify(response.data, null, 2));
                    return; // Achamos uma combinação que logou!
                } else if (response.status === 400) {
                    console.log("  ❌ 400 (Parâmetros Inválidos)");
                } else if (response.status === 401) {
                    console.log("  ❌ 401 (Acesso Negado)");
                }
            } catch (e: any) {
                console.log("  ❌ Erro:", e.message);
            }
        }
    }
}

testCombinations();
