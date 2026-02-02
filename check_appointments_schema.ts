import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSchema() {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching appointments:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in appointments table:', Object.keys(data[0]));
        console.log('Last appointment data:', data[0]);
    } else {
        console.log('Appointments table is empty or could not fetch columns.');
    }
}

checkSchema();
