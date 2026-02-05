
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';

    console.log('--- Debugging Queue for Tenant ---');
    console.log('Tenant:', tenantId);

    const { data: queue, error } = await supabase
        .from('client_queue')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) console.error('Error fetching queue:', error);
    else {
        console.log(`Found ${queue?.length} recent queue entries.`);
        console.table(queue?.map(q => ({
            id: q.id,
            barber_id: q.barber_id,
            client_id: q.client_id,
            status: q.status,
            created_at: q.created_at
        })));
    }
}

debug();
