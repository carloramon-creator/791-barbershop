-- ==========================================
-- SCRIPT DE REFINO DE SEGURANÇA
-- ==========================================

-- 1. CORREÇÃO DE SEARCH_PATH (Vulnerabilidade Lint 0011)
-- Define o search_path como 'public' para evitar sequestro de funções.

ALTER FUNCTION public.update_vendas_updated_at() SET search_path = public;
ALTER FUNCTION public.update_subscriptions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_auth_tenant_id() SET search_path = public;
ALTER FUNCTION public.is_auth_system_admin() SET search_path = public;

-- 2. REFINO DE POLÍTICAS RLS (Vulnerabilidade Lint 0024)
-- Em vez de 'Allow ALL' com 'true', separamos por comando.

-- Tabela: holding_categories
DROP POLICY IF EXISTS "Allow all for authenticated on holding_categories" ON public.holding_categories;
CREATE POLICY "Allow select for authenticated" ON public.holding_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for system admins" ON public.holding_categories FOR ALL TO authenticated 
    USING (public.is_auth_system_admin())
    WITH CHECK (public.is_auth_system_admin());

-- Tabela: holding_accounts
DROP POLICY IF EXISTS "Allow all for authenticated on holding_accounts" ON public.holding_accounts;
CREATE POLICY "Allow select for authenticated" ON public.holding_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for system admins" ON public.holding_accounts FOR ALL TO authenticated 
    USING (public.is_auth_system_admin())
    WITH CHECK (public.is_auth_system_admin());

-- Tabela: holding_transactions
DROP POLICY IF EXISTS "Allow all for authenticated on holding_transactions" ON public.holding_transactions;
CREATE POLICY "Allow select for authenticated" ON public.holding_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for system admins" ON public.holding_transactions FOR ALL TO authenticated 
    USING (public.is_auth_system_admin())
    WITH CHECK (public.is_auth_system_admin());

-- Tabela: support_tickets (Correção de permissividade no INSERT)
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets" ON public.support_tickets 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- FIM DO SCRIPT
-- ==========================================
