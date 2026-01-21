-- Migração: Criação do Módulo Financeiro Blindado da Holding 791 Soluções

-- 1. Criação da Tabela Privativa
CREATE TABLE IF NOT EXISTS system_finance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_unit TEXT NOT NULL DEFAULT 'holding', -- holding, barber, beauty, branding, etc.
    type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
    value DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    payment_method TEXT, -- Asaas, Inter, Pix, Dinheiro
    bank_id TEXT, -- Referência ID no banco externo (Asaas/Inter)
    category TEXT, -- Infra, Marketing, Pro-labore, SaaS Revenue, etc.
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Segurança de Nível de Linha (RLS)
ALTER TABLE system_finance_records ENABLE ROW LEVEL SECURITY;

-- 3. Política de Blindagem: Somente SuperAdmin tem acesso total.
-- Ninguém mais (tenants, staff, outros admins locais) consegue ver sequer a existência dos dados.
DROP POLICY IF EXISTS "SuperAdmin Only - Full Access" ON system_finance_records;
CREATE POLICY "SuperAdmin Only - Full Access" ON system_finance_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.is_system_admin = true OR users.email = 'ramon@791solucoes.com.br')
        )
    );

-- 4. Função para monitorar mudanças (opcional, para triggers de auditoria)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_finance_updated_at
    BEFORE UPDATE ON system_finance_records
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. Comentário para documentação no banco
COMMENT ON TABLE system_finance_records IS 'ERP Financeiro da Holding 791 Soluções. Blindado para acesso exclusivo de SuperAdmins.';
