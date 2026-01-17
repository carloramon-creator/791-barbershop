-- Adicionar permissão 'settings' a todos os planos
-- Bug fix: Menu Configurações não aparecia porque faltava a permissão

UPDATE public.system_plans 
SET menu_permissions = '["dashboard", "queue", "clients", "professionals", "services", "products", "settings"]'::jsonb
WHERE slug = 'basic';

UPDATE public.system_plans 
SET menu_permissions = '["dashboard", "queue", "appointments", "clients", "professionals", "services", "products", "finance", "settings"]'::jsonb
WHERE slug = 'complete';

UPDATE public.system_plans 
SET menu_permissions = '["dashboard", "queue", "appointments", "clients", "professionals", "services", "products", "inventory", "finance", "settings"]'::jsonb
WHERE slug = 'premium';
