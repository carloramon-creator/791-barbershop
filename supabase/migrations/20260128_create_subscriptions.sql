-- Tabela de Assinaturas para Pix Mensal Automático
-- Gerencia renovações mensais sem depender do Pix Automático do banco

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Detalhes do Plano
  plan_slug TEXT NOT NULL,
  addons JSONB DEFAULT '[]'::jsonb,
  
  -- Status da Assinatura
  status TEXT NOT NULL DEFAULT 'pending',
  -- Valores possíveis: 'pending', 'active', 'canceled', 'suspended', 'expired'
  
  -- Ciclo de Cobrança
  billing_cycle INTEGER NOT NULL DEFAULT 1,
  -- 1 = mensal, 6 = semestral, 12 = anual
  
  -- Controle de Datas
  next_billing_date DATE,
  last_billing_date DATE,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Trigger para atualizar updated_at automaticamente
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

-- Comentários para documentação
COMMENT ON TABLE subscriptions IS 'Gerencia assinaturas mensais com geração automática de Pix no vencimento';
COMMENT ON COLUMN subscriptions.status IS 'pending: aguardando primeiro pagamento, active: ativa, canceled: cancelada pelo usuário, suspended: suspensa por falta de pagamento, expired: expirada';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Intervalo de cobrança em meses (1=mensal, 6=semestral, 12=anual)';
COMMENT ON COLUMN subscriptions.next_billing_date IS 'Data da próxima cobrança automática';
COMMENT ON COLUMN subscriptions.last_billing_date IS 'Data da última cobrança gerada';
