
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const phone = '48991305547';
    const variants = [phone, '55' + phone, phone.replace('55', '')];

    console.log('--- Debugging Client Persistence ---');
    console.log('Searching for variants:', variants);

    const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, phone, tenant_id')
        .or(`phone.eq.${variants[0]},phone.eq.${variants[1]},phone.eq.${variants[2]}`);

    if (error) console.error('Error fetching clients:', error);
    else console.log('Clients found:', clients);

    const tenantIds = clients?.map(c => c.tenant_id) || [];
    if (tenantIds.length > 0) {
        const { data: configs } = await supabase
            .from('whatsapp_configs')
            .select('tenant_id, phone_number_id')
            .in('tenant_id', tenantIds);
        console.log('WhatsApp Configs for these tenants:', configs);
    }

    const { data: sessions, error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .or(`phone.eq.${variants[0]},phone.eq.${variants[1]},phone.eq.${variants[2]}`);

    if (sessionError) console.error('Error fetching sessions:', sessionError);
    else console.log('Sessions found:', JSON.stringify(sessions, null, 2));
}

debug();
