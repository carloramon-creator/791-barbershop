import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createSubscriptionsTable() {
    console.log('📦 Criando tabela subscriptions...\n');

    const sql = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      plan_slug TEXT NOT NULL,
      addons JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      billing_cycle INTEGER NOT NULL DEFAULT 1,
      next_billing_date DATE,
      last_billing_date DATE,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date, status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  `;

    try {
        // Tentar criar a tabela
        const { error } = await supabase.rpc('exec', { sql });

        if (error) {
            console.log('⚠️  Método RPC não disponível, usando abordagem alternativa...\n');

            // Verificar se a tabela já existe
            const { data, error: selectError } = await supabase
                .from('subscriptions')
                .select('id')
                .limit(1);

            if (selectError && selectError.message.includes('does not exist')) {
                console.log('❌ Tabela não existe. Por favor, execute o SQL manualmente no Supabase Dashboard:');
                console.log('\n--- COPIE E COLE NO SUPABASE SQL EDITOR ---\n');
                console.log(sql);
                console.log('\n--- FIM DO SQL ---\n');
                process.exit(1);
            } else if (!selectError) {
                console.log('✅ Tabela `subscriptions` já existe!');
            }
        } else {
            console.log('✅ Tabela `subscriptions` criada com sucesso!');
        }

        // Verificar estrutura
        const { data: testData, error: testError } = await supabase
            .from('subscriptions')
            .select('*')
            .limit(0);

        if (testError) {
            console.error(`❌ Erro ao acessar tabela: ${testError.message}`);
        } else {
            console.log('✅ Tabela acessível via Supabase client!');
        }

    } catch (e: any) {
        console.error('❌ Erro:', e.message);
        process.exit(1);
    }
}

createSubscriptionsTable();
