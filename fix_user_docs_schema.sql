-- Migração para corrigir a tabela user_documents

-- 1. Adicionar colunas faltantes se não existirem
ALTER TABLE public.user_documents 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS content_type TEXT;

-- 2. Migrar dados de colunas antigas se existirem (opcional, mas seguro)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_documents' AND column_name = 'name') THEN
        UPDATE public.user_documents SET file_name = name WHERE file_name IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_documents' AND column_name = 'url') THEN
        UPDATE public.user_documents SET file_path = url WHERE file_path IS NULL;
    END IF;
END $$;

-- 3. Garantir que as novas colunas não sejam nulas para futuros registros (opcional)
-- ALTER TABLE public.user_documents ALTER COLUMN file_name SET NOT NULL;
-- ALTER TABLE public.user_documents ALTER COLUMN file_path SET NOT NULL;
