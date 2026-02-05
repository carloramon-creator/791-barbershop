
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';

    console.log('--- Debugging Barbers for Tenant ---');
    console.log('Tenant:', tenantId);

    const { data: barbers, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('tenant_id', tenantId);

    if (error) console.error('Error fetching barbers:', error);
    else {
        console.log(`Found ${barbers?.length} barbers.`);
        console.table(barbers?.map(b => ({
            id: b.id,
            name: b.name,
            nickname: b.nickname,
            is_active: b.is_active,
            status: b.status
        })));
    }
}

debug();
