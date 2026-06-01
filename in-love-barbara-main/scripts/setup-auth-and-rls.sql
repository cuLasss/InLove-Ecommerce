-- Script para configurar autenticação e RLS no Supabase
-- Execute este script no Supabase SQL Editor

-- 1. Criar usuários no Supabase Auth (se não existirem)
-- Nota: Os usuários serão criados automaticamente no primeiro login

-- 2. Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Políticas RLS para buckets
DROP POLICY IF EXISTS "Permitir leitura pública de buckets" ON storage.buckets;
CREATE POLICY "Permitir leitura pública de buckets" ON storage.buckets
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir criação de buckets para usuários autenticados" ON storage.buckets;
CREATE POLICY "Permitir criação de buckets para usuários autenticados" ON storage.buckets
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Políticas RLS para objetos (arquivos)
DROP POLICY IF EXISTS "Permitir leitura pública de imagens de produtos" ON storage.objects;
CREATE POLICY "Permitir leitura pública de imagens de produtos" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Permitir upload de imagens de produtos" ON storage.objects;
CREATE POLICY "Permitir upload de imagens de produtos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Permitir atualização de imagens de produtos" ON storage.objects;
CREATE POLICY "Permitir atualização de imagens de produtos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Permitir exclusão de imagens de produtos" ON storage.objects;
CREATE POLICY "Permitir exclusão de imagens de produtos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- 5. Políticas RLS para tabelas principais (se necessário)
-- Permitir acesso completo para usuários autenticados

-- Tabela products
DROP POLICY IF EXISTS "Permitir acesso completo a produtos para usuários autenticados" ON products;
CREATE POLICY "Permitir acesso completo a produtos para usuários autenticados" ON products
FOR ALL USING (auth.role() = 'authenticated');

-- Tabela categories
DROP POLICY IF EXISTS "Permitir acesso completo a categorias para usuários autenticados" ON categories;
CREATE POLICY "Permitir acesso completo a categorias para usuários autenticados" ON categories
FOR ALL USING (auth.role() = 'authenticated');

-- Tabela brands
DROP POLICY IF EXISTS "Permitir acesso completo a marcas para usuários autenticados" ON brands;
CREATE POLICY "Permitir acesso completo a marcas para usuários autenticados" ON brands
FOR ALL USING (auth.role() = 'authenticated');

-- Tabela suppliers
DROP POLICY IF EXISTS "Permitir acesso completo a fornecedores para usuários autenticados" ON suppliers;
CREATE POLICY "Permitir acesso completo a fornecedores para usuários autenticados" ON suppliers
FOR ALL USING (auth.role() = 'authenticated');

-- Tabela clients
DROP POLICY IF EXISTS "Permitir acesso completo a clientes para usuários autenticados" ON clients;
CREATE POLICY "Permitir acesso completo a clientes para usuários autenticados" ON clients
FOR ALL USING (auth.role() = 'authenticated');

-- Tabela consignations
DROP POLICY IF EXISTS "Permitir acesso completo a consignações para usuários autenticados" ON consignations;
CREATE POLICY "Permitir acesso completo a consignações para usuários autenticados" ON consignations
FOR ALL USING (auth.role() = 'authenticated');

-- 6. Verificar configuração
SELECT 'Bucket criado:' as status, * FROM storage.buckets WHERE id = 'product-images';

SELECT 'Políticas de Storage:' as status, 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename IN ('buckets', 'objects')
ORDER BY tablename, policyname;

SELECT 'Políticas de Tabelas:' as status,
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('products', 'categories', 'brands', 'suppliers', 'clients', 'consignations')
ORDER BY tablename, policyname;
