-- Migration: Fix venda_itens foreign key constraint
-- Data: 2026-01-26
-- Descrição: Alterar ON DELETE RESTRICT para CASCADE para permitir exclusão de barbearias com vendas

-- Remover constraint antiga
ALTER TABLE venda_itens 
DROP CONSTRAINT IF EXISTS venda_itens_produto_id_fkey;

-- Adicionar nova constraint com CASCADE
ALTER TABLE venda_itens 
ADD CONSTRAINT venda_itens_produto_id_fkey 
FOREIGN KEY (produto_id) 
REFERENCES products(id) 
ON DELETE CASCADE;

-- Comentário explicativo
COMMENT ON CONSTRAINT venda_itens_produto_id_fkey ON venda_itens IS 
'Permite exclusão em cascata quando produto é deletado (necessário para deletar barbearias com vendas)';
