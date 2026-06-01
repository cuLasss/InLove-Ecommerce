-- Habilitar RLS nas tabelas que ainda não têm proteção
-- Isso é essencial para segurança dos dados

-- 1. Habilitar RLS na tabela invalid_nfe_imports
ALTER TABLE public.invalid_nfe_imports ENABLE ROW LEVEL SECURITY;

-- Criar política para invalid_nfe_imports (somente usuários autenticados)
CREATE POLICY "invalid_nfe_imports_select_for_authenticated" 
ON public.invalid_nfe_imports 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "invalid_nfe_imports_all_for_authenticated" 
ON public.invalid_nfe_imports 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 2. Habilitar RLS na tabela devolucoes
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;

-- Criar política para devolucoes (somente usuários autenticados)
CREATE POLICY "devolucoes_select_for_authenticated" 
ON public.devolucoes 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "devolucoes_all_for_authenticated" 
ON public.devolucoes 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 3. Habilitar RLS na tabela seq_consignado
ALTER TABLE public.seq_consignado ENABLE ROW LEVEL SECURITY;

-- Criar política para seq_consignado (somente usuários autenticados)
CREATE POLICY "seq_consignado_select_for_authenticated" 
ON public.seq_consignado 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "seq_consignado_all_for_authenticated" 
ON public.seq_consignado 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. Corrigir políticas RLS em app_users (não deve ser público)
DROP POLICY IF EXISTS "app_users_select_policy" ON public.app_users;

CREATE POLICY "app_users_select_for_authenticated" 
ON public.app_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. Corrigir políticas RLS em birthday_messages (não deve ser público)
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.birthday_messages;

CREATE POLICY "birthday_messages_all_for_authenticated" 
ON public.birthday_messages 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Verificar status do RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'invalid_nfe_imports', 
    'devolucoes', 
    'seq_consignado',
    'app_users',
    'birthday_messages',
    'vw_consignado_por_produto',
    'vw_estoque_consolidado'
  )
ORDER BY tablename;