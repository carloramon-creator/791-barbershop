-- Migração: Patch Final de Segurança (RLS + Funções) - VERSÃO ULTRA SEGURA
-- Resolve os avisos de "Caminho de busca mutável" e reforça RLS em tabelas restantes
-- Esta versão valida a existência de colunas antes de criar políticas para evitar erros.

-- 1. CORREÇÃO DE FUNÇÕES (search_path)
-- Resolve os avisos de segurança sobre "search_path" em funções customizadas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    ) LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível alterar a função %.%: %', r.nspname, r.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. REFORÇO DE RLS EM TODAS AS TABELAS
-- Garante que o RLS esteja ativo em absolutamente todas as tabelas do esquema public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- 3. CRIAÇÃO DE POLÍTICAS COM VALIDAÇÃO DINÂMICA
-- Cria políticas de tenant_id apenas onde a coluna existe
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Tabelas com tenant_id (excluindo tenants que se filtra por ID)
    FOR r IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'tenant_id'
          AND table_name NOT IN ('tenants')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant access %I" ON public.%I', r.table_name, r.table_name);
        EXECUTE format('CREATE POLICY "Tenant access %I" ON public.%I 
            FOR ALL TO authenticated 
            USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
            WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()))', r.table_name, r.table_name);
    END LOOP;

    -- Política para Barbearias (tenants)
    DROP POLICY IF EXISTS "Users can see their own tenant" ON public.tenants;
    CREATE POLICY "Users can see their own tenant" ON public.tenants
        FOR SELECT TO authenticated
        USING (id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

    -- Política para Service Products (Relacional)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'service_products' AND schemaname = 'public') THEN
        DROP POLICY IF EXISTS "Tenant access service_products" ON public.service_products;
        CREATE POLICY "Tenant access service_products" ON public.service_products 
            FOR ALL TO authenticated 
            USING (service_id IN (SELECT id FROM public.services WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())))
            WITH CHECK (service_id IN (SELECT id FROM public.services WHERE tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())));
    END IF;

    -- Política para Tabelas de Sistema (Leitura para todos autenticados)
    FOR r IN (
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('system_plans', 'system_addons', 'system_coupons', 'subscription_plans', 'subscription_addons', 'system_settings')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public read %I" ON public.%I', r.tablename, r.tablename);
        EXECUTE format('CREATE POLICY "Allow public read %I" ON public.%I FOR SELECT TO authenticated USING (true)', r.tablename, r.tablename);
    END LOOP;
END $$;
