
-- Migration: Add notification flags for idempotency
-- Target: client_queue and appointments tables

-- 1. Table: client_queue
ALTER TABLE public.client_queue ADD COLUMN IF NOT EXISTS notified_start_wap BOOLEAN DEFAULT false;
ALTER TABLE public.client_queue ADD COLUMN IF NOT EXISTS notified_start_push BOOLEAN DEFAULT false;
ALTER TABLE public.client_queue ADD COLUMN IF NOT EXISTS notified_finish_wap BOOLEAN DEFAULT false;

-- 2. Table: appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_manual_wap BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_start_wap BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS notified_start_push BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.client_queue.notified_start_wap IS 'Idempotency flag for WhatsApp "Your Turn" notification';
COMMENT ON COLUMN public.client_queue.notified_start_push IS 'Idempotency flag for Push "Your Turn" notification';
COMMENT ON COLUMN public.client_queue.notified_finish_wap IS 'Idempotency flag for WhatsApp "Thank You" notification';

COMMENT ON COLUMN public.appointments.notified_manual_wap IS 'Idempotency flag for manual WhatsApp notification (Notify button)';
COMMENT ON COLUMN public.appointments.notified_start_wap IS 'Idempotency flag for WhatsApp "Your Turn" notification via appointment start';
COMMENT ON COLUMN public.appointments.notified_start_push IS 'Idempotency flag for Push "Your Turn" notification via appointment start';
