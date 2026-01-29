const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Usando service role para ignorar RLS e testar integridade
);

async function testUpsert() {
    console.log('--- TESTANDO UPSERT NA TABELA system_settings ---');

    const testValue = {
        environment: 'homologacao',
        auto_emit: true,
        lastUpdated: new Date().toISOString(),
        test_run: true
    };

    const { data, error } = await supabase
        .from('system_settings')
        .upsert({
            key: 'nfse_config',
            value: testValue,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
        .select();

    if (error) {
        console.error('❌ Erro no Upsert:', error);
    } else {
        console.log('✅ Upsert realizado com sucesso!');
        console.log('Dados salvos:', JSON.stringify(data, null, 2));
    }
}

testUpsert();
