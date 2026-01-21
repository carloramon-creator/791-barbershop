
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAsaasPayments() {
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .single();

    const config = settingsData?.value;
    const apiKey = config.api_key;
    const baseURL = 'https://sandbox.asaas.com/api/v3';

    console.log(`--- LISTING LAST 10 PAYMENTS (SANDBOX) ---`);

    try {
        const res = await axios.get(`${baseURL}/payments?limit=10&order=desc`, {
            headers: { 'access_token': apiKey }
        });

        console.log('Total Payments:', res.data.totalCount);
        res.data.data.forEach((p: any) => {
            console.log(`- ID: ${p.id} | Status: ${p.status} | Value: ${p.value} | Date: ${p.dateCreated} | ExtRef: ${p.externalReference} | Billing: ${p.billingType}`);
        });

    } catch (error: any) {
        console.error('Error fetching payments:', error.response?.data || error.message);
    }
}

checkAsaasPayments();
