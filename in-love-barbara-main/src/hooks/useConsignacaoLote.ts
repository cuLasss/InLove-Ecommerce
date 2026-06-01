import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'

export interface ConsignacaoItem {
  id: string
  consignacao_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  commission_percent?: number
  desconto_percentual?: number // Novo: desconto por item (0-100%)
  created_at: string
  updated_at?: string
  products?: {
    id: string
    name: string
    short_code: string
    brand?: string
    size?: string
    color?: string
    price_cents: number
    stock: number
  }
}

export interface ConsignacaoLote {
  id: string
  codigo?: string
  client_id: string
  status: string
  data_prevista?: string
  data_entrega?: string
  observacao?: string
  commission_default_percent: number
  representative_name: string
  city: string
  desconto_tipo?: 'PERCENTUAL' | 'REAIS'
  desconto_valor?: number
  created_at: string
  clients?: {
    id: string
    name: string
    whatsapp?: string
  }
  [key: string]: any // Para permitir campos adicionais do Supabase
}

export interface DiscountConfig {
  tipo: 'PERCENTUAL' // Updated to match new interface
  valor: number
}

export function useConsignacaoLote(loteId: string) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [discount, setDiscount] = useState<DiscountConfig>({
    tipo: 'PERCENTUAL',
    valor: 0
  })

  // Fetch lote details
  const { data: lote, isLoading: loadingLote } = useQuery<ConsignacaoLote>({
    queryKey: ['consignacao-lote', loteId],
    queryFn: async () => {
      // Sistema local - retornar dados vazios
      return null as any
    },
    enabled: !!loteId
  })

  // Fetch items
  const { data: items = [], isLoading: loadingItems, refetch: refetchItems } = useQuery<ConsignacaoItem[]>({
    queryKey: ['consignacao-items', loteId],
    queryFn: async () => {
      // Sistema local - retornar dados vazios
      return []
    },
    enabled: !!loteId
  })

  const getTotals = () => ({
    subtotal: 0,
    discount: 0,
    total: 0
  })

  return {
    lote,
    items,
    discount,
    isLoading: loadingLote || loadingItems,
    
    addItem: () => Promise.resolve(),
    updateItemQty: () => Promise.resolve(),
    updateItemDiscount: () => Promise.resolve(),
    deleteItem: () => {},
    updateDiscount: () => {},
    deliverLote: () => {},
    
    isAddingItem: false,
    isUpdatingItem: false,
    isUpdatingItemDiscount: false,
    isDeletingItem: false,
    isUpdatingDiscount: false,
    isDelivering: false,
    
    getTotals,
    refetchItems
  }
}