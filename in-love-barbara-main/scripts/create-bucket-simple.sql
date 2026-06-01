-- Script SIMPLES para criar bucket de imagens
-- Execute este script no Supabase SQL Editor

-- 1. Criar bucket diretamente via SQL (bypass RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Verificar se foi criado
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- 3. Se ainda não funcionar, execute este comando no Dashboard do Supabase:
-- Vá em Storage > Create Bucket
-- Nome: product-images
-- Público: Sim
-- Limite de arquivo: 5MB
-- Tipos permitidos: image/jpeg, image/png, image/webp
