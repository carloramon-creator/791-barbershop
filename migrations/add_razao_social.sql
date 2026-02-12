-- Migration to add razao_social to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS razao_social TEXT;
