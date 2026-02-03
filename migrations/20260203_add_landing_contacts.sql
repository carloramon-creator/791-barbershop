-- Migração para adicionar tabela de contatos da landing page
CREATE TABLE IF NOT EXISTS public.landing_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded'))
);

-- Habilitar RLS
ALTER TABLE public.landing_contacts ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa insira (contato público)
CREATE POLICY "Permitir inserção pública de contatos" ON public.landing_contacts
    FOR INSERT WITH CHECK (true);

-- Política para permitir que apenas admins vejam contatos (exemplo simplificado)
-- Em produção, você usaria papéis específicos
CREATE POLICY "Permitir leitura apenas para autenticados" ON public.landing_contacts
    FOR SELECT USING (auth.role() = 'authenticated');
