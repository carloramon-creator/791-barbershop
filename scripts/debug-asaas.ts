import { supabaseAdmin } from '../lib/supabase-server';
import AsaasClient from '../lib/asaas-client';

async function testAsaas() {
    try {
        console.log('--- DIAGNÓSTICO ASAAS ---');

        // 1. Buscar configurações
        const { data: settingsData } = await supabaseAdmin
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
                minutesToExpire: 15,
                items: [{ name: 'Teste Diagnóstico', quantity: 1, value: 10.00 }],
                customerData: {
                    name: 'Cliente Teste',
                    cpfCnpj: '00000000000',
                    email: 'teste@asaas.com'
                },
                callback: {
                    successUrl: 'http://localhost:3000/success',
                    autoRedirect: true
                }
            };
            const checkout = await asaas.createCheckout(testPayload);
            console.log(' ✅ Checkout criado com sucesso!');
            console.log('ID:', checkout.id);
            console.log('URL:', checkout.url);
            console.log('Full Response:', JSON.stringify(checkout, null, 2));
        } catch (err: any) {
            console.error('❌ Erro ao criar Checkout:', err.response?.data || err.message);
        }

    } catch (e: any) {
        console.error('Erro crítico no diagnóstico:', e.message);
    }
}

testAsaas();
