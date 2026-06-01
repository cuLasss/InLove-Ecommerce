-- Script para configurar armazenamento de imagens no Supabase
-- Execute este script no Supabase SQL Editor

-- 1. Desabilitar RLS temporariamente para criar o bucket
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Criar bucket para imagens de produtos (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Reabilitar RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS para buckets
CREATE POLICY "Permitir leitura pública de buckets" ON storage.buckets
FOR SELECT USING (true);

CREATE POLICY "Permitir criação de buckets para usuários autenticados" ON storage.buckets
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Criar políticas RLS para objetos (arquivos)
CREATE POLICY "Permitir leitura pública de imagens de produtos" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Permitir upload de imagens de produtos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Permitir atualização de imagens de produtos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Permitir exclusão de imagens de produtos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- 6. Verificar se o bucket foi criado corretamente
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- 7. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename IN ('buckets', 'objects')
ORDER BY tablename, policyname;
