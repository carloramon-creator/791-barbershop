import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in clients table:', Object.keys(data[0]));
  } else {
    // If table is empty, we can try to get column names via RPC or a different query
    // For now let's hope there's at least one client.
    console.log('Clients table is empty.');
  }
}

checkSchema();
