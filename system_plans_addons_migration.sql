-- Dynamic Plans and Add-ons Schema

-- 1. Table for available SaaS plans
CREATE TABLE IF NOT EXISTS public.system_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- 'basic', 'complete', 'premium'
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table for available system addons
CREATE TABLE IF NOT EXISTS public.system_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- 'inventory', 'marketing', 'nfe'
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table to track which tenant has which addon
CREATE TABLE IF NOT EXISTS public.tenant_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES public.system_addons(id) ON DELETE CASCADE,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}',
    UNIQUE(tenant_id, addon_id)
);

-- Initial Data for Plans
INSERT INTO public.system_plans (slug, name, price, description, features)
VALUES 
('basic', 'Plano Básico', 49.00, 'Ideal para barbeiros autônomos ou iniciantes.', '["Fila de espera ilimitada", "Gestão de clientes", "Dashboard básico"]'),
('complete', 'Plano Completo', 99.00, 'Perfeito para barbearias em crescimento.', '["Agendamentos ilimitados", "Lembretes automáticos", "Relatórios intermediários"]'),
('premium', 'Plano Premium', 169.00, 'A solução definitiva para grandes barbearias.', '["Multi-unidades", "Gestão de equipe", "Relatórios avançados"]')
ON CONFLICT (slug) DO UPDATE 
SET price = EXCLUDED.price, 
    description = EXCLUDED.description, 
    features = EXCLUDED.features;

-- Initial Data for Add-ons
INSERT INTO public.system_addons (slug, name, price, description, icon)
VALUES 
('inventory', 'Controle de Estoque', 29.90, 'Gerenciamento completo de produtos e insumos.', 'Box'),
('marketing', 'WhatsApp Marketing', 39.90, 'Campanhas de fidelização via WhatsApp.', 'Megaphone'),
('nfe', 'NFe Automática', 49.90, 'Emissão de notas fiscais de serviço ilimitadas.', 'Receipt')
ON CONFLICT (slug) DO UPDATE 
SET price = EXCLUDED.price, 
    description = EXCLUDED.description;
