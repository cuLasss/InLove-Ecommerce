/**
 * Hook para Gerenciar Lotes de Consignação
 * 
 * Este hook implementa toda a lógica de gerenciamento de lotes de consignação,
 * incluindo operações de CRUD, validações e estados de loading.
 */

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consignadoApi, ConsignadoApiError } from '@/lib/consignado/api'
import { useToast } from '@/hooks/use-toast'
import type {
  ConsignadoLote,
  ConsignadoLoteItem,
  ConsignadoStatus,
  ConsignadoLoteSummary,
  UseConsignadoLoteOptions,
  UseConsignadoLoteReturn,
  RpcConsignadoGetDraftResponse
} from '@/integrations/supabase/consignado-types'

export function useConsignadoLote(options: UseConsignadoLoteOptions): UseConsignadoLoteReturn {
  const { loteId, autoRefresh = true, refreshInterval = 30000 } = options
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ============================================================================
  // ESTADOS LOCAIS
  // ============================================================================

  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isRemovingItem, setIsRemovingItem] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Buscar dados do lote
  const { 
    data: draftData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<RpcConsignadoGetDraftResponse>({
    queryKey: ['consignado-draft', loteId],
    queryFn: () => consignadoApi.getDraft(loteId),
    enabled: !!loteId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: true,
    retry: 3
  })

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Adicionar item ao lote
  const addItemMutation = useMutation({
    mutationFn: async ({ productCode, qty }: { productCode: string; qty?: number }) => {
      return await consignadoApi.addItem({
        p_lote_id: loteId,
        p_product_code: productCode,
        p_qtd: qty || 1
      })
    },
    onSuccess: (result) => {
      console.log('✅ [useConsignadoLote] Item adicionado:', result)
      
      toast({
        title: "✅ Item adicionado",
        description: `${result.product_name} - Qtd: ${result.qty_in_lote}`,
      })

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['consignado-draft', loteId] })
      queryClient.invalidateQueries({ queryKey: ['consignado-overview'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-stats'] })
    },
    onError: (error: any) => {
      console.error('❌ [useConsignadoLote] Erro ao adicionar item:', error)
      
      let errorMessage = 'Erro ao adicionar item'
      
      // Error handling - generic approach since we don't have specific error codes
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage
      }

      toast({
        title: "❌ Erro",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // Remover item do lote
  const removeItemMutation = useMutation({
    mutationFn: async ({ productId, qty }: { productId: string; qty: number }) => {
      return await consignadoApi.removeItem({
        p_lote_id: loteId,
        p_product_id: productId,
        p_qtd: qty
      })
    },
    onSuccess: (result) => {
      console.log('✅ [useConsignadoLote] Item removido:', result)
      
      toast({
        title: "✅ Item removido",
        description: `Quantidade removida: ${result.qty_removed}`,
      })

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['consignado-draft', loteId] })
      queryClient.invalidateQueries({ queryKey: ['consignado-overview'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-stats'] })
    },
    onError: (error: any) => {
      console.error('❌ [useConsignadoLote] Erro ao remover item:', error)
      
      toast({
        title: "❌ Erro",
        description: error.message || 'Erro ao remover item',
        variant: "destructive"
      })
    }
  })

  // Atualizar status do lote
  const updateStatusMutation = useMutation({
    mutationFn: async (status: ConsignadoStatus) => {
      return await consignadoApi.updateStatus(loteId, status)
    },
    onSuccess: (result) => {
      console.log('✅ [useConsignadoLote] Status atualizado:', result)
      
      toast({
        title: "✅ Status atualizado",
        description: `Lote alterado para: ${getStatusText(result.new_status)}`,
      })

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['consignado-draft', loteId] })
      queryClient.invalidateQueries({ queryKey: ['consignado-overview'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-stats'] })
    },
    onError: (error: any) => {
      console.error('❌ [useConsignadoLote] Erro ao atualizar status:', error)
      
      toast({
        title: "❌ Erro",
        description: error.message || 'Erro ao atualizar status',
        variant: "destructive"
      })
    }
  })

  // ============================================================================
  // FUNÇÕES DE AÇÃO
  // ============================================================================

  const addItem = useCallback(async (productCode: string, qty: number = 1) => {
    setIsAddingItem(true)
    try {
      await addItemMutation.mutateAsync({ productCode, qty })
    } finally {
      setIsAddingItem(false)
    }
  }, [addItemMutation])

  const removeItem = useCallback(async (productId: string, qty: number) => {
    setIsRemovingItem(true)
    try {
      await removeItemMutation.mutateAsync({ productId, qty })
    } finally {
      setIsRemovingItem(false)
    }
  }, [removeItemMutation])

  const updateStatus = useCallback(async (status: ConsignadoStatus) => {
    setIsUpdatingStatus(true)
    try {
      await updateStatusMutation.mutateAsync(status)
    } finally {
      setIsUpdatingStatus(false)
    }
  }, [updateStatusMutation])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // ============================================================================
  // FUNÇÕES UTILITÁRIAS
  // ============================================================================

  const getItemQty = useCallback((productId: string): number => {
    if (!draftData?.itens) return 0
    
    const item = draftData.itens.find(item => item.product_id === productId)
    return item?.qtd || 0
  }, [draftData])

  const getAvailableStock = useCallback((productId: string): number => {
    if (!draftData?.itens) return 0
    
    const item = draftData.itens.find(item => item.product_id === productId)
    return item?.estoque_disponivel || 0
  }, [draftData])

  const validateStock = useCallback(async (productId: string, qty: number): Promise<boolean> => {
    try {
      const result = await consignadoApi.validateStock({
        p_product_id: productId,
        p_lote_id: loteId,
        p_qtd: qty
      })
      return result.valid
    } catch (error) {
      console.error('❌ [useConsignadoLote] Erro na validação de estoque:', error)
      return false
    }
  }, [loteId])

  // ============================================================================
  // CÁLCULOS DERIVADOS
  // ============================================================================

  const lote: ConsignadoLote | null = draftData?.lote || null
  const itens: ConsignadoLoteItem[] = draftData?.itens?.map(item => ({
    lote_id: loteId,
    product_id: item.product_id,
    preco_base_cents: item.preco_base_cents,
    qtd: item.qtd,
    desconto_percentual: item.desconto_percentual,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product: {
      id: item.product_id,
      name: item.product_name,
      short_code: item.short_code,
      qr_code: null,
      price_cents: item.preco_base_cents,
      stock: item.estoque_disponivel,
      color: null,
      size: null
    }
  })) || []

  const summary: ConsignadoLoteSummary = {
    total_itens: itens.reduce((sum, item) => sum + item.qtd, 0),
    total_valor_cents: itens.reduce((sum, item) => sum + (item.preco_base_cents * item.qtd), 0),
    total_comissao_cents: itens.reduce((sum, item) => {
      const itemTotal = item.preco_base_cents * item.qtd
      const comissao = (lote?.comissao_percentual || 0) / 100
      return sum + (itemTotal * comissao)
    }, 0),
    total_desconto_cents: itens.reduce((sum, item) => {
      const itemTotal = item.preco_base_cents * item.qtd
      const desconto = item.desconto_percentual / 100
      return sum + (itemTotal * desconto)
    }, 0)
  }

  // ============================================================================
  // RETORNO DO HOOK
  // ============================================================================

  return {
    // Dados
    lote,
    itens,
    summary,
    
    // Estados de loading
    isLoading,
    isAddingItem,
    isRemovingItem,
    isUpdatingStatus,
    
    // Ações
    addItem,
    removeItem,
    updateStatus,
    refresh,
    
    // Utilitários
    getItemQty,
    getAvailableStock,
    validateStock
  }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function getStatusText(status: ConsignadoStatus): string {
  const texts = {
    rascunho: 'Rascunho',
    entregue: 'Entregue',
    aguardando_pagamento: 'Aguardando Pagamento',
    fechado: 'Fechado',
    cancelado: 'Cancelado'
  }
  return texts[status] || status
}
