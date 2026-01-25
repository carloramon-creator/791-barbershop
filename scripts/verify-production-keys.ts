import { AsaasClient } from '../lib/asaas-client';
import { InterAPIV3 } from '../lib/inter-api-v3';
import { getSupabaseAdmin } from '../lib/supabase-server';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyAsaas() {
    console.log('\n--- 🧪 Verificando Asaas ---');
    try {
        const { data: settings } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const config = settings?.value;
        const apiKey = config?.api_key || process.env.ASAAS_API_KEY;
        const environment = config?.environment || 'sandbox';

        if (!apiKey) {
            console.error('❌ API Key do Asaas não encontrada.');
            return;
        }

        console.log(`📡 Conectando ao Asaas (${environment})...`);
        const asaas = new AsaasClient({ apiKey, environment: environment as 'sandbox' | 'production' });

        // Testa buscando informações comerciais (endpoint simples)
        const info = await asaas.getCommercialInfo();
        console.log('✅ Conexão Asaas OK!');
        console.log(`🏢 Empresa: ${info.companyName || 'Não informado'}`);
    } catch (error: any) {
        console.error('❌ Erro no Asaas:', error.response?.data || error.message);
    }
}

async function verifyInter() {
    console.log('\n--- 🧪 Verificando Banco Inter ---');
    try {
        const { data: settings } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'inter_config')
            .single();

        const config = settings?.value;
        const clientId = config?.client_id || process.env.INTER_CLIENT_ID;
        const clientSecret = config?.client_secret || process.env.INTER_CLIENT_SECRET;
        const cert = (config?.crt || process.env.INTER_CERT_CONTENT || '').replace(/\\n/g, '\n');
        const key = (config?.key || process.env.INTER_KEY_CONTENT || '').replace(/\\n/g, '\n');

        if (!clientId || !cert || !key) {
            console.error('❌ Configurações do Inter incompletas (ClientId, Cert ou Key ausentes).');
            return;
        }

        console.log('📡 Solicitando Token OAuth2 ao Inter...');
        const inter = new InterAPIV3({
            clientId,
            clientSecret: clientSecret || '',
            cert,
            key,
            accountNumber: config?.account_number || config?.accountNumber
        });

        const token = await inter.getAccessToken();
        console.log('✅ Token Inter obtido com sucesso!');

        // Opcional: Listar cobranças recentes para validar escopo
        const now = new Date();
        const past = new Date();
        past.setDate(now.getDate() - 1);

        const start = past.toISOString().split('T')[0];
        const end = now.toISOString().split('T')[0];

        console.log(`📅 Verificando listagem de cobranças (${start} a ${end})...`);
        const list = await inter.listBillings(start, end);
        console.log(`✅ Listagem Inter OK! (${list.totalElementos || 0} elementos encontrados)`);
    } catch (error: any) {
        console.error('❌ Erro no Banco Inter:', error.message || error);
    }
}

async function main() {
    console.log('🚀 Iniciando Diagnóstico de Produção: Asaas & Inter');
    await verifyAsaas();
    await verifyInter();
    process.exit(0);
}

main();
