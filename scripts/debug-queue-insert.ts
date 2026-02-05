
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debug() {
    const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: 'client_queue' });

    // Fallback if rpc doesn't exist
    if (error) {
        console.log('RPC get_table_columns failed, trying select from information_schema');
        const { data: schema, error: schemaError } = await supabase.from('client_queue').select('*').limit(1);
        if (schema && schema.length > 0) {
            console.log('Columns found in first row:', Object.keys(schema[0]));
        } else {
            console.log('No rows in client_queue to check schema.');
        }
    } else {
        console.log('Columns:', columns);
    }

    // Try a test insert with error report
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7';
    const barberId = '069ae67b-cfdd-49ea-9f2f-0aa2745da0ec'; // Barbeiro 3
    const clientId = '98a9a56a-a483-4546-9e52-787b8718faf7'; // Carlos Ramon
    const phone = '554891305547';

    console.log('--- Test Insert ---');
    const { data, error: insertError } = await supabase.from('client_queue').insert({
        tenant_id: tenantId,
        barber_id: barberId,
        client_id: clientId,
        client_phone: phone,
        status: 'waiting',
        position: 999 // Test pos
    }).select();

    if (insertError) {
        console.error('Insert Error:', insertError);
    } else {
        console.log('Insert Success:', data);
        // Clean up
        await supabase.from('client_queue').delete().eq('id', data[0].id);
        console.log('Cleaned up test insert.');
    }
}

debug();
