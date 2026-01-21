
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAsaasAccount() {
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .single();

    const config = settingsData?.value;
    if (!config?.api_key) {
        console.error('API Key not found in DB');
        return;
    }

    const apiKey = config.api_key;
    const isSandbox = apiKey.includes('hmlg') || config.environment === 'sandbox';
    const baseURL = isSandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';

    console.log(`--- CONNECTING TO ASAAS (${isSandbox ? 'SANDBOX' : 'PRODUCTION'}) ---`);

    try {
        const res = await axios.get(`${baseURL}/myAccount/commercialInfo`, {
            headers: { 'access_token': apiKey }
        });
        console.log('Commercial Info:', JSON.stringify(res.data, null, 2));

        const accountRes = await axios.get(`${baseURL}/myAccount`, {
            headers: { 'access_token': apiKey }
        });
        console.log('Account Info:', JSON.stringify(accountRes.data, null, 2));

    } catch (error: any) {
        console.error('Error connecting to Asaas:', error.response?.data || error.message);
    }
}

checkAsaasAccount();
