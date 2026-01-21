
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseServiceKey = 'sb_secret_CO1qjgf7SMQ4QQRzugzbGg_U5uVpcwS';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLocalFinance() {
    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .eq('is_paid', false)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching finance:', error);
        return;
    }

    console.log('--- RECENT UNPAID FINANCE RECORDS ---');
    data.forEach(f => {
        console.log(`- ID: ${f.id} | Value: ${f.value} | Paid: ${f.is_paid} | Metadata:`, JSON.stringify(f.metadata));
    });
}

checkLocalFinance();
