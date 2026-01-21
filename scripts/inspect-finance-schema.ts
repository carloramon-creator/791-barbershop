
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'finance' });

    if (error) {
        // If RPC doesn't exist, try getting one record to see keys
        const { data: record } = await supabase.from('finance').select('*').limit(1).single();
        if (record) {
            console.log('Finance Columns:', Object.keys(record));
            console.log('Sample Record:', record);
        } else {
            console.error('Could not get schema or record');
        }
    } else {
        console.log('Table Schema:', data);
    }
}

inspectSchema();
