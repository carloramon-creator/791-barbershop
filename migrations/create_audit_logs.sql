-- Criar tabela de logs de auditoria para rastreamento de webhooks
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.system_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.system_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_webhook ON public.system_audit_logs USING gin((metadata->'webhook_event_id'));

-- RLS (permitir service role acessar tudo)
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON public.system_audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
