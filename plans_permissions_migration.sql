-- Migração: Permissões de Menu e Limite de Equipe nos Planos
ALTER TABLE public.system_plans 
ADD COLUMN IF NOT EXISTS menu_permissions JSONB DEFAULT '[]';

ALTER TABLE public.system_plans 
ADD COLUMN IF NOT EXISTS staff_limit INTEGER DEFAULT 0;

COMMENT ON COLUMN public.system_plans.menu_permissions IS 'Lista de chaves de menu permitidas: dashboard, queue, appointments, clients, professionals, services, products, inventory, finance, settings';
COMMENT ON COLUMN public.system_plans.staff_limit IS 'Número máximo de funcionários permitidos (0 = Ilimitado)';

-- Atualizar planos existentes com permissões padrão (INCLUINDO SETTINGS)
UPDATE public.system_plans SET menu_permissions = '["dashboard", "queue", "clients", "professionals", "services", "products", "settings"]', staff_limit = 3 WHERE slug = 'basic';
UPDATE public.system_plans SET menu_permissions = '["dashboard", "queue", "appointments", "clients", "professionals", "services", "products", "finance", "settings"]', staff_limit = 10 WHERE slug = 'complete';
UPDATE public.system_plans SET menu_permissions = '["dashboard", "queue", "appointments", "clients", "professionals", "services", "products", "inventory", "finance", "settings"]', staff_limit = 0 WHERE slug = 'premium';
