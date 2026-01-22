-- 1. Contas Bancárias (OK)
CREATE TABLE IF NOT EXISTS holding_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'checking',
  balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Categorias (OK)
CREATE TABLE IF NOT EXISTS holding_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id UUID REFERENCES holding_categories(id),
  color TEXT DEFAULT '#94a3b8',
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transações (Financeiro da Holding) - CRIAÇÃO SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS holding_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'canceled')),
  due_date DATE NOT NULL,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Campos de referência (podem ser nulos inicialmente se tabela já existir)
  account_id UUID REFERENCES holding_accounts(id),
  category_id UUID REFERENCES holding_categories(id),
  recurring_group_id UUID,
  
  -- Metadados opcionais
  notes TEXT,
  tenant_id UUID -- Se for receita de um tenant específico (Barber/Beauty)
);

-- 4. Alterações de Segurança (Caso a tabela já existisse sem as colunas novas)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holding_transactions') THEN
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holding_transactions' AND column_name = 'account_id') THEN
            ALTER TABLE holding_transactions ADD COLUMN account_id UUID REFERENCES holding_accounts(id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holding_transactions' AND column_name = 'recurring_group_id') THEN
            ALTER TABLE holding_transactions ADD COLUMN recurring_group_id UUID;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holding_transactions' AND column_name = 'category_id') THEN
            ALTER TABLE holding_transactions ADD COLUMN category_id UUID REFERENCES holding_categories(id);
        END IF;
        
    END IF;
END $$;

-- 5. Seeds (Dados Iniciais)
INSERT INTO holding_accounts (name, type, is_default, bank_name)
SELECT 'Conta Principal (Inter)', 'checking', true, 'Banco Inter'
WHERE NOT EXISTS (SELECT 1 FROM holding_accounts);

INSERT INTO holding_categories (name, type, color) 
SELECT 'Receita SaaS', 'income', '#22c55e'
WHERE NOT EXISTS (SELECT 1 FROM holding_categories WHERE name = 'Receita SaaS');

INSERT INTO holding_categories (name, type, color) 
SELECT 'Despesas Operacionais', 'expense', '#ef4444'
WHERE NOT EXISTS (SELECT 1 FROM holding_categories WHERE name = 'Despesas Operacionais');
