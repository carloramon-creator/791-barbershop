
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAsaasExtended() {
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .single();

    const apiKey = settingsData?.value?.api_key;
    const baseURL = 'https://sandbox.asaas.com/api/v3';

    console.log(`--- EXTENDED ASYNC CHECK ---`);

    try {
        // 1. Listar Assinaturas
        const subsRes = await axios.get(`${baseURL}/subscriptions?limit=10&order=desc`, {
            headers: { 'access_token': apiKey }
        });
        console.log('\n--- LAST 10 SUBSCRIPTIONS ---');
        subsRes.data.data.forEach((s: any) => {
            console.log(`- ID: ${s.id} | Status: ${s.status} | Value: ${s.value} | Cycle: ${s.cycle} | Desc: ${s.description}`);
        });

        // 2. Listar Webhooks
        const webRes = await axios.get(`${baseURL}/webhook`, {
            headers: { 'access_token': apiKey }
        });
        console.log('\n--- WEBHOOK CONFIG ---');
        console.log(JSON.stringify(webRes.data, null, 2));

    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

checkAsaasExtended();
