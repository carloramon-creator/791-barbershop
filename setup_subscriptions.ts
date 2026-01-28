import { getSupabaseAdmin } from './lib/supabase-server';

async function createSubscriptionsTable() {
    console.log('📦 Criando tabela subscriptions...\n');

    const supabase = getSupabaseAdmin();

    // Primeiro, verificar se a tabela já existe
    const { data: existing, error: checkError } = await supabase
        .from('subscriptions')
        .select('id')
        .limit(1);

    if (!checkError) {
        console.log('✅ Tabela `subscriptions` já existe!');
        return;
    }

    if (!checkError?.message?.includes('does not exist')) {
        console.error('❌ Erro inesperado:', checkError);
        return;
    }

    console.log('⚠️  Tabela não existe. Criando...\n');
    console.log('📋 Por favor, execute o SQL abaixo no Supabase Dashboard:\n');
    console.log('👉 https://supabase.com/dashboard/project/_/sql/new\n');
    console.log('--- COPIE E COLE O SQL ABAIXO ---\n');

    const sql = `
-- Tabela de Assinaturas para Pix Mensal Automático
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();
`;

    console.log(sql);
    console.log('\n--- FIM DO SQL ---\n');
    console.log('Após executar, rode este script novamente para verificar.');
}

createSubscriptionsTable();
