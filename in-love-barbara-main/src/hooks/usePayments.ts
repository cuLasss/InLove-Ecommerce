import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'

export interface PaymentRecord {
  id: string
  consignacao_id: string
  method: string
  payment_type: string
  amount_cents: number
  note?: string
  payment_notes?: string
  paid_at: string
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  received_by?: string
  created_at: string
  updated_at: string
  // Dados da colaboradora
  collaborator?: {
    id: string
    name: string
    email: string
  }
}

export interface CreatePaymentData {
  consignacao_id: string
  payment_type: 'cash' | 'pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'other'
  amount_cents: number
  payment_notes?: string
  received_by: string
}

export interface PaymentSummary {
  total_amount_cents: number
  total_paid_cents: number
  remaining_cents: number
  payments: PaymentRecord[]
}

export const usePayments = (consignacaoId?: string) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Buscar pagamentos de uma consignação específica
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['consignacao-payments', consignacaoId],
    queryFn: async () => {
      if (!consignacaoId) return []
      
      try {
        // Sistema local - retornar dados vazios
        return []
      } catch (error) {
        console.error('Erro ao buscar pagamentos:', error)
        return []
      }
    },
    enabled: !!consignacaoId
  })

  return {
    payments,
    paymentsLoading,
    isProcessing
  }
}
