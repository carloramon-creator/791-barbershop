import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function auditRLS() {
    console.log('--- Auditing RLS Policies ---');

    // Querying pg_policies requires more permissions than the service role might have for direct RPC depending on setup, 
    // but in Supabase we can often use an RPC or just check table by table.
    // However, the best way here is to check the migrations or try to list tables and their RLS status.

    const { data: policies, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT 
                schemaname, 
                tablename, 
                policyname, 
                permissive, 
                roles, 
                cmd, 
                qual, 
                with_check 
            FROM pg_policies 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `
    });

    if (error) {
        console.error('Error fetching policies (maybe RPC exec_sql is missing):', error.message);
        return;
    }

    console.table(policies);
}

auditRLS();
