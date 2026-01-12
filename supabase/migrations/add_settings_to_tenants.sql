-- Add settings column to tenants table for storing custom permissions and other config
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.tenants.settings IS 'Stores tenant-specific settings including custom role permissions';
