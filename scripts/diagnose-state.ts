
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync('diagnosis.txt', msg + '\n');
    };

    log('--- DIAGNOSIS START ---');

    // 1. Check Users (limit 20)
    log('\nFetching Users (limit 20)...');
    const { data: users, error: errUsers } = await supabase
        .from('users')
        .select('id, email, name, is_active, tenant_id')
        .limit(20);

    if (errUsers) log('Error fetching users: ' + JSON.stringify(errUsers));
    else {
        log(`Found ${users.length} users.`);
        users.forEach(u => log(`User: ${u.email} | Active: ${u.is_active} | Tenant: ${u.tenant_id}`));
    }

    // 2. Check Barbers (limit 20)
    log('\nFetching Barbers (limit 20)...');
    const { data: barbers, error: errBarbers } = await supabase
        .from('barbers')
        .select('id, name, user_id, is_active')
        .limit(20);

    if (errBarbers) log('Error fetching barbers: ' + JSON.stringify(errBarbers));
    else {
        log(`Found ${barbers.length} barbers.`);
        barbers.forEach(b => log(`Barber: ${b.name} | Active: ${b.is_active} | Linked User: ${b.user_id}`));
    }

    log('\n--- DIAGNOSIS END ---');
}

diagnose();
