-- Adiciona restrição única para tenant_id na tabela subscriptions
-- Garante que cada barbearia tenha apenas um registro de assinatura ativa/gerenciada
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tenant_id_key UNIQUE (tenant_id);
