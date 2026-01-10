
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixV2() {
    const tenantId = '04e6a8df-99c4-4546-9e52-787b8718faf7'; // Barbearia teste (Cheia)
    const userId = '4746ae4b-6e93-4390-b6e2-44688baf63d4'; // carloramon

    console.log(`🔨 [V2] Movendo User ${userId} para Tenant ${tenantId}...`);

    const { data: user, error: fetchError } = await supabase.from('users').select('*').eq('id', userId).single();
    if (fetchError) { console.error('Erro ao buscar user:', fetchError); return; }

    console.log(`👤 User Atual: ${user.email} (Tenant Antigo: ${user.tenant_id})`);

    const { data, error } = await supabase
        .from('users')
        .update({
            tenant_id: tenantId,
            role: 'owner', // Garante permissão total
            roles: ['owner']
        })
        .eq('id', userId)
        .select();

    if (error) {
        console.error('❌ Erro ao atualizar:', error);
    } else {
        console.log('✅ SUCESSO! Usuário movido. Atualize a página.');
    }
}

fixV2();
