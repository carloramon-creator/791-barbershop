
-- Create user_documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'contract',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Policy for Owner (Full Access)
CREATE POLICY "Owner allows all" ON public.user_documents
  FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM public.users WHERE tenant_id = user_documents.tenant_id AND role = 'owner'
  ));

-- Policy for User (Read Own)
CREATE POLICY "User reads own" ON public.user_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add Columns to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Create Storage Bucket 'documents' (Can't do via SQL usually, but good to note)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
