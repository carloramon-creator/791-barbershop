import { AsaasClient } from '../lib/asaas-client';
import { getSupabaseAdmin } from '../lib/supabase-server';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function simulateAsaasCheckout() {
    console.log('\n--- 🧪 Simulando Checkout Asaas (Sandbox) ---');
    try {
        const { data: settings } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const config = settings?.value;
        const apiKey = config?.api_key || process.env.ASAAS_API_KEY;
        const environment = 'sandbox'; // Forçar sandbox para este teste

        if (!apiKey) {
            console.error('❌ API Key do Asaas não encontrada.');
            return;
        }

        const asaas = new AsaasClient({ apiKey, environment });

        // 1. Criar cliente de teste
        console.log('👤 Criando/Buscando cliente de teste...');
        const customer = await asaas.createCustomer({
            name: 'Teste Sandbox 791',
            email: 'test-sandbox@791barber.com',
            cpfCnpj: '07515863000140',
            mobilePhone: '47988776655',
            phone: '4733445566',
            address: 'Rua de Teste',
            addressNumber: '100',
            province: 'Centro',
            postalCode: '89200000'
        });

        // 2. Gerar Cobrança Pix
        console.log('💰 Gerando cobrança Pix de R$ 5,00...');
        const payment = await asaas.createPayment({
            customer: customer.id,
            billingType: 'PIX',
            value: 5.0,
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            description: 'Teste Sandbox - Assinatura 791 Barber',
            externalReference: `TEST_SANDBOX_${Date.now()}`
        });

        const pixData = await asaas.getPixQrCode(payment.id);

        console.log('\n✅ Cobrança gerada com sucesso!');
        console.log(`🔗 Link de Pagamento: ${payment.invoiceUrl}`);
        console.log(`🔑 Pix Copia e Cola: ${pixData.payload}`);
        console.log('\n--- ATENÇÃO ---');
        console.log('Você pode acessar o link acima e simular o pagamento no ambiente de Sandbox do Asaas.');

    } catch (error: any) {
        console.error('❌ Erro no Asaas:', error.response?.data || error.message);
    }
}

async function main() {
    console.log('🚀 Iniciando Simulação de Fluxo Sandbox');
    await simulateAsaasCheckout();
    process.exit(0);
}

main();
