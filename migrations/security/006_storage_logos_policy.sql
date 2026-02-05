
-- 006_storage_logos_policy.sql
-- Garantir que o bucket logos é público e permite upload anônimo para o cadastro do cliente

-- 1. Garantir que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Acesso Público Leitura" ON storage.objects;
DROP POLICY IF EXISTS "Acesso Público Escrita" ON storage.objects;
DROP POLICY IF EXISTS "Public Access - Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Access - Insert" ON storage.objects;

-- 3. Criar política de leitura pública (para ver as fotos)
CREATE POLICY "Acesso Público Leitura" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'logos');

-- 4. Criar política de escrita pública (para o upload no cadastro)
-- Nota: Isso permite que qualquer um suba arquivos no bucket 'logos'.
-- Como o nome do arquivo é aleatório e o bucket é pequeno, é o ideal para o fluxo de onboarding.
CREATE POLICY "Acesso Público Escrita" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'logos');
