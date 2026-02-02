-- 3. Índices de Performance B-Tree

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON public.appointments(client_phone);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_vendas_tenant_date ON public.vendas(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_barber_services_barber ON public.barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON public.venda_itens(venda_id);
