-- Script para desabilitar temporariamente as políticas RLS
-- ATENÇÃO: Execute este script apenas em ambiente de desenvolvimento!
-- Lembre-se de reabilitar as políticas após extrair os dados

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignacao_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consign_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_imports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_nonces DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi desabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'categories', 'products', 'clients', 'users', 'sales', 'sale_items',
        'consignacoes', 'consignacao_items', 'consign_payments', 'payments',
        'cashier_shifts', 'nfe_imports', 'nfe_items', 'scan_nonces'
    )
ORDER BY tablename;
