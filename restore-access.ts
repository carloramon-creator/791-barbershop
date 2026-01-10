
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
    const userId = '4746ae4b-6e93-4390-b6e2-44688baf63d4';
    console.log(`🚑 Restaurando acesso para usuário: ${userId}`);

    // 1. Encontrar o último tenant criado (assumindo ser o seu)
    const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(1);

    if (!tenants || tenants.length === 0) {
        console.error('❌ Nenhum tenant encontrado no sistema!');
        return;
    }

    const tenant = tenants[0];
    console.log(`🏢 Tenant Alvo: ${tenant.name} (${tenant.id})`);

    // 2. Criar vínculo
    const { error } = await supabase
        .from('tenants_users')
        .upsert({
            tenant_id: tenant.id,
            user_id: userId,
            role: 'owner'
        }, { onConflict: 'tenant_id, user_id' });

    if (error) {
        console.error('❌ Erro ao restaurar vínculo:', error);
    } else {
        console.log('✅ Vínculo restaurado com sucesso! Tente recarregar a página.');
    }
}

restore();
