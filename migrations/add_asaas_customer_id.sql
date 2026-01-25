-- Adiciona suporte a múltiplos IDs de clientes no Asaas
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tenants_asaas_customer_id ON public.tenants(asaas_customer_id);
COMMENT ON COLUMN public.tenants.asaas_customer_id IS 'ID do cliente no Asaas vinculado especificamente a este tenant';
