
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
        externalReference: 'test-final-' + Date.now(),
        callback: {
            successUrl: 'https://791barber.com/asaas/checkout/success',
            cancelUrl: 'https://791barber.com/asaas/checkout/cancel'
        },
        subscription: {
            cycle: 'MONTHLY',
            nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Teste de Descricao v2'
        },
        items: [{
            name: 'Plano Teste Final',
            quantity: 1,
            value: 10.0
        }],
        customerData: {
            name: 'Ramon Teste Final',
            email: 'ramon@791solucoes.com.br',
            cpfCnpj: '61887941000183',
            phoneNumber: '48991803379',
            mobilePhone: '48991803378', // Added mobilePhone just in case
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
        console.log('--- CHECKOUT FINAL RESPONSE ---');
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error: any) {
        if (error.response?.data) {
            console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testCreateCheckout();
