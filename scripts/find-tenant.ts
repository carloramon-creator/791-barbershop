
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente locais
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Credenciais do Supabase não encontradas no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTenants() {
    console.log('🔍 Buscando tenants com nome "Cort"...');
    const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .ilike('name', '%Cort%');

    if (error) {
        console.error('❌ Erro ao buscar tenants:', error);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.log('⚠️ Nenhum tenant encontrado com "Cort". Listando os 10 primeiros...');
        const { data: all } = await supabase.from('tenants').select('id, name, slug').limit(10);
        console.table(all);
        return;
    }

    console.table(tenants);

    // Se achar, listar usuários do primeiro
    if (tenants.length > 0) {
        const tenantId = tenants[0].id;
        console.log(`\n👤 Buscando usuários para tenant: ${tenants[0].name} (${tenantId})...`);

        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, email, name, role, roles')
            .eq('tenant_id', tenantId);

        if (userError) {
            console.error('❌ Erro ao buscar usuários:', userError);
        } else {
            console.table(users);
            console.log('\n✅ Copie o ID do usuário desejado para gerar o link.');
        }
    }
}

listTenants();
