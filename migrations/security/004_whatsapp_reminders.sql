-- Adicionar coluna de controle de lembrete na tabela de sessões
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Índice para busca rápida de sessões inativas
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_timeout ON public.whatsapp_sessions (updated_at) WHERE state != 'idle';
