-- Add permissions columns to system_plans
ALTER TABLE public.system_plans ADD COLUMN IF NOT EXISTS menu_permissions JSONB DEFAULT '[]';
ALTER TABLE public.system_plans ADD COLUMN IF NOT EXISTS staff_limit INTEGER DEFAULT 0;

-- Add stripe_price_id to system_addons
ALTER TABLE public.system_addons ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Update defaults
UPDATE public.system_plans SET menu_permissions = '["dashboard", "queue", "clients", "professionals", "services", "products"]', staff_limit = 3 WHERE slug = 'basic';
UPDATE public.system_plans SET menu_permissions = '["dashboard", "queue", "appointments", "clients", "professionals", "services", "products", "finance"]', staff_limit = 10 WHERE slug = 'complete';
UPDATE public.system_plans SET menu_permissions = '["dashboard", "queue", "appointments", "clients", "professionals", "services", "products", "inventory", "finance"]', staff_limit = 0 WHERE slug = 'premium';
