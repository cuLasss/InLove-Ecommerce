import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'
import { normalizeText, extractDigits } from '@/lib/text-utils'
import { useProducts } from '@/hooks/useProducts'
import { useStockQuery } from '@/hooks/useStockQuery'
import { mover_para_consignado } from '@/lib/consignado/stock-movements'

export interface ConsignacaoDraftItem {
  id: string
  consignacao_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  desconto_percentual?: number
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

export interface ConsignacaoDraftLote {
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
  desconto_percentual?: number // Only percentage now
  created_at: string
  clients?: {
    id: string
    name: string
    whatsapp?: string
  }
}

interface DraftItemState {
  product_id: string
  qty: number
  unit_price_cents: number
  desconto_percentual: number
  products?: any
}

export function useConsignacaoDraftLote(loteId: string) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { findProductByCode: findProductByCodeFromHook } = useProducts()
  const { getAvailableStock } = useStockQuery()
  
  // Draft state (frontend only - não persiste até salvar)
  const [draftItems, setDraftItems] = useState<Record<string, DraftItemState>>({})
  const [draftDiscount, setDraftDiscount] = useState<number>(0) // Only percentage
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Snapshot of saved state (for comparison)
  const snapshotRef = useRef<{
    items: Record<string, DraftItemState>
    discount: number
  }>({ items: {}, discount: 0 })

  // Fetch lote details
  const { data: lote, isLoading: loadingLote, error: loteError } = useQuery<ConsignacaoDraftLote>({
    queryKey: ['consignacao-draft-lote', loteId],
    queryFn: async () => {
      console.log('🔍 [DraftLote] Buscando lote:', loteId)
      // Sistema local - retornar null
      return null as any
    },
    enabled: !!loteId
  })

  const getMaxQtyForEdit = useCallback(async (productId: string) => {
    return await getAvailableStock(productId)
  }, [getAvailableStock])

  const addItemById = useCallback(async (productId: string, qty: number = 1) => {
    try {
      // Buscar produto pelo ID
      const { data: product, error } = await Promise.resolve({ data: null, error: null })

      if (error || !product) {
        toast({
          title: "❌ Produto não encontrado",
          description: `ID: ${productId}`,
          variant: "destructive"
        })
        return
      }

      const currentDraft = draftItems[productId]
      const currentQty = currentDraft?.qty || 0
      const availableStock = await getMaxQtyForEdit(productId)
      const newTotalQty = currentQty + qty
      
      if (newTotalQty > availableStock) {
        toast({
          title: "❌ Quantidade excede estoque disponível",
          description: `Disponível: ${availableStock}`,
          variant: "destructive"
        })
        return
      }

      setDraftItems(prev => ({
        ...prev,
        [productId]: {
          product_id: productId,
          qty: newTotalQty,
          unit_price_cents: (product as any).price_cents || 0,
          desconto_percentual: currentDraft?.desconto_percentual || 0,
          products: product
        }
      }))

      toast({
        title: "✅ Item adicionado ao rascunho",
        description: `Quantidade: ${qty}x`
      })
    } catch (error: any) {
      console.error('Error adding item by ID:', error)
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error.message || `Erro ao processar ID: ${productId}`,
        variant: "destructive"
      })
    }
  }, [draftItems, getMaxQtyForEdit, toast])

  // Função otimista para atualização de quantidade (melhoria de performance)
  const updateItemQtyOptimistic = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setDraftItems(prev => {
        const newItems = { ...prev }
        delete newItems[productId]
        return newItems
      })
      return
    }

    // ATUALIZAÇÃO OTIMISTA: Atualizar imediatamente no frontend
    setDraftItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        qty
      }
    }))
  }, [])

  // Debounce para evitar múltiplas chamadas seguidas
  const debouncedValidation = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  const debouncedUpdateItemQty = useCallback((productId: string, qty: number) => {
    // Limpar timeout anterior se existir
    if (debouncedValidation.current[productId]) {
      clearTimeout(debouncedValidation.current[productId])
    }

    // Atualização otimista imediata
    updateItemQtyOptimistic(productId, qty)

    // Validação com debounce de 300ms
    debouncedValidation.current[productId] = setTimeout(async () => {
      try {
        const availableStock = await getMaxQtyForEdit(productId)
        const currentQty = draftItems[productId]?.qty || 0
        const qtyDifference = qty - currentQty

        console.log('📦 [debouncedUpdateItemQty] Validação de estoque (NOVA LÓGICA):', {
          productId,
          availableStock,
          currentQty,
          qtySolicitada: qty,
          qtyDifference,
          explicacao: 'NOVA LÓGICA: Validação baseada no estoque disponível (reserva visual)'
        })

        // Validar se a quantidade total não excede o estoque disponível
        if (qty > availableStock) {
          // Reverter atualização otimista se inválida
          const originalQty = draftItems[productId]?.qty || 0
          updateItemQtyOptimistic(productId, originalQty)
          
          toast({
            title: "❌ Quantidade excede estoque disponível",
            description: `Estoque disponível: ${availableStock}, Quantidade solicitada: ${qty}`,
            variant: "destructive"
          })
          return
        }

        // Validar consistência após atualização
        console.log('✅ [debouncedUpdateItemQty] Quantidade atualizada:', productId, qty)
      } catch (error) {
        console.error('❌ [debouncedUpdateItemQty] Erro na validação:', error)
        // Reverter atualização otimista em caso de erro
        const originalQty = draftItems[productId]?.qty || 0
        updateItemQtyOptimistic(productId, originalQty)
      }
    }, 300)
  }, [draftItems, getMaxQtyForEdit, toast, updateItemQtyOptimistic])

  // Função principal de atualização de quantidade (usa debounce para performance)
  const updateItemQty = useCallback((productId: string, qty: number) => {
    // Usar a versão com debounce para melhor performance
    debouncedUpdateItemQty(productId, qty)
  }, [debouncedUpdateItemQty])

  const updateItemDiscount = useCallback((productId: string, discount: number) => {
    const clampedDiscount = Math.max(0, Math.min(100, discount))
    
    setDraftItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        desconto_percentual: clampedDiscount
      }
    }))
  }, [])

  const removeItemFromDraft = useCallback(async (productId: string) => {
    // Limpar timeout de debounce se existir
    if (debouncedValidation.current[productId]) {
      clearTimeout(debouncedValidation.current[productId])
      delete debouncedValidation.current[productId]
    }

    // Remover item do rascunho
    setDraftItems(prev => {
      const newItems = { ...prev }
      delete newItems[productId]
      return newItems
    })

    // Validar consistência após exclusão
    try {
      console.log('✅ [removeItemFromDraft] Item excluído:', productId)
    } catch (error) {
      console.error('❌ [removeItemFromDraft] Erro após exclusão:', error)
    }
  }, [])

  const updateDraftDiscount = useCallback((discount: number) => {
    const clampedDiscount = Math.max(0, Math.min(100, discount))
    setDraftDiscount(clampedDiscount)
  }, [])

  // Apply commission to all items individually
  const applyCommissionToAllItems = useCallback((commission: number) => {
    const clampedCommission = Math.max(0, Math.min(100, commission))
    
    setDraftItems(prev => {
      const updatedItems = { ...prev }
      Object.keys(updatedItems).forEach(productId => {
        updatedItems[productId] = {
          ...updatedItems[productId],
          desconto_percentual: clampedCommission
        }
      })
      return updatedItems
    })
    
    setHasUnsavedChanges(true)
  }, [])

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const itemsPayload = Object.values(draftItems).map(item => ({
        product_id: item.product_id,
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
        desconto_percentual: item.desconto_percentual
      }))

      console.log('💾 [DraftLote] Salvando rascunho com NOVA LÓGICA:', itemsPayload.length)
      
      // Sistema local - retornar sucesso
      return { success: true }
    },
    onSuccess: () => {
      toast({
        title: "✅ Rascunho salvo",
        description: "O rascunho foi salvo com sucesso"
      })
      setHasUnsavedChanges(false)
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const removeItemById = (id: string) => {
    removeItemFromDraft(id)
  }

  const getTotals = () => ({
    subtotal: 0,
    discount: 0,
    total: 0
  })

  const getVisualStock = (productId: string) => 0

  const getAvailableStockForDisplay = (productId: string) => 0

  return {
    draft: {
      client_id: '',
      items: Object.values(draftItems),
      discount: draftDiscount
    },
    hasUnsavedChanges,
    addItemById,
    removeItemById,
    updateItemQty,
    updateItemDiscount,
    updateDraftDiscount,
    applyCommissionToAllItems,
    saveDraft: saveDraftMutation.mutate,
    
    isSaving: saveDraftMutation.isPending,
    
    getTotals,
    getVisualStock,
    getAvailableStockForDisplay
  }
}