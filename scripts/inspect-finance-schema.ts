
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
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
