
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const userId = '4746ae4b-6e93-4390-b6e2-44688baf63d4';
    console.log(`🔍 Checando vínculos para usuário: ${userId}`);

    // 1. Tenants Users
    const { data: links } = await supabase
        .from('tenants_users')
        .select('*, tenant:tenants(*)')
        .eq('user_id', userId);

    console.log('\n🔗 Vínculos Encontrados:');
    console.log(JSON.stringify(links, null, 2));

    if (links?.length === 0) {
        console.log('⚠️ NENHUM VÍNCULO ENCONTRADO! O usuário ficou órfão.');
    }
}
check();
