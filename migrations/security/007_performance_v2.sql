-- 007_performance_v2.sql
-- Adição de índices estratégicos para acelerar Dashboard e Relatórios Financeiros

-- 1. Índices para Faturamento e Vendas
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created ON public.sales(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vendas_tenant_created ON public.vendas(tenant_id, created_at);

-- 2. Índices para Fila e Métricas de Atendimento
CREATE INDEX IF NOT EXISTS idx_client_queue_metrics ON public.client_queue(tenant_id, status, finished_at);
CREATE INDEX IF NOT EXISTS idx_client_queue_performance ON public.client_queue(tenant_id, created_at, started_at) WHERE status = 'finished';

-- 3. Índices para Financeiro
CREATE INDEX IF NOT EXISTS idx_finance_tenant_date ON public.finance(tenant_id, date);

-- 4. Índices para Produtos
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_movements_tenant ON public.product_movements(tenant_id, created_at);
