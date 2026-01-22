-- 1. Create holding_accounts table
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

-- 2. Create holding_categories table (Categories and Subcategories)
CREATE TABLE IF NOT EXISTS holding_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'income' or 'expense'
  parent_id UUID REFERENCES holding_categories(id), -- If null, it's a main category. If set, it's a subcategory.
  color TEXT DEFAULT '#94a3b8',
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add account_id, recurring_group_id, and category_id to holding_transactions
DO $$
BEGIN
    -- Linking to Accounts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holding_transactions' AND column_name = 'account_id') THEN
        ALTER TABLE holding_transactions ADD COLUMN account_id UUID REFERENCES holding_accounts(id);
    END IF;

    -- Recurring Logic
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holding_transactions' AND column_name = 'recurring_group_id') THEN
        ALTER TABLE holding_transactions ADD COLUMN recurring_group_id UUID;
    END IF;

    -- Linking to New Categories (optional transition, keeping category text for now along with ID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holding_transactions' AND column_name = 'category_id') THEN
        ALTER TABLE holding_transactions ADD COLUMN category_id UUID REFERENCES holding_categories(id);
    END IF;
END $$;


-- 4. Seed Default Accounts
INSERT INTO holding_accounts (name, type, is_default, bank_name)
SELECT 'Conta Principal (Inter)', 'checking', true, 'Banco Inter'
WHERE NOT EXISTS (SELECT 1 FROM holding_accounts);

INSERT INTO holding_accounts (name, type, is_default, bank_name)
SELECT 'Conta Asaas', 'checking', false, 'Asaas'
WHERE NOT EXISTS (SELECT 1 FROM holding_accounts WHERE name = 'Conta Asaas');

-- 5. Seed Default Categories (Examples)
INSERT INTO holding_categories (name, type, color) 
SELECT 'Receita de Vendas', 'income', '#22c55e' 
WHERE NOT EXISTS (SELECT 1 FROM holding_categories WHERE name = 'Receita de Vendas');

INSERT INTO holding_categories (name, type, color) 
SELECT 'Despesas Operacionais', 'expense', '#ef4444' 
WHERE NOT EXISTS (SELECT 1 FROM holding_categories WHERE name = 'Despesas Operacionais');
