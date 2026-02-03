
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('🔍 Buscando Barbearia Ingleses...');

    // 1. Buscar Tenant
    const { data: tenants, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name')
        .ilike('name', '%Ingleses%');

    if (tenantError) {
        console.error('❌ Erro ao buscar tenant:', tenantError);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.log('❌ Barbearia Ingleses não encontrada.');
        return;
    }

    console.log(`✅ Encontrado(s) ${tenants.length} tenant(s):`);
    tenants.forEach(t => console.log(`   - [${t.id}] ${t.name}`));

    // 2. Verificar Configuração
    for (const tenant of tenants) {
        console.log(`\n🔎 Verificando configs para: ${tenant.name} (${tenant.id})`);

        const { data: config, error: configError } = await supabase
            .from('whatsapp_configs')
            .select('*')
            .eq('tenant_id', tenant.id);

        if (configError) {
            console.error('   ❌ Erro ao consultar whatsapp_configs:', configError);
            continue;
        }

        if (config && config.length > 0) {
            console.log('   ✅ Configuração ENCONTRADA:', config);
        } else {
            console.log('   ⚪ Nenhuma configuração encontrada tabela whatsapp_configs.');
        }

        // 3. Testar a query exata da API
        console.log('   🔌 Testando Query da API (Relacionamento)...');
        const { data: apiTest, error: apiError } = await supabase
            .from('tenants')
            .select('id, whatsapp_configs(phone_number_id)')
            .eq('id', tenant.id)
            .single();

        if (apiError) {
            console.error('   ❌ Erro na Query da API:', apiError);
        } else {
            console.log('   ✅ Query API retornou:', JSON.stringify(apiTest, null, 2));
        }
    }
}

main().catch(console.error);
