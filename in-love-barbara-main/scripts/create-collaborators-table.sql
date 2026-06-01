-- Script para criar tabela de colaboradores no Supabase
-- Esta tabela será usada para gerenciar colaboradoras do sistema

-- Criar tabela de colaboradores
CREATE TABLE IF NOT EXISTS collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'COLAB',
  whatsapp TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON collaborators(role);
CREATE INDEX IF NOT EXISTS idx_collaborators_active ON collaborators(active);
CREATE INDEX IF NOT EXISTS idx_collaborators_created_at ON collaborators(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajustar conforme necessário)
CREATE POLICY "Allow all operations on collaborators" ON collaborators
  FOR ALL USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_collaborators_updated_at();

-- Inserir alguns colaboradores de exemplo
INSERT INTO collaborators (name, role, whatsapp, email) VALUES
  ('Maria Silva', 'ADMIN', '11999999999', 'maria@exemplo.com'),
  ('Ana Santos', 'COLAB', '11888888888', 'ana@exemplo.com'),
  ('João Oliveira', 'COLAB', '11777777777', 'joao@exemplo.com'),
  ('Pedro Costa', 'COLAB', '11666666666', 'pedro@exemplo.com')
ON CONFLICT DO NOTHING;

-- Verificar se a tabela foi criada corretamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'collaborators' 
ORDER BY ordinal_position;

-- Verificar os dados inseridos
SELECT * FROM collaborators ORDER BY created_at;

