
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectPayment() {
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .maybeSingle();

    const apiKey = settingsData?.value?.api_key;
    if (!apiKey) {
        console.error('API Key not found');
        return;
    }
    const baseURL = 'https://sandbox.asaas.com/api/v3';

    // Usando o ID da assinatura R$ 96,20 que vimos no script anterior
    const paymentId = 'pay_i38z4p7m8h0asid7'; // Vou pegar o mais recente

    try {
        const listRes = await axios.get(`${baseURL}/payments?limit=5`, {
            headers: { 'access_token': apiKey }
        });
        const lastPayment = listRes.data.data[0];
        console.log(`--- INSPECTING PAYMENT ${lastPayment.id} ---`);
        console.log(JSON.stringify(lastPayment, null, 2));

    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

inspectPayment();
