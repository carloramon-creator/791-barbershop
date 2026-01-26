-- Migration: Criar tabelas para módulo de Vendas Diretas
-- Data: 2026-01-26
-- Descrição: Sistema de venda avulsa de produtos (sem serviços) para plano Premium

-- Tabela principal de vendas
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Valores
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto_percentual DECIMAL(5,2) DEFAULT 0,
    desconto_valor DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    -- Pagamento
    metodo_pagamento VARCHAR(50) NOT NULL, -- 'dinheiro', 'pix', 'cartao_debito', 'cartao_credito'
    status VARCHAR(50) NOT NULL DEFAULT 'concluida', -- 'concluida', 'cancelada'
    
    -- Auditoria
    vendedor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT vendas_total_check CHECK (total >= 0),
    CONSTRAINT vendas_desconto_check CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100)
);

-- Tabela de itens da venda
CREATE TABLE IF NOT EXISTS venda_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Dados do item
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_vendas_tenant ON vendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_produto ON venda_itens(produto_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_vendas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendas_updated_at_trigger
    BEFORE UPDATE ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION update_vendas_updated_at();

-- Comentários para documentação
COMMENT ON TABLE vendas IS 'Registro de vendas diretas de produtos (sem serviços) - Disponível apenas para plano Premium';
COMMENT ON TABLE venda_itens IS 'Itens individuais de cada venda';
COMMENT ON COLUMN vendas.desconto_percentual IS 'Percentual de desconto aplicado sobre o subtotal (0-100)';
COMMENT ON COLUMN vendas.desconto_valor IS 'Valor em reais do desconto aplicado';
COMMENT ON COLUMN vendas.metodo_pagamento IS 'Forma de pagamento: dinheiro, pix, cartao_debito, cartao_credito';
COMMENT ON COLUMN vendas.status IS 'Status da venda: concluida, cancelada';
