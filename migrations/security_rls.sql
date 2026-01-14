-- Migração: Segurança RLS (Row Level Security) - VERSÃO DEFINITIVA E SEGURA
-- Baseada em auditoria real do banco para evitar erros de "coluna não existe"

-- ==========================================
-- 1. HABILITAR RLS NAS TABELAS
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_products ENABLE ROW LEVEL SECURITY;

-- Tabelas de Sistema/Assinatura
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. POLÍTICAS PARA TABELAS GLOBAIS (LEITURA PÚBLICA)
-- ==========================================
DO $$ 
DECLARE 
    t text;
    global_tables text[] := ARRAY['system_plans', 'system_addons', 'system_coupons', 'subscription_plans', 'subscription_addons', 'system_settings'];
BEGIN
    FOREACH t IN ARRAY global_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Allow public read %I" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    END LOOP;
END $$;

-- ==========================================
-- 3. POLÍTICAS PARA TABELAS COM tenant_id
-- ==========================================
DO $$ 
DECLARE 
    t text;
    tenant_tables text[] := ARRAY['users', 'appointments', 'services', 'products', 'product_categories', 'finance', 'sales', 'client_queue', 'barbers', 'product_movements'];
BEGIN
    FOREACH t IN ARRAY tenant_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant access %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Tenant access %I" ON public.%I 
            FOR ALL TO authenticated 
            USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
            WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()))', t, t);
    END LOOP;
END $$;

-- ==========================================
-- 4. POLÍTICAS ESPECIAIS (CASOS ÚNICOS)
-- ==========================================

-- Tabela de Tenants (ID é o próprio Tenant ID)
DROP POLICY IF EXISTS "Users can see their own tenant" ON public.tenants;
CREATE POLICY "Users can see their own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING (id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Tabela de Service Products (Não tem tenant_id, filtra pelo service_id)
DROP POLICY IF EXISTS "Tenant access service_products" ON public.service_products;
CREATE POLICY "Tenant access service_products" ON public.service_products 
    FOR ALL TO authenticated 
    USING (service_id IN (SELECT id FROM public.services WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())))
    WITH CHECK (service_id IN (SELECT id FROM public.services WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())));
