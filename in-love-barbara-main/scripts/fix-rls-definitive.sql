-- Script DEFINITIVO para resolver RLS e configurar Storage
-- Execute este script no Supabase SQL Editor

-- 1. DESABILITAR RLS TEMPORARIAMENTE para configurar tudo
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. CRIAR BUCKET (forçar criação)
DELETE FROM storage.buckets WHERE id = 'product-images';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- 3. REABILITAR RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER TODAS AS POLÍTICAS EXISTENTES (limpar)
DROP POLICY IF EXISTS "Permitir leitura pública de buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Permitir criação de buckets para usuários autenticados" ON storage.buckets;
DROP POLICY IF EXISTS "Permitir leitura pública de imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de imagens de produtos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de imagens de produtos" ON storage.objects;

-- 5. CRIAR POLÍTICAS NOVAS E SIMPLES
-- Buckets: Permitir tudo para usuários autenticados
CREATE POLICY "buckets_all_for_authenticated" ON storage.buckets
FOR ALL USING (auth.role() = 'authenticated');

-- Objetos: Permitir tudo para usuários autenticados no bucket product-images
CREATE POLICY "objects_all_for_authenticated" ON storage.objects
FOR ALL USING (
  bucket_id = 'product-images' AND 
  auth.role() = 'authenticated'
);

-- 6. POLÍTICAS PARA TABELAS PRINCIPAIS
-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir acesso completo a produtos para usuários autenticados" ON products;
DROP POLICY IF EXISTS "Permitir acesso completo a categorias para usuários autenticados" ON categories;
DROP POLICY IF EXISTS "Permitir acesso completo a marcas para usuários autenticados" ON brands;
DROP POLICY IF EXISTS "Permitir acesso completo a fornecedores para usuários autenticados" ON suppliers;
DROP POLICY IF EXISTS "Permitir acesso completo a clientes para usuários autenticados" ON clients;
DROP POLICY IF EXISTS "Permitir acesso completo a consignações para usuários autenticados" ON consignations;

-- Criar políticas simples para todas as tabelas
CREATE POLICY "products_all_for_authenticated" ON products
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "categories_all_for_authenticated" ON categories
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "brands_all_for_authenticated" ON brands
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "suppliers_all_for_authenticated" ON suppliers
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "clients_all_for_authenticated" ON clients
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "consignations_all_for_authenticated" ON consignations
FOR ALL USING (auth.role() = 'authenticated');

-- 7. VERIFICAR CONFIGURAÇÃO
SELECT 'Bucket Status:' as info, id, name, public FROM storage.buckets WHERE id = 'product-images';

SELECT 'Storage Policies:' as info, 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
ORDER BY tablename, policyname;

SELECT 'Table Policies:' as info,
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('products', 'categories', 'brands', 'suppliers', 'clients', 'consignations')
ORDER BY tablename, policyname;

-- 8. TESTE FINAL
SELECT 'Teste de autenticação:' as info, 
  CASE 
    WHEN auth.role() = 'authenticated' THEN 'Usuário autenticado ✅'
    ELSE 'Usuário não autenticado ❌'
  END as status;
