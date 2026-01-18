-- Add fiscal_config column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fiscal_config JSONB DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.tenants.fiscal_config IS 'Configurações de NFS-e/NFC-e da barbearia (certificado, senha, flags)';
