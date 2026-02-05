
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';

    console.log('--- Debugging Services for Tenant ---');
    console.log('Tenant:', tenantId);

    const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', tenantId);

    if (error) console.error('Error fetching services:', error);
    else {
        console.log(`Found ${services?.length} services.`);
        console.log(services);
    }

    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    console.log('Tenant Data:', tenant);
}

debug();
