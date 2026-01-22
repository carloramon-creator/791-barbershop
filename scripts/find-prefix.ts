
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function findByPrefix(prefix: string) {
    console.log(`--- SEARCHING FOR PREFIX: ${prefix} ---`);

    const { data, error } = await supabase
        .from('finance')
        .select('*')
        .ilike('id', `${prefix}%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No record found with this prefix.');
    } else {
        data.forEach((f: any) => {
            console.log(`
ID: ${f.id}
Tenant: ${f.tenant_id}
Desc: ${f.description}
Value: ${f.value}
Paid: ${f.is_paid}
Meta: ${JSON.stringify(f.metadata, null, 2)}
`);
        });
    }
}

const args = process.argv.slice(2);
findByPrefix(args[0] || '7c79892b');
