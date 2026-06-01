-- Script para reabilitar as políticas RLS após extrair os dados
-- Execute este script após terminar de extrair os dados para restaurar a segurança

-- Reabilitar RLS em todas as tabelas principais
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignacao_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consign_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_nonces ENABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi reabilitado
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

-- Recriar políticas básicas se necessário
-- (Descomente as linhas abaixo se as políticas foram removidas)

/*
-- Políticas básicas para usuários autenticados
CREATE POLICY "Allow all operations for authenticated users" ON public.categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.products FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.sales FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.sale_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.consignacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.consignacao_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.consign_payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.cashier_shifts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.nfe_imports FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.nfe_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.scan_nonces FOR ALL TO authenticated USING (true);
*/
