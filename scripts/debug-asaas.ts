import { getSupabaseAdmin } from '../lib/supabase-server';
import AsaasClient from '../lib/asaas-client';

async function testAsaas() {
    try {
        console.log('--- DIAGNÓSTICO ASAAS ---');

        // 1. Buscar configurações
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const config = settingsData?.value;
        if (!config) {
            console.error('❌ Nenhuma configuração encontrada no banco.');
            return;
        }

        console.log('Ambiente:', config.environment);
        console.log('API Key (parcial):', config.api_key?.substring(0, 10) + '...');

        const asaas = new AsaasClient({
            apiKey: config.api_key,
            environment: config.environment || 'sandbox'
        });

        // 2. Testar conexão básica (Listar clientes)
        try {
            console.log('Testando conexão básica (GET /customers)...');
            const data = await (asaas as any).client.get('/customers?limit=1');
            console.log('✅ Conexão OK! Clientes encontrados:', data.data.totalCount);
        } catch (err: any) {
            console.error('❌ Erro na conexão básica:', err.response?.data || err.message);
        }

        // 3. Testar criação de Checkout fictício
        try {
            console.log('Testando criação de Checkout...');
            const testPayload = {
                billingTypes: ['CREDIT_CARD'],
                chargeTypes: ['DETACHED'],
                items: [{ name: 'Teste Antigravity', quantity: 1, value: 15.50 }],
                customerData: {
                    name: 'Cliente Teste Diagnostic',
                    cpfCnpj: '24970144000104', // CNPJ válido (gerado)
                    email: 'diagnostic@teste.com'
                },
                callback: {
                    successUrl: 'https://791barber.com/success',
                    cancelUrl: 'https://791barber.com/cancel',
                    autoRedirect: true
                }
            };
            const checkout = await asaas.createCheckout(testPayload);
            console.log(' ✅ Checkout criado com sucesso!');
            console.log('ID:', checkout.id);
            console.log('URL:', checkout.url);
        } catch (err: any) {
            console.error('❌ Erro ao criar Checkout (Resposta Completa):');
            if (err.response?.data) {
                console.log(JSON.stringify(err.response.data, null, 2));
            } else {
                console.log(err.message);
            }
        }

    } catch (e: any) {
        console.error('Erro crítico no diagnóstico:', e.message);
    }
}

testAsaas();
