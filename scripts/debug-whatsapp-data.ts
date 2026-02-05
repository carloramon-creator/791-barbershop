
import { createClient } from '@supabase/supabase-js';

const url = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const key = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(url, key);

async function run() {
    console.log('--- WHATSAPP CONFIGS ---');
    const { data: configs, error: configError } = await supabase.from('whatsapp_configs').select('*');
    if (configError) console.error(configError);
    else console.log(JSON.stringify(configs, null, 2));

    console.log('\n--- TENANTS ---');
    const { data: tenants, error: tenantError } = await supabase.from('tenants').select('id, name, slug');
    if (tenantError) console.error(tenantError);
    else console.log(JSON.stringify(tenants, null, 2));

    console.log('\n--- RECENT QUEUE NOTIFICATIONS ---');
    const { data: queue, error: queueError } = await supabase
        .from('client_queue')
        .select('id, client_name, client_phone, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);
    if (queueError) console.error(queueError);
    else console.log(JSON.stringify(queue, null, 2));
}

run();
