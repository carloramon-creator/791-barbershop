import { InterAPIV3 } from './lib/inter-api-v3';
import { getSupabaseAdmin } from './lib/supabase-server';

async function testScope(inter: InterAPIV3, scopes: string, label: string) {
    console.log(`\nTesting Scope: [${label}]`);
    console.log(`Scopes Requested: ${scopes}`);
    try {
        // Mockando temporariamente o método getAccessToken da instância para aceitar escopos customizados
        // Como o método é privado/hardcoded na classe original, vamos fazer uma chamada manual similar aqui
        const params = new URLSearchParams();
        params.append('client_id', (inter as any).config.clientId);
        params.append('client_secret', (inter as any).config.clientSecret);
        params.append('scope', scopes);
        params.append('grant_type', 'client_credentials');

        const body = params.toString();
        const options = {
            hostname: 'cdpj.partners.bancointer.com.br',
            port: 443,
            path: '/oauth/v2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            },
            cert: (inter as any).config.cert,
            key: (inter as any).config.key,
            rejectUnauthorized: false
        };

        const response: any = await (inter as any).makeRequest(options, body);
        console.log(`✅ SUCCESS! Token obtained.`);
        // console.log(`Access Token: ${response.access_token.substring(0, 10)}...`);
        return true;
    } catch (e: any) {
        console.error(`❌ FAILED: ${e.message || JSON.stringify(e)}`);
        return false;
    }
}

async function main() {
    console.log('--- DIAGNÓSTICO DE ESCOPOS INTER V3 ---');

    const { data: settingsData } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'inter_config').single();
    const dbConfig = settingsData?.value;

    if (!dbConfig) { console.error('Config not found'); return; }

    const cert = (dbConfig.crt || '').replace(/\\n/g, '\n');
    const key = (dbConfig.key || '').replace(/\\n/g, '\n');

    const inter = new InterAPIV3({
        clientId: dbConfig.client_id,
        clientSecret: dbConfig.client_secret,
        cert,
        key
    });

    console.log(`Client ID em uso: ...${dbConfig.client_id.slice(-6)}`);

    // 1. Teste Básico (Deve funcionar se o usuário diz que boleto funciona)
    await testScope(inter, 'boleto-cobranca.read boleto-cobranca.write', 'BOLETO');

    // 2. Teste Pix (Deve funcionar se Pix funciona)
    await testScope(inter, 'pix.read pix.write', 'PIX STANDARD');

    // 3. Teste Recorrência (O suspeito)
    await testScope(inter, 'rec.read rec.write', 'RECORRÊNCIA');

    // 4. Teste Venda (Combo atual)
    await testScope(inter, 'pix.read pix.write rec.read rec.write boleto-cobranca.read boleto-cobranca.write', 'COMBO PLETO');
}

main();
