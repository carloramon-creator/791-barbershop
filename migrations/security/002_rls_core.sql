-- 2. Habilitação de RLS e Políticas de Segurança Unificadas

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Habilitar RLS em TODAS as tabelas do public
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Políticas genéricas para tabelas com tenant_id
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'tenant_id'
          AND table_name NOT IN ('tenants', 'users')
    ) LOOP
        -- Remover políticas antigas para evitar duplicidade
        EXECUTE format('DROP POLICY IF EXISTS "System Admin access %I" ON public.%I', r.table_name, r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation %I" ON public.%I', r.table_name, r.table_name);
        
        -- Política SuperAdmin
        EXECUTE format('CREATE POLICY "System Admin access %I" ON public.%I FOR ALL TO authenticated USING (is_auth_system_admin())', r.table_name, r.table_name);
        
        -- Política Isolamento de Tenant
        EXECUTE format('CREATE POLICY "Tenant isolation %I" ON public.%I FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id())', r.table_name, r.table_name);
    END LOOP;
END $$;

-- Políticas Específicas para Tenants e Users
DROP POLICY IF EXISTS "Admin see all tenants" ON public.tenants;
CREATE POLICY "Admin see all tenants" ON public.tenants FOR ALL TO authenticated USING (is_auth_system_admin());

DROP POLICY IF EXISTS "Users see own tenant" ON public.tenants;
CREATE POLICY "Users see own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = get_auth_tenant_id());

DROP POLICY IF EXISTS "Admin see all users" ON public.users;
CREATE POLICY "Admin see all users" ON public.users FOR ALL TO authenticated USING (is_auth_system_admin());

DROP POLICY IF EXISTS "Users see own tenant users" ON public.users;
CREATE POLICY "Users see own tenant users" ON public.users FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id());
