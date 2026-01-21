
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findLatestUniquePayment() {
    const { data: settingsData, error: dbError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .maybeSingle();

    if (dbError || !settingsData) {
        console.error('Database error or no settings found:', dbError);
        return;
    }

    const config = settingsData?.value;
    const apiKey = config?.api_key;
    if (!apiKey) {
        console.error('API Key not found in settings JSON');
        return;
    }

    const baseURL = 'https://sandbox.asaas.com/api/v3';

    console.log(`--- MONITORING LATEST PAYMENTS (SANDBOX) ---`);

    try {
        const res = await axios.get(`${baseURL}/payments?limit=5&order=desc`, {
            headers: { 'access_token': apiKey }
        });

        console.log('Recent Payments:');
        res.data.data.forEach((p: any) => {
            console.log(`- ID: ${p.id} | Status: ${p.status} | Value: ${p.value} | Date: ${p.dateCreated} | ExtRef: ${p.externalReference} | Desc: ${p.description}`);
        });

    } catch (error: any) {
        console.error('Error fetching payments:', error.response?.data || error.message);
    }
}

findLatestUniquePayment();
