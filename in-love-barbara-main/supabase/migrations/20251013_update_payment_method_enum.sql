-- Migração para atualizar enum payment_method no Supabase
-- Adicionar novas opções de pagamento: TRANSFERENCIA_BANCARIA e CHEQUE

-- Primeiro, vamos verificar o enum atual
SELECT unnest(enum_range(NULL::payment_method)) as current_values;

-- Adicionar novos valores ao enum
ALTER TYPE payment_method ADD VALUE 'TRANSFERENCIA_BANCARIA';
ALTER TYPE payment_method ADD VALUE 'CHEQUE';

-- Verificar se os valores foram adicionados
SELECT unnest(enum_range(NULL::payment_method)) as updated_values;

-- Comentário: O enum agora deve ter os valores:
-- DINHEIRO, PIX, DEBITO, CREDITO, TRANSFERENCIA_BANCARIA, CHEQUE, OUTRO

