-- Migração para Gestão Dinâmica de Planos e Add-ons

-- 1. Tabela de Planos do Sistema
CREATE TABLE IF NOT EXISTS public.system_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- basic, complete, premium
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]', -- Lista de recursos incluídos
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Add-ons (Recursos Extras)
CREATE TABLE IF NOT EXISTS public.system_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- inventory, finance_module, etc
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Vínculo Tenant <-> Add-ons
CREATE TABLE IF NOT EXISTS public.tenant_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES public.system_addons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active', -- active, cancelled
    price_at_purchase DECIMAL(10,2) NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT now(),
    stripe_subscription_item_id TEXT, -- ID do item no Stripe para cobrança recorrente
    UNIQUE(tenant_id, addon_id)
);

-- 4. Inserir Planos Iniciais (Conforme preços atuais)
INSERT INTO public.system_plans (slug, name, price, description, features) VALUES
('basic', 'Plano Básico', 49.00, 'Fila OU Agendamento + 3 profissionais', '["queue_or_appointments"]'),
('complete', 'Plano Completo', 99.00, 'Básico + Financeiro + Produtos + 10 profissionais', '["finance", "products", "staff_limit_10"]'),
('premium', 'Plano Premium', 149.00, 'Completo + Estoque + Relatórios + Ilimitado', '["all"]');

-- 5. Inserir Add-ons Iniciais
INSERT INTO public.system_addons (slug, name, price, description) VALUES
('inventory', 'Módulo Estoque', 30.00, 'Gestão de estoque e suprimentos'),
('finance_module', 'Módulo Financeiro', 20.00, 'Controle de caixa, despesas e faturamento');

-- Habilitar RLS (Segurança)
ALTER TABLE public.system_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_addons ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso básico (Leitura para todos autenticados)
CREATE POLICY "Allow public read system_plans" ON public.system_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow public read system_addons" ON public.system_addons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow tenants to see their addons" ON public.tenant_addons FOR SELECT TO authenticated USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
