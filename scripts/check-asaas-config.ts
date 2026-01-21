
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAsaasConfig() {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .single();

    if (error) {
        console.error('Error fetching asaas_config:', error);
        return;
    }

    console.log('--- FULL ASAAS CONFIG ---');
    console.log(JSON.stringify(data.value, null, 2));
    console.log('-------------------------');
}

checkAsaasConfig();
