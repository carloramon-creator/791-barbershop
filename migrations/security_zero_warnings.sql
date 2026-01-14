-- Migração: Zerar Avisos de Segurança (Final)
-- 1. Resolve o alerta "RLS ativado. Nenhuma política" para a tabela barbershop_users
-- Como esta tabela não é usada atualmente, bloqueamos o acesso por padrão para silenciar o aviso.

DROP POLICY IF EXISTS "No access" ON public.barbershop_users;
CREATE POLICY "No access" ON public.barbershop_users FOR ALL TO public USING (false);

-- Obs: O aviso de "Proteção de senha vazada" deve ser ativado manualmente no painel do Supabase:
-- Auth -> Settings -> Enable "Leaked password protection"
