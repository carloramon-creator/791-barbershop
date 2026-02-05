
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';
    const phones = ['554891305547', '4891305547', '5548991305547', '48991305547'];

    console.log('--- Debugging Clients for Tenant & Phone Variants ---');
    console.log('Tenant:', tenantId);
    console.log('Phones:', phones);

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('phone', phones);

    if (error) console.error('Error fetching clients:', error);
    else {
        console.log(`Found ${clients?.length} matching clients.`);
        console.table(clients?.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            birth_date: c.birth_date
        })));
    }
}

debug();
