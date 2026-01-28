-- Migração para corrigir RLS na tabela user_documents e storage

-- 1. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Owner allows all" ON public.user_documents;
DROP POLICY IF EXISTS "User reads own" ON public.user_documents;

-- 2. Nova política para Donos e Admins (Acesso Total)
-- Esta política permite que qualquer um com role 'owner' ou 'admin' gerencie os documentos do seu tenant.
CREATE POLICY "Manage documents as owner/admin" ON public.user_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.tenant_id = public.user_documents.tenant_id
      AND (public.users.role = 'owner' OR public.users.role = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND public.users.tenant_id = public.user_documents.tenant_id
      AND (public.users.role = 'owner' OR public.users.role = 'admin')
    )
  );

-- 3. Política para o próprio usuário (Ver seus documentos)
CREATE POLICY "Read own documents" ON public.user_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Garantir que as colunas existem (caso o usuário não tenha rodado o SQL anterior)
ALTER TABLE public.user_documents 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS content_type TEXT;

-- 5. Sincronizar colunas antigas (opcional)
UPDATE public.user_documents SET file_name = name WHERE file_name IS NULL AND name IS NOT NULL;
UPDATE public.user_documents SET file_path = url WHERE file_path IS NULL AND url IS NOT NULL;

-- 6. Políticas de Storage para o bucket 'barber-documents'
-- Nota: Supabase storage usa a tabela storage.objects.
-- Vamos garantir que o bucket seja privado e tenha políticas de acesso.

-- Garantir que o bucket exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('barber-documents', 'barber-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas de storage antigas para este bucket
DROP POLICY IF EXISTS "Owners can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can manage documents" ON storage.objects;

-- Criar política de storage para Donos (Upload/Download/Delete)
CREATE POLICY "Owners manage documents" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'barber-documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND (public.users.role = 'owner' OR public.users.role = 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'barber-documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
      AND (public.users.role = 'owner' OR public.users.role = 'admin')
    )
  );
