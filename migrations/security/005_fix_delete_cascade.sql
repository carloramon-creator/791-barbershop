-- Script para permitir exclusão em cascata de Tenantes
-- Isso corrige o erro: update or delete on table "tenants" violates foreign key constraint...

BEGIN;

-- 1. Client Vouchers (O erro reportado)
ALTER TABLE IF EXISTS public.client_vouchers
DROP CONSTRAINT IF EXISTS client_vouchers_tenant_id_fkey;

ALTER TABLE IF EXISTS public.client_vouchers
ADD CONSTRAINT client_vouchers_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- 2. Appointments (Agendamentos)
ALTER TABLE IF EXISTS public.appointments
DROP CONSTRAINT IF EXISTS appointments_tenant_id_fkey;

ALTER TABLE IF EXISTS public.appointments
ADD CONSTRAINT appointments_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- 3. Clients (Clientes)
ALTER TABLE IF EXISTS public.clients
DROP CONSTRAINT IF EXISTS clients_tenant_id_fkey;

ALTER TABLE IF EXISTS public.clients
ADD CONSTRAINT clients_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- 4. Services (Serviços)
ALTER TABLE IF EXISTS public.services
DROP CONSTRAINT IF EXISTS services_tenant_id_fkey;

ALTER TABLE IF EXISTS public.services
ADD CONSTRAINT services_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- 5. Products (Produtos)
ALTER TABLE IF EXISTS public.products
DROP CONSTRAINT IF EXISTS products_tenant_id_fkey;

ALTER TABLE IF EXISTS public.products
ADD CONSTRAINT products_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;



-- 7. Finance (Financeiro)
ALTER TABLE IF EXISTS public.finance
DROP CONSTRAINT IF EXISTS finance_tenant_id_fkey;

ALTER TABLE IF EXISTS public.finance
ADD CONSTRAINT finance_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- 8. WhatsApp Sessions & Configs
ALTER TABLE IF EXISTS public.whatsapp_sessions
DROP CONSTRAINT IF EXISTS whatsapp_sessions_tenant_id_fkey;

ALTER TABLE IF EXISTS public.whatsapp_sessions
ADD CONSTRAINT whatsapp_sessions_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.whatsapp_configs
DROP CONSTRAINT IF EXISTS whatsapp_configs_tenant_id_fkey;

ALTER TABLE IF EXISTS public.whatsapp_configs
ADD CONSTRAINT whatsapp_configs_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMIT;
