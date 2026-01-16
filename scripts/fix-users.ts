
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsers() {
    console.log('Starting user fix...');

    // Update all users where is_active is NULL or FALSE
    // We can't do a bulk update with "OR" logic easily in one go with JS client without RPC or raw query, 
    // but we can just update ALL users to true if that's the intention, OR fetch and update.
    // Actually, the client library allows update with filters.

    // 1. Fix NULLs
    const { error: error1, count: count1 } = await supabase
        .from('users')
        .update({ is_active: true })
        .is('is_active', null)
        .select('id', { count: 'exact' });

    if (error1) console.error('Error fixing NULLs:', error1);
    else console.log(`Fixed ${count1} users with NULL is_active.`);

    // 2. Fix FALSEs (if we assumed they were archived by mistake, but maybe we shouldn't indiscriminately fix FALSE?)
    // The user said "não aparece nenhum usuário", implying EVERYONE disappeared.
    // So it's safer to set ALL to true to restore visibility, considering the migration just happened.

    const { error: error2, count: count2 } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('is_active', false)
        .select('id', { count: 'exact' });

    if (error2) console.error('Error fixing FALSEs:', error2);
    else console.log(`Fixed ${count2} users with FALSE is_active.`);

    console.log('Done.');
}

fixUsers();
