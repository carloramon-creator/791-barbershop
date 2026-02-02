import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSchema() {
    const { data, error } = await supabase
        .from('client_queue')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching client_queue:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in client_queue table:', Object.keys(data[0]));
        console.log('Sample data:', data[0]);
    } else {
        console.log('client_queue table is empty.');
    }
}

checkSchema();
