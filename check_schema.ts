
import { createClient } from '@supabase/supabase-js';

// Credentials from lib/supabase-client.ts
const supabaseUrl = 'https://mfbiwvhxztejuzcasclv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYml3dmh4enRlanV6Y2FzY2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODM4NjUsImV4cCI6MjA4Mjc1OTg2NX0.DcGhBBvGlj_sipsryHgojiSZoLSVggqPFjLG7hj2OY4k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema...');
    const { data, error } = await supabase.from('tenants').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No rows returned (cant determine columns)');
    }
}

checkSchema();
