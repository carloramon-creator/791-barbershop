-- 1. Funções de Suporte para RLS (Alta Performance)
-- Estas funções são marcadas como STABLE para que o Postgres execute apenas uma vez por query.

CREATE OR REPLACE FUNCTION public.is_auth_system_admin()
RETURNS boolean AS $$
DECLARE
    is_admin boolean;
BEGIN
    SELECT is_system_admin INTO is_admin FROM public.users WHERE id = auth.uid();
    RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid AS $$
DECLARE
    tid uuid;
BEGIN
    SELECT tenant_id INTO tid FROM public.users WHERE id = auth.uid();
    RETURN tid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
