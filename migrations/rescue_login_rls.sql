-- Migração: Correção Urgente de Login (Reset de Políticas RLS)
-- Resolve o erro "Perfil não encontrado" permitindo que o usuário veja a si mesmo.

-- 1. CORREÇÃO NA TABELA USERS (A principal causa do erro)
-- Removemos a política circular e criamos regras claras
DROP POLICY IF EXISTS "Tenant access users" ON public.users;

-- Regra A: O usuário sempre pode ver e editar seu próprio perfil
CREATE POLICY "Users can see own profile" ON public.users 
    FOR SELECT TO authenticated 
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users 
    FOR UPDATE TO authenticated 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Regra B: O usuário pode ver outros membros da mesma barbearia 
-- (Importante para o Dashboard e agendamentos)
CREATE POLICY "Users can see others in same tenant" ON public.users 
    FOR SELECT TO authenticated 
    USING (
        tenant_id IN (
            SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
        )
    );

-- 2. CORREÇÃO NA TABELA TENANTS (Garantir acesso à Barbearia)
DROP POLICY IF EXISTS "Users can see their own tenant" ON public.tenants;
CREATE POLICY "Users can see their own tenant" ON public.tenants
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid()
        )
    );

-- 3. POLÍTICA PARA O SUPER ADMIN (Você)
-- Garante que você continue vendo tudo via interface caso precise
DROP POLICY IF EXISTS "SuperAdmin access everything" ON public.users;
CREATE POLICY "SuperAdmin access everything" ON public.users 
    FOR ALL TO authenticated 
    USING (
        (SELECT is_system_admin FROM public.users WHERE id = auth.uid()) = true
    );
