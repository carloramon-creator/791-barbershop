
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
    console.log('📋 Listando Barbearias e Donos (Simplificado):');

    const { data: tenants } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });

    if (!tenants) { console.log('0 Tenants'); return; }

    for (const t of tenants) {
        console.log(`\n🏢 [${t.name}] (ID: ${t.id})`);

        const { data: users } = await supabase
            .from('tenants_users')
            .select('user_id, role')
            .eq('tenant_id', t.id);

        if (users && users.length > 0) {
            for (const u of users) {
                const { data: userData } = await supabase.from('users').select('email').eq('id', u.user_id).single();
                console.log(`   👤 Usuário: ${userData?.email} - Role: ${u.role} (ID: ${u.user_id})`);
            }
        } else {
            console.log('   ⚠️ SEM USUÁRIOS VINCULADOS');
        }
    }
}

list();
