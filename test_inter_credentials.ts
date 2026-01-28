import { InterAPIV3 } from './lib/inter-api-v3';
import { getSupabaseAdmin } from './lib/supabase-server';

async function main() {
    console.log('--- TESTE DE CREDENCIAIS INTER V3 ---');

    const { data: settingsData } = await getSupabaseAdmin().from('system_settings').select('value').eq('key', 'inter_config').single();
    const dbConfig = settingsData?.value;

    if (!dbConfig) {
        console.error('❌ Configuração não encontrada no banco.');
        return;
    }

    const clientId = dbConfig?.client_id;
    const certRaw = dbConfig?.crt || '';
    const keyRaw = dbConfig?.key || '';
    const cert = certRaw.replace(/\\n/g, '\n');
    const key = keyRaw.replace(/\\n/g, '\n');

    console.log(`Client ID: ${clientId ? '✅ OK' : '❌ AUSENTE'}`);
    console.log(`Certificado: ${cert.length > 50 ? '✅ OK (' + cert.length + ' chars)' : '❌ ERRO'}`);
    console.log(`Chave Privada: ${key.length > 50 ? '✅ OK (' + key.length + ' chars)' : '❌ ERRO'}`);

    const inter = new InterAPIV3({
        clientId: clientId || '',
        clientSecret: dbConfig?.client_secret || '',
        cert,
        key,
        accountNumber: dbConfig?.account_number
    });

    try {
        console.log('\nTentando obter Access Token...');
        const token = await inter.getAccessToken();
        console.log(`✅ Access Token obtido com sucesso!`);
        console.log(`Token parcial: ${token.substring(0, 10)}...`);

        console.log('\nTentando listar Webhooks Pix...');
        // Simular a chamada que verifica a chave Pix, que é crítica
        const pixKey = dbConfig.pix_key;
        if (pixKey) {
            console.log(`Chave Pix Configurada: ${pixKey}`);
            // Não temos um "getWebhook" fácil na classe, mas o createLocation ('/pix/v2/loc') é um teste bom de permissão "pix.write"
            // Vamos tentar criar um location dummy só para ver se a permissão bate
            try {
                const loc = await inter.createLocation('rec');
                console.log(`✅ Location criada com sucesso! ID: ${loc.id}`);
            } catch (locError: any) {
                console.error(`❌ Erro ao criar Location:`, locError?.message || locError);
                console.error('Detalhes:', JSON.stringify(locError?.headers || {}));
            }
        } else {
            console.warn('⚠️ Chave Pix não configurada no banco.');
        }

    } catch (error: any) {
        console.error('❌ ERRO FATAL DE AUTENTICAÇÃO:', error.message || error);
        if (error.headers) console.error('Headers:', error.headers);
        if (error.statusCode) console.error('Status Code:', error.statusCode);
        console.error('Body:', error.body || error.data);
    }
}

main();
