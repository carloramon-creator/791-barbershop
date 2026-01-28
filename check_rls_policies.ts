import { createClient } from '@supabase/supabase-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'user_documents' });

  if (error) {
    if (error.message.includes('function get_policies(text) does not exist')) {
        console.log("RPC 'get_policies' does not exist. Trying direct query...");
        const { data: directData, error: directError } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'user_documents');

        if (directError) {
             // pg_policies might not be accessible via from() depending on setup, but let's try a raw SQL via another RPC if available
             console.log("Could not query pg_policies directly via SDK.");
             // Try to list schemas to see if we can use a more generic query RPC
        } else {
            console.log("Policies for user_documents:", JSON.stringify(directData, null, 2));
            return;
        }
    } else {
        console.error('Error fetching policies:', error);
        return;
    }
  } else {
    console.log('Policies for user_documents:', JSON.stringify(data, null, 2));
  }
}

checkPolicies();
