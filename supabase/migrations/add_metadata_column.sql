-- Adicionar coluna metadata para armazenar id_rec, asaas_id, etc.
ALTER TABLE tenants ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;

-- Indexar para busca rápida se necessário (opcional)
CREATE INDEX idx_tenants_metadata ON tenants USING gin (metadata);
