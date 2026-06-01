-- Script para verificar dados e desabilitar RLS temporariamente
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se há dados nas tabelas principais
SELECT 'categories' as tabela, COUNT(*) as total FROM public.categories
UNION ALL
SELECT 'brands' as tabela, COUNT(*) as total FROM public.brands
UNION ALL
SELECT 'suppliers' as tabela, COUNT(*) as total FROM public.suppliers
UNION ALL
SELECT 'products' as tabela, COUNT(*) as total FROM public.products
UNION ALL
SELECT 'clients' as tabela, COUNT(*) as total FROM public.clients
UNION ALL
SELECT 'consignacoes' as tabela, COUNT(*) as total FROM public.consignacoes
UNION ALL
SELECT 'consignacao_items' as tabela, COUNT(*) as total FROM public.consignacao_items;

-- 2. Verificar status do RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'categories', 'brands', 'suppliers', 'products', 'clients', 
        'consignacoes', 'consignacao_items'
    )
ORDER BY tablename;

-- 3. Desabilitar RLS temporariamente (DESCOMENTE AS LINHAS ABAIXO SE NECESSÁRIO)
-- ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.consignacoes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.consignacao_items DISABLE ROW LEVEL SECURITY;

-- 4. Verificar algumas categorias específicas
SELECT * FROM public.categories LIMIT 5;
SELECT * FROM public.brands LIMIT 5;
SELECT * FROM public.suppliers LIMIT 5;
SELECT * FROM public.products LIMIT 5;
