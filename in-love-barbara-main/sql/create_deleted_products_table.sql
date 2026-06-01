-- Script para criar a tabela deleted_products
-- Esta tabela armazena informações sobre produtos excluídos em cascata
-- para que o sistema possa mostrar o nome do produto com "(excluído)" nas vendas

CREATE TABLE IF NOT EXISTS deleted_products (
  product_id UUID PRIMARY KEY,
  product_name TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_deleted_products_product_id ON deleted_products(product_id);

-- Comentários para documentação
COMMENT ON TABLE deleted_products IS 'Armazena informações sobre produtos excluídos em cascata para exibição nas vendas';
COMMENT ON COLUMN deleted_products.product_id IS 'ID do produto excluído (chave primária)';
COMMENT ON COLUMN deleted_products.product_name IS 'Nome do produto no momento da exclusão';
COMMENT ON COLUMN deleted_products.deleted_at IS 'Data e hora da exclusão';
COMMENT ON COLUMN deleted_products.created_at IS 'Data e hora de criação do registro';

