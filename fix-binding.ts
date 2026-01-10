
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7'; // Barbearia teste
    const userId = '4746ae4b-6e93-4390-b6e2-44688baf63d4'; // carloramon

    console.log(`🔨 Vinculando User ${userId} ao Tenant ${tenantId}...`);

    const { error } = await supabase
        .from('tenants_users')
        .upsert({
            tenant_id: tenantId,
            user_id: userId,
            role: 'owner'
        }, { onConflict: 'tenant_id, user_id' });

    if (error) {
        console.error('❌ Erro:', error);
    } else {
        console.log('✅ SUCESSO! Agora atualize a página.');
    }
}

fix();
