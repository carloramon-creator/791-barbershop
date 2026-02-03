-- ============================================================
-- STAGING SYNC SCRIPT - 2026-02-03
-- ============================================================
-- Este script consolida todas as migrações críticas aplicadas
-- na produção para sincronizar o ambiente de Staging.
-- Execute no Query Editor do Supabase (Staging).
-- ============================================================

-- 1. WhatsApp Multi-Tenant Configuration
-- (Necessário para a nova feature de configuração)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    business_account_id TEXT,
    access_token TEXT NOT NULL,
    verify_token TEXT DEFAULT '791_barber_token_2026',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- RLS para whatsapp_configs
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_configs_tenant_isolation" ON whatsapp_configs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY "whatsapp_configs_system_admin" ON whatsapp_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_system_admin = true
        )
    );

-- 2. Asaas Subscription ID (para billing)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'asaas_subscription_id'
    ) THEN
        ALTER TABLE tenants ADD COLUMN asaas_subscription_id TEXT;
    END IF;
END $$;

-- 3. Asaas Customer ID (para billing)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'asaas_customer_id'
    ) THEN
        ALTER TABLE tenants ADD COLUMN asaas_customer_id TEXT;
    END IF;
END $$;

-- 4. Audit Logs (se ainda não existir)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_tenant_isolation" ON audit_logs
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- 5. Fiscal Config (para NFSe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'fiscal_config'
    ) THEN
        ALTER TABLE tenants ADD COLUMN fiscal_config JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 6. Garantir que appointments tem notified flags
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'notified_24h'
    ) THEN
        ALTER TABLE appointments ADD COLUMN notified_24h BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'notified_1h'
    ) THEN
        ALTER TABLE appointments ADD COLUMN notified_1h BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'notified_30m'
    ) THEN
        ALTER TABLE appointments ADD COLUMN notified_30m BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 7. Indexes de Performance
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status ON appointments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_tenant ON whatsapp_configs(tenant_id);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- Após executar, verifique se não há erros no log.
-- Teste acessando o painel de Staging.
-- ============================================================
