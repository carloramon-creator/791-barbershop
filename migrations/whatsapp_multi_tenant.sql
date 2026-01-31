-- Tabela para armazenar as credenciais oficiais de cada barbearia (Meta Cloud API)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id TEXT UNIQUE NOT NULL, -- ID do número no painel do Meta
    business_account_id TEXT, -- ID da conta business no Meta
    access_token TEXT NOT NULL, -- Token de acesso (permanente preferencialmente)
    verify_token TEXT, -- Token de verificação do Webhook (para validação do Meta)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Tabela para gerenciar o estado da conversa por telefone e barbearia
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL, -- Telefone do cliente
    state TEXT DEFAULT 'idle', -- Estado atual (ex: booking_select_service)
    context JSONB DEFAULT '{}', -- Dados capturados (serviço, barbeiro, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

-- Habilitar RLS (Opcional, mas recomendado)
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
