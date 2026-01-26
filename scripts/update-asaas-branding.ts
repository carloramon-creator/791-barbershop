import { getSupabaseAdmin } from '../lib/supabase-server';
import AsaasClient from '../lib/asaas-client';

async function updateAsaasBranding() {
    try {
        console.log('🎨 Atualizando branding visual do Asaas...');

        // 1. Obter configurações do Asaas
        const { data: settingsData } = await getSupabaseAdmin()
            .from('system_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const asaasConfig = settingsData?.value;
        const apiKey = asaasConfig?.api_key || process.env.ASAAS_API_KEY;
        const environment = (asaasConfig?.environment || 'sandbox') as 'sandbox' | 'production';

        if (!apiKey) {
            throw new Error('Asaas API Key não configurada');
        }

        const asaas = new AsaasClient({ apiKey, environment });

        // 2. Atualizar APENAS logo e visual da fatura
        console.log('🖼️  Atualizando logo e customização visual...');

        const logoUrl = 'https://791barber.com/logo-791.jpg';

        await asaas.customizeInvoice({
            logoUrl: logoUrl,
            primaryColor: '#1e40af',
            secondaryColor: '#f59e0b',
            fontColor: '#1e293b',
            observations: '791 Soluções Empresariais LTDA\nSão José/SC\ncontato@791solucoes.com.br | (48) 3333-3379'
        });

        console.log('✅ Logo e visual atualizados!');

        // 3. Salvar configuração no banco
        await getSupabaseAdmin()
            .from('system_settings')
            .upsert({
                key: 'asaas_branding',
                value: {
                    logoUrl,
                    primaryColor: '#1e40af',
                    secondaryColor: '#f59e0b',
                    fontColor: '#1e293b',
                    displayInfo: 'São José/SC | contato@791solucoes.com.br'
                }
            });

        console.log('✅ Configurações salvas!');
        console.log('\n🎉 Branding visual atualizado com sucesso!');
        console.log('🖼️  Logo: https://791barber.com/logo-791.jpg');
        console.log('📍 Exibição: São José/SC');
        console.log('📧 Email exibido: contato@791solucoes.com.br');
        console.log('\n⚠️  Nota: O email oficial da conta Asaas continua sendo ramon@791solucoes.com.br');
        console.log('   (Para alterar, é necessário atualizar todos os dados cadastrais via painel Asaas)');

    } catch (error: any) {
        console.error('❌ Erro ao atualizar branding:', error?.response?.data || error.message);
        throw error;
    }
}

updateAsaasBranding()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
