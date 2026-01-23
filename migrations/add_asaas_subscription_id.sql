-- Migration: Adicionar suporte a assinaturas Asaas
-- Adiciona coluna para armazenar o ID da assinatura no Asaas

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

-- Criar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_tenants_asaas_subscription_id ON tenants(asaas_subscription_id);

-- Comentário explicativo
COMMENT ON COLUMN tenants.asaas_subscription_id IS 'ID da assinatura ativa no Asaas para este tenant';
