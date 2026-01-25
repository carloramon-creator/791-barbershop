import { getSupabaseAdmin } from '../lib/supabase-server';
import * as https from 'https';

async function testScopes() {
    console.log('\n--- 🕵️‍♀️ Diagnóstico de Escopos Inter ---');
    const { data: settings } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'inter_config').single();
    const config = settings?.value;

    if (!config) { console.error('Config não encontrada'); return; }

    const scopesToTest = [
        'boleto-cobranca.read', // Básico (Deve funcionar)
        'rec.read',             // Pix Automático Leitura
        'rec.write',            // Pix Automático Escrita
        'cobr.write',           // Cobrança Pix Auto
        'pagamento-pix.write',  // Teste extra
        'pix.write'             // Pix Normal
    ];

    const cert = (config.crt || '').replace(/\\n/g, '\n');
    const key = (config.key || '').replace(/\\n/g, '\n');

    for (const scope of scopesToTest) {
        process.stdout.write(`Testando escopo [${scope}]... `);
        try {
            const params = new URLSearchParams();
            params.append('client_id', config.client_id);
            params.append('client_secret', config.client_secret);
            params.append('scope', scope);
            params.append('grant_type', 'client_credentials');

            const result = await makeRequest(params.toString(), cert, key);
            if (result.access_token) {
                console.log('✅ ACEITO');
            } else {
                console.log('❌ REJEITADO (Sem token)');
            }
        } catch (e: any) {
            console.log(`❌ ERRO: ${e.message}`);
            if (e.body) console.log(`   Detalhe: ${e.body}`);
        }
    }
}

function makeRequest(body: string, cert: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const options: https.RequestOptions = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/oauth/v2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            },
            cert, key, rejectUnauthorized: false
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(JSON.parse(data));
                else reject({ message: `Status ${res.statusCode}`, body: data });
            });
        });
        req.on('error', e => reject(e));
        req.write(body);
        req.end();
    });
}

testScopes();
