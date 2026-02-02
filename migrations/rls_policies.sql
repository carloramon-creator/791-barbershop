-- ==========================================
-- SCRIPT DE SEGURANÇA: ATIVAÇÃO DE RLS
-- ==========================================

-- 1. ATIVAR RLS NAS TABELAS
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holding_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holding_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holding_transactions ENABLE ROW LEVEL SECURITY;

-- 2. CRIAR POLÍTICAS DE ACESSO (MULTI-TENANT)

-- Tabela: Vendas
DROP POLICY IF EXISTS "Tenants can only see their own sales" ON public.vendas;
CREATE POLICY "Tenants can only see their own sales" ON public.vendas
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tabela: Itens de Venda (Relacionado a Vendas)
DROP POLICY IF EXISTS "Tenants can only see their own sale items" ON public.venda_itens;
CREATE POLICY "Tenants can only see their own sale items" ON public.venda_itens
    FOR ALL USING (
        venda_id IN (SELECT id FROM public.vendas)
    );

-- Tabela: Cupons (Vouchers)
DROP POLICY IF EXISTS "Tenants can only see their own vouchers" ON public.client_vouchers;
CREATE POLICY "Tenants can only see their own vouchers" ON public.client_vouchers
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tabela: Assinaturas (Subscriptions)
DROP POLICY IF EXISTS "Tenants can only see their own subscriptions" ON public.subscriptions;
CREATE POLICY "Tenants can only see their own subscriptions" ON public.subscriptions
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 3. POLÍTICAS PARA TABELAS GLOBAIS (HOLDING)
-- Como estas tabelas não têm tenant_id, permitimos acesso apenas para usuários autenticados da plataforma.

DROP POLICY IF EXISTS "Allow all for authenticated on holding_categories" ON public.holding_categories;
CREATE POLICY "Allow all for authenticated on holding_categories" ON public.holding_categories
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated on holding_accounts" ON public.holding_accounts;
CREATE POLICY "Allow all for authenticated on holding_accounts" ON public.holding_accounts
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated on holding_transactions" ON public.holding_transactions;
CREATE POLICY "Allow all for authenticated on holding_transactions" ON public.holding_transactions
    FOR ALL TO authenticated USING (true);

-- ==========================================
-- FIM DO SCRIPT
-- ==========================================
