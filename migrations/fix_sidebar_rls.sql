-- Migração: Correção Definitiva de RLS (Sidebar e Recursão)
-- Esta migração quebra a circularidade que impedia o carregamento do perfil/sidebar.

-- 1. Criar funções auxiliares com SECURITY DEFINER para quebrar a recursão
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_sys_admin()
RETURNS boolean AS $$
  SELECT COALESCE(is_system_admin, false) FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Limpar e recriar políticas para a tabela USERS
DROP POLICY IF EXISTS "Tenant access users" ON public.users;
DROP POLICY IF EXISTS "Users can see others in same tenant" ON public.users;
DROP POLICY IF EXISTS "Users can see own profile" ON public.users;
DROP POLICY IF EXISTS "Users access own and same tenant" ON public.users;
DROP POLICY IF EXISTS "SuperAdmin access everything" ON public.users;

-- Regra de Leitura: Ver a si mesmo ou outros do mesmo tenant
CREATE POLICY "Users access own and same tenant" ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR tenant_id = get_my_tenant_id() OR is_sys_admin());

-- Regra de Escrita: Apenas o próprio usuário ou Admin
CREATE POLICY "Users update own profile" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR is_sys_admin())
    WITH CHECK (id = auth.uid() OR is_sys_admin());

-- 3. Limpar e recriar políticas para a tabela TENANTS
DROP POLICY IF EXISTS "Users can see their own tenant" ON public.tenants;
CREATE POLICY "Users can see their own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING (id = get_my_tenant_id() OR is_sys_admin());

-- 4. Garantir Administrador (Você)
-- Caso queira garantir que o email de admin sempre tenha acesso Total
DROP POLICY IF EXISTS "Admin Email root access" ON public.users;
CREATE POLICY "Admin Email root access" ON public.users
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' = 'ramon@791solucoes.com.br');
