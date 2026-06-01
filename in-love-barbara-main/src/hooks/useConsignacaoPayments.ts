import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { universalDataAdapter } from '@/lib/universal-data-adapter'

export interface ConsignacaoPayment {
  id: string
  sale_id: string | null
  consignacao_id: string
  amount_cents: number
  method: 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO'
  paid_at: string
  created_at: string
  // Dados adicionais para identificação
  folha_codigo: string
  cliente_name: string
  tipo: 'consignacao'
  received_by: string
  notes: string
}

export interface ConsignacaoFinancialRecord {
  id: string
  folha_codigo: string
  cliente_name: string
  valor_total_cents: number
  valor_comissao_cents: number
  valor_liquido_cents: number
  valor_pago_cents: number
  valor_restante_cents: number
  pagamentos: any[]
  data_criacao: string
  data_pagamento: string | null
  status: 'pendente' | 'pago'
  tipo: 'consignacao'
  produtos: any[]
}

interface ConsignacaoPaymentsData {
  payments: ConsignacaoPayment[]
  financialRecords: ConsignacaoFinancialRecord[]
}

// ✅ OTIMIZAÇÃO CRÍTICA: Função separada para carregar dados
async function loadConsignacaoPaymentsData(): Promise<ConsignacaoPaymentsData> {
  const startTime = Date.now()
  console.log('💰 [useConsignacaoPayments] Carregando pagamentos do Supabase...')
  
  // ✅ OTIMIZAÇÃO CRÍTICA: Carregar dados em paralelo (muito mais rápido)
  const [paymentsResponse, consignacoesResponse, clientsResponse, productsResponse] = await Promise.all([
    universalDataAdapter.getPayments(),
    universalDataAdapter.getConsignacoes(),
    universalDataAdapter.getClients(),
    universalDataAdapter.getProducts()
  ])
  
  if (paymentsResponse.error) {
    console.error('❌ [useConsignacaoPayments] Erro ao carregar pagamentos:', paymentsResponse.error)
    return { payments: [], financialRecords: [] }
  }
  
  if (consignacoesResponse.error) {
    console.error('❌ [useConsignacaoPayments] Erro ao carregar consignações:', consignacoesResponse.error)
    return { payments: [], financialRecords: [] }
  }
  
  // Filtrar apenas pagamentos de consignação (que têm consignacao_id)
  const consignacaoPayments = (paymentsResponse.data || [])
    .filter((payment: any) => payment.consignacao_id && !payment.sale_id)
    .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
  
  const clients = clientsResponse.data || []
  const products = productsResponse.data || []
  
  // Enriquecer pagamentos com dados da consignação
  const enrichedPayments = consignacaoPayments.map((payment: any) => {
    const consignacao = consignacoesResponse.data?.find((c: any) => c.id === payment.consignacao_id)
    const client = clients.find((cl: any) => cl.id === consignacao?.client_id)
    
    return {
      ...payment,
      folha_codigo: consignacao?.codigo || '',
      cliente_name: client?.name || consignacao?.cliente_name || 'Não informado',
      tipo: 'consignacao' as const,
      received_by: payment.received_by || 'Sistema',
      notes: payment.notes || ''
    }
  })
  
  // ✅ OTIMIZAÇÃO CRÍTICA: Buscar todos os itens de consignação em paralelo (muito mais rápido)
  const consignacoes = consignacoesResponse.data || []
  const itemsPromises = consignacoes.map((consignacao: any) => 
    universalDataAdapter.getConsignacaoItems(consignacao.id)
  )
  const itemsResponses = await Promise.all(itemsPromises)
  const allConsignacaoItems = itemsResponses
    .flatMap(response => response.data || [])
  const consignacaoItems = allConsignacaoItems
  
  // ✅ CORREÇÃO: Criar registros financeiros baseados nas consignações, não nos pagamentos
  const financialRecordsMap = new Map<string, ConsignacaoFinancialRecord>()
  
  // Primeiro, criar registros baseados nas consignações
  if (consignacoesResponse.data) {
    consignacoesResponse.data.forEach((consignacao: any) => {
      const key = consignacao.id
      if (!financialRecordsMap.has(key)) {
        // Calcular valor total baseado nos itens da consignação
        const items = consignacaoItems.filter((item: any) => item.consignacao_id === consignacao.id)
        let valorTotalCents = 0
        let valorComissaoTotalCents = 0
        
        // ✅ CORREÇÃO: Enriquecer itens com dados calculados para a tabela
        const itemsEnriquecidos = items.map((item: any) => {
          const product = products.find((p: any) => p.id === item.product_id)
          const precoUnitario = item.unit_price_cents || product?.price_cents || 0
          // ✅ CORREÇÃO CRÍTICA: Usar qty - qtd_devolvida para quantidade realmente vendida
          const quantidadeVendida = Math.max(0, (item.qty || 0) - (item.qtd_devolvida || 0))
          const subtotalCents = precoUnitario * quantidadeVendida
          const commissionPercent = item.commission_percent || 0
          const commissionValueCents = Math.round(subtotalCents * (commissionPercent / 100))
          
          valorTotalCents += subtotalCents
          valorComissaoTotalCents += commissionValueCents
          
          return {
            ...item,
            product_code: product?.short_code || 'N/A',
            product_name: product?.name || 'Produto não encontrado',
            unit_price_cents: precoUnitario,
            qty: quantidadeVendida,
                subtotal_cents: subtotalCents,
                commission_percent: commissionPercent,
                commission_value_cents: commissionValueCents
              }
            })
            
            const client = clients.find((cl: any) => cl.id === consignacao.client_id)
            
            financialRecordsMap.set(key, {
              id: consignacao.id,
              folha_codigo: consignacao.codigo,
              cliente_name: client?.name || consignacao.cliente_name || 'Não informado',
              valor_total_cents: valorTotalCents,
          valor_comissao_cents: valorComissaoTotalCents,
              valor_liquido_cents: valorTotalCents - valorComissaoTotalCents,
              valor_pago_cents: 0,
              valor_restante_cents: valorTotalCents,
              pagamentos: [],
              data_criacao: consignacao.created_at,
              data_pagamento: null,
          status: 'pendente',
              tipo: 'consignacao',
          produtos: itemsEnriquecidos
            })
          }
        })
      }
      
      // Depois, adicionar pagamentos aos registros existentes
      enrichedPayments.forEach((payment: ConsignacaoPayment) => {
        const key = payment.consignacao_id
        const record = financialRecordsMap.get(key)
        
        if (record) {
          record.valor_pago_cents += payment.amount_cents
          record.pagamentos.push(payment)
          
          // ✅ CORREÇÃO: Atualizar data de pagamento se houver pagamentos
          if (payment.paid_at && (!record.data_pagamento || payment.paid_at > record.data_pagamento)) {
            record.data_pagamento = payment.paid_at
          }
        }
      })
      
      // ✅ CORREÇÃO: Calcular valores restantes e determinar status final
      financialRecordsMap.forEach((record) => {
        record.valor_restante_cents = Math.max(0, record.valor_total_cents - record.valor_pago_cents)
        
        // Determinar status baseado no pagamento
        if (record.valor_total_cents === 0) {
      record.status = 'pendente'
        } else if (record.valor_pago_cents >= record.valor_total_cents) {
      record.status = 'pago'
        } else if (record.valor_pago_cents > 0) {
      record.status = 'pendente'
        } else {
      record.status = 'pendente'
        }
      })
      
  const financialRecords = Array.from(financialRecordsMap.values())
      
  const totalTime = Date.now() - startTime
  console.log(`✅ [useConsignacaoPayments] Dados carregados do Supabase em ${totalTime}ms:`, {
        pagamentos: enrichedPayments.length,
    registrosFinanceiros: financialRecords.length,
        totalPagamentosSupabase: paymentsResponse.data?.length || 0
      })
      
  return {
    payments: enrichedPayments,
    financialRecords
    }
}

export function useConsignacaoPayments(enabled: boolean = true) {
  const queryClient = useQueryClient()
  
  // ✅ OTIMIZAÇÃO CRÍTICA: Converter para useQuery com cache
  // Isso evita múltiplas queries desnecessárias ao navegar entre páginas
  // Só executar quando enabled = true (páginas que realmente precisam)
  const { data, isLoading } = useQuery<ConsignacaoPaymentsData>({
    queryKey: ['consignacao-payments'],
    queryFn: loadConsignacaoPaymentsData,
    enabled, // ✅ OTIMIZAÇÃO CRÍTICA: Só executar quando necessário
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnMount: false, // Usa cache se ainda estiver válido
    refetchOnWindowFocus: false, // Não refaz fetch ao focar na janela
    refetchOnReconnect: false, // Não refaz fetch ao reconectar
    gcTime: 30 * 60 * 1000 // ✅ OTIMIZADO: Cache por 30 minutos
  })

  const payments = data?.payments || []
  const financialRecords = data?.financialRecords || []

  // Escutar eventos de novos pagamentos para invalidar cache
  const handleConsignacaoPaymentAdded = useCallback(() => {
    console.log('🔄 [useConsignacaoPayments] Novo pagamento detectado, invalidando cache...')
    queryClient.invalidateQueries({ queryKey: ['consignacao-payments'] })
  }, [queryClient])

  // ✅ Função auxiliar para traduzir métodos de pagamento (definida antes do useMemo)
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'DINHEIRO':
        return 'Dinheiro'
      case 'PIX':
        return 'PIX'
      case 'DEBITO':
        return 'Cartão de Débito'
      case 'CREDITO':
        return 'Cartão de Crédito'
      case 'TRANSFERENCIA_BANCARIA':
        return 'Transferência Bancária'
      case 'CHEQUE':
        return 'Cheque'
      case 'BANK_TRANSFER':
        return 'Transferência Bancária'
      case 'CHECK':
        return 'Cheque'
      case 'CASH':
        return 'Dinheiro'
      case 'CREDIT_CARD':
        return 'Cartão de Crédito'
      case 'DEBIT_CARD':
        return 'Cartão de Débito'
      default:
        return method
    }
  }

  // Calcular métricas financeiras
  const calculateMetrics = useCallback(() => {
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount_cents, 0)
    const totalRecords = financialRecords.reduce((sum, record) => sum + record.valor_total_cents, 0)
    const totalPaid = financialRecords.reduce((sum, record) => sum + record.valor_pago_cents, 0)
    const totalPending = financialRecords.reduce((sum, record) => sum + record.valor_restante_cents, 0)
    
    return {
      totalPayments,
      totalRecords,
      totalPaid,
      totalPending,
      paymentCount: payments.length,
      recordCount: financialRecords.length
    }
  }, [payments, financialRecords])

  // ✅ OTIMIZAÇÃO CRÍTICA: Usar useMemo ao invés de useCallback + chamada no return
  // Isso evita recalcular toda vez que o hook renderiza
  const salesFormat = useMemo(() => {
    return financialRecords.map(record => {
      const folhaStatus = record.status === 'pago' ? 'FECHADA' : 'RASCUNHO'
      const paymentStatus = record.status === 'pago' ? 'PAGO' : 'PENDENTE'
      
      const recordPayments = payments.filter(p => p.folha_codigo === record.folha_codigo)
      const colaboradoresReceberam = recordPayments
        .filter(p => p.received_by && p.received_by !== 'Sistema')
        .map(p => p.received_by)
        .filter((nome, index, array) => array.indexOf(nome) === index)
      
      const colaboradorPrincipal = colaboradoresReceberam.length > 0 
        ? colaboradoresReceberam[0] 
        : 'Sistema Consignado'
      
      return {
        id: record.id,
        client: { name: record.cliente_name },
        user: { name: colaboradorPrincipal },
        channel: 'CONSIGNADO' as const,
        status: folhaStatus,
        total_cents: record.valor_total_cents,
        payments: recordPayments.map(p => ({
          id: p.id,
          amount_cents: p.amount_cents,
          method: p.method,
          paid_at: p.paid_at,
          method_label: getPaymentMethodLabel(p.method),
          received_by: p.received_by
        })),
        created_at: record.data_criacao,
        closed_at: record.data_pagamento,
        folha_codigo: record.folha_codigo,
        tipo: 'consignacao' as const,
        comissao_cents: record.valor_comissao_cents,
        valor_liquido_cents: record.valor_liquido_cents,
        payment_status: paymentStatus,
        paid_amount_cents: record.valor_pago_cents,
        pending_amount_cents: record.valor_restante_cents
      }
    })
  }, [financialRecords, payments])

  // ✅ OTIMIZAÇÃO: Refresh function que invalida cache
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['consignacao-payments'] })
  }, [queryClient])

  return {
    payments,
    financialRecords,
    isLoading,
    metrics: calculateMetrics(),
    salesFormat, // ✅ OTIMIZADO: Usar useMemo ao invés de chamar função
    refresh,
    getPaymentMethodLabel,
    handleConsignacaoPaymentAdded // Para usar em event listeners se necessário
  }
}
