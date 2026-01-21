
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCreateCheckout() {
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .single();

    const apiKey = settingsData?.value?.api_key;
    const baseURL = 'https://sandbox.asaas.com/api/v3';

    const payload = {
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        externalReference: 'test-ref-' + Date.now(),
        callback: {
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel'
        },
        subscription: {
            cycle: 'MONTHLY',
            nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        items: [{
            name: 'Plano Teste',
            quantity: 1,
            value: 10.0
        }],
        customerData: {
            name: 'Teste Local',
            email: 'teste@example.com',
            cpfCnpj: '61887941000183',
            phoneNumber: '48991803379',
            address: 'RUA EUGENIO PORTELA',
            addressNumber: '415',
            postalCode: '88117010',
            province: 'BARREIROS'
        }
    };

    try {
        const res = await axios.post(`${baseURL}/checkouts`, payload, {
            headers: { 'access_token': apiKey }
        });
        console.log('--- CHECKOUT RESPONSE ---');
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error: any) {
        console.error('Error:', JSON.stringify(error.response?.data || error.message, null, 2));
    }
}

testCreateCheckout();
