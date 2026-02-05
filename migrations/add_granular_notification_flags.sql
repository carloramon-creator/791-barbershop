-- Adicionar flags granulares para lembretes (evita que falha no Push bloqueie o WhatsApp e vice-versa)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_24h_push BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_24h_wap BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_1h_push BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_1h_wap BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_30m_push BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_30m_wap BOOLEAN DEFAULT false;

-- Timestamps para debouncing (evita envios múltiplos em janelas de tempo curtas)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;
ALTER TABLE public.client_queue ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- Índices para performance nas queries do cron
CREATE INDEX IF NOT EXISTS idx_appointments_notified_30m_push ON public.appointments (notified_30m_push) WHERE notified_30m_push = false;
CREATE INDEX IF NOT EXISTS idx_appointments_notified_1h_push ON public.appointments (notified_1h_push) WHERE notified_1h_push = false;
CREATE INDEX IF NOT EXISTS idx_appointments_notified_24h_push ON public.appointments (notified_24h_push) WHERE notified_24h_push = false;
