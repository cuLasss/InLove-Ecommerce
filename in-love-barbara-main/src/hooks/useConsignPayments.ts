import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { consignPaymentsApi } from '@/lib/api'

export interface ConsignPayment {
  id: string
  consign_lote_id: string
  method: 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'OUTRO'
  amount_cents: number
  note?: string
  created_at: string
  created_by?: string
}

export interface PaymentSummary {
  total_amount_cents: number
  commission_cents: number
  net_amount_cents: number
  paid_amount_cents: number
  remaining_amount_cents: number
  is_fully_paid: boolean
  payment_count: number
}

interface UseConsignPaymentsReturn {
  payments: ConsignPayment[]
  summary: PaymentSummary | null
  isLoading: boolean
  error: string | null
  addPayment: (payment: {
    method: ConsignPayment['method']
    amount_cents: number
    note?: string
  }) => Promise<void>
  refreshPayments: () => Promise<void>
  deletePayment: (paymentId: string) => Promise<void>
}

export function useConsignPayments(loteId: string): UseConsignPaymentsReturn {
  const [payments, setPayments] = useState<ConsignPayment[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Função para buscar pagamentos
  const fetchPayments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await consignPaymentsApi.getPayments(loteId)
      
      setPayments((data || []).map(payment => ({
        id: payment.id,
        consign_lote_id: loteId,
        method: payment.method as ConsignPayment['method'],
        amount_cents: payment.amount_cents,
        note: payment.note,
        created_at: payment.paid_at,
        created_by: undefined
      })))
      setSummary(null)

    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar pagamentos'
      setError(errorMessage)
      console.error('Erro ao buscar pagamentos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const addPayment = async (paymentData: {
    method: ConsignPayment['method']
    amount_cents: number
    note?: string
  }) => {
    try {
      const newPayment = await consignPaymentsApi.create({
        consignacao_id: loteId,
        ...paymentData
      })
      
      // Atualiza a lista local
      setPayments(prev => [{
        id: newPayment.id,
        consign_lote_id: loteId,
        method: newPayment.method as ConsignPayment['method'],
        amount_cents: newPayment.amount_cents,
        note: newPayment.note,
        created_at: newPayment.paid_at,
        created_by: undefined
      }, ...prev])
      
      // Recarrega o resumo
      await fetchPayments()

    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao adicionar pagamento'
      throw new Error(errorMessage)
    }
  }

  // Função para deletar pagamento
  const deletePayment = async (paymentId: string) => {
    try {
      await consignPaymentsApi.deletePayment(paymentId)

      // Remove da lista local
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      
      // Recarrega o resumo
      await fetchPayments()

      toast({
        title: "Pagamento removido",
        description: "O pagamento foi removido com sucesso.",
      })

    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao remover pagamento'
      toast({
        title: "Erro ao remover pagamento",
        description: errorMessage,
        variant: "destructive"
      })
      throw new Error(errorMessage)
    }
  }

  // Função para refresh manual
  const refreshPayments = async () => {
    await fetchPayments()
  }

  // Carrega pagamentos na inicialização
  useEffect(() => {
    if (loteId) {
      fetchPayments()
    }
  }, [loteId])

  return {
    payments,
    summary,
    isLoading,
    error,
    addPayment,
    refreshPayments,
    deletePayment,
  }
}

// Hook auxiliar para formatação de valores
export function usePaymentFormatters() {
  const formatCurrency = (cents: number): string => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
  }

  const formatPaymentMethod = (method: ConsignPayment['method']): string => {
    const methods = {
      DINHEIRO: 'Dinheiro',
      PIX: 'PIX',
      DEBITO: 'Cartão de Débito',
      CREDITO: 'Cartão de Crédito',
      OUTRO: 'Outro'
    }
    return methods[method] || method
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentMethodColor = (method: ConsignPayment['method']): string => {
    const colors = {
      DINHEIRO: 'text-green-600',
      PIX: 'text-blue-600',
      DEBITO: 'text-purple-600',
      CREDITO: 'text-orange-600',
      OUTRO: 'text-gray-600'
    }
    return colors[method] || 'text-gray-600'
  }

  return {
    formatCurrency,
    formatPaymentMethod,
    formatDateTime,
    getPaymentMethodColor,
  }
}