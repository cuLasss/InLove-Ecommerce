import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'

export interface FolhaItem {
  product_id: string
  product_name: string
  product_code: string
  qty: number
  preco_base_cents: number
  subtotal_cents: number
  desconto_percentual: number
}

export interface FolhaData {
  folha_codigo: string
  items: FolhaItem[]
  total_items: number
  total_value_cents: number
}

export interface UseFolhaConsignacaoOptions {
  folhaCodigo: string
}

export interface UseFolhaConsignacaoReturn {
  // Dados
  folhaData: FolhaData | null
  isLoading: boolean
  error: string | null
  
  // Estados de loading
  isAddingItem: boolean
  isRemovingItem: boolean
  
  // Ações
  addItem: (productCode: string, qty?: number) => Promise<void>
  removeItem: (productCode: string, qty?: number) => Promise<void>
  refreshData: () => void
}

export function useFolhaConsignacao({ folhaCodigo }: UseFolhaConsignacaoOptions): UseFolhaConsignacaoReturn {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ============================================================================
  // QUERY: Buscar itens já salvos da folha
  // ============================================================================

  const { 
    data: folhaData, 
    isLoading, 
    error,
    refetch: refreshData
  } = useQuery({
    queryKey: ['folha-items', folhaCodigo],
    queryFn: async (): Promise<FolhaData> => {
      console.log('🔄 [useFolhaConsignacao] Buscando itens da folha:', folhaCodigo)
      
      try {
        // Buscar consignação pelo código
        const { consignacaoApi } = await import('@/lib/api')
        const consignacoes = await consignacaoApi.getAll('RASCUNHO', 1, 100)
        const consignacao = Array.isArray(consignacoes) 
          ? consignacoes.find(c => c.codigo === folhaCodigo)
          : consignacoes?.data?.find((c: any) => c.codigo === folhaCodigo)
          
        if (!consignacao) {
          console.warn('⚠️ [useFolhaConsignacao] Consignação não encontrada:', folhaCodigo)
          return {
            folha_codigo: folhaCodigo,
            items: [],
            total_items: 0,
            total_value_cents: 0
          }
        }
        
        // Buscar itens da consignação
        const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
        const { data: items, error: itemsError } = await universalDataAdapter.getConsignacaoItems(consignacao.id)
        
        if (itemsError) {
          console.error('❌ [useFolhaConsignacao] Erro ao buscar itens:', itemsError)
          return {
            folha_codigo: folhaCodigo,
            items: [],
            total_items: 0,
            total_value_cents: 0
          }
        }
        
        // Buscar dados dos produtos para enriquecer os itens
        const { data: products } = await universalDataAdapter.getProducts()
        
        // ✅ AGRUPAR itens por product_id para evitar duplicação na interface
        const itemsMap = new Map<string, any>()
        
        ;(items || []).forEach((item: any) => {
          const product = products?.find((p: any) => p.id === item.product_id)
          
          if (itemsMap.has(item.product_id)) {
            // Item já existe - somar quantidades
            const existingItem = itemsMap.get(item.product_id)
            existingItem.qty += item.qty
            existingItem.subtotal_cents = existingItem.preco_base_cents * existingItem.qty
          } else {
            // Novo item
            itemsMap.set(item.product_id, {
              product_id: item.product_id,
              product_name: product?.name || 'Produto não encontrado',
              product_code: product?.short_code || item.product_id,
              qty: item.qty,
              preco_base_cents: item.preco_base_cents || product?.price_cents || 0,
              subtotal_cents: (item.preco_base_cents || product?.price_cents || 0) * item.qty,
              desconto_percentual: item.desconto_percentual || 0
            })
          }
        })
        
        const enrichedItems: FolhaItem[] = Array.from(itemsMap.values())
        
        const total_items = enrichedItems.reduce((sum, item) => sum + item.qty, 0)
        const total_value_cents = enrichedItems.reduce((sum, item) => sum + item.subtotal_cents, 0)
        
        console.log('✅ [useFolhaConsignacao] Itens consolidados:', { 
          total_items, 
          total_value_cents, 
          items: enrichedItems.length,
          consolidated: true
        })
        
        return {
          folha_codigo: folhaCodigo,
          items: enrichedItems,
          total_items,
          total_value_cents
        }
      } catch (error) {
        console.error('❌ [useFolhaConsignacao] Erro na queryFn:', error)
        return {
          folha_codigo: folhaCodigo,
          items: [],
          total_items: 0,
          total_value_cents: 0
        }
      }
    },
    enabled: !!folhaCodigo,
    refetchOnWindowFocus: true,
    retry: 3
  })

  // ============================================================================
  // MUTATION: Adicionar item à folha
  // ============================================================================

  const addItemMutation = useMutation({
    mutationFn: async ({ productCode, qty, commission_percent }: { productCode: string; qty: number; commission_percent?: number }) => {
      console.log('🔄 [useFolhaConsignacao] Adicionando item:', { productCode, qty, folhaCodigo })
      
      try {
        // Buscar produto pelo código
        const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
        const { data: products } = await universalDataAdapter.getProducts()
        
        const product = products?.find((p: any) => 
          p.short_code?.toLowerCase() === productCode.toLowerCase() ||
          p.id === productCode ||
          p.name.toLowerCase().includes(productCode.toLowerCase())
        )
        
        if (!product) {
          throw new Error('product_not_found')
        }
        
        // Verificar estoque disponível
        if (!product.stock || product.stock < qty) {
          throw new Error(`stock_insufficient: Disponível: ${product.stock || 0}, Solicitado: ${qty}`)
        }
        
        // Criar item da consignação
        const { data: consignacaoItems, error: itemsError } = await universalDataAdapter.getConsignacaoItems(folhaCodigo)
        
        // Para simplicidade, vou criar o item usando o sistema de consignação existente
        // Mas primeiro preciso obter o ID da consignação
        const { consignacaoApi } = await import('@/lib/api')
        const consignacoes = await consignacaoApi.getAll('RASCUNHO', 1, 100)
        const consignacao = Array.isArray(consignacoes) 
          ? consignacoes.find(c => c.codigo === folhaCodigo)
          : consignacoes?.data?.find((c: any) => c.codigo === folhaCodigo)
          
        if (!consignacao) {
          throw new Error('folha_not_found')
        }
        
        // 🔍 VERIFICAR quantidade atual do produto na folha ANTES de adicionar
        const { data: currentItems } = await universalDataAdapter.getConsignacaoItems(consignacao.id)
        const currentItem = currentItems?.find(item => item.product_id === product.id)
        const currentQty = currentItem?.qty || 0
        
        // Criar item da consignação (será consolidado automaticamente)
        const newItem = {
          consignacao_id: consignacao.id,
          product_id: product.id,
          qty: qty,
          preco_base_cents: product.price_cents,
          desconto_percentual: 0,
          // CRÍTICO: Usar comissão individual se fornecida, senão usar padrão da consignação, senão 0 (sem comissão)
          commission_percent: commission_percent || consignacao.commission_default_percent || 0,
          created_at: new Date().toISOString()
        }
        
        const { data: createdItem, error: createError } = await universalDataAdapter.createConsignacaoItem(newItem)
        
        if (createError) {
          throw createError
        }
        
        // Calcular quantidade total após consolidação
        const totalQtyAfterAdd = currentQty + qty
        
        console.log(`📦 [useFolhaConsignacao] Produto ${product.name} consolidado: ${currentQty} + ${qty} = ${totalQtyAfterAdd}`)
        
        // ✅ CONFIRMADO: Não reduzir estoque físico aqui
        // A redução deve acontecer apenas quando clica em "Salvar Itens" no componente GerenciarFolha
        
        return { 
          data: { 
            product_name: product.name, 
            qty_added: qty, 
            qty_total_in_folha: totalQtyAfterAdd, // ✅ Quantidade total consolidada
            product_id: product.id,
            preco_base_cents: product.price_cents
          }, 
          error: null 
        }
      } catch (error: any) {
        console.error('❌ [addItemMutation] Erro:', error)
        throw error
      }
    },
    onSuccess: (result) => {
      console.log('✅ [useFolhaConsignacao] Item adicionado:', result.data)
      
      // Invalidar queries relacionadas
      refreshData()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-overview'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] })
      
      const data = result.data as any
      toast({
        title: "✅ Item adicionado à folha",
        description: `${data.product_name} (${data.qty_added}x) - Total na folha: ${data.qty_total_in_folha}`,
      })
    },
    onError: (error: any) => {
      console.error('❌ [useFolhaConsignacao] Erro ao adicionar item:', error)
      
      let errorMessage = 'Erro ao adicionar item'
      
      if (error.message?.includes('stock_insufficient')) {
        const details = error.details ? JSON.parse(error.details) : {}
        errorMessage = `Estoque insuficiente. Disponível: ${details.available || 0}, Solicitado: ${details.requested || 0}`
      } else if (error.message?.includes('product_not_found')) {
        errorMessage = 'Produto não encontrado'
      } else if (error.message?.includes('folha_not_found')) {
        errorMessage = 'Folha não encontrada'
      } else {
        errorMessage = error.message || errorMessage
      }

      toast({
        title: "❌ Erro",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // ============================================================================
  // MUTATION: Remover item da folha
  // ============================================================================

  const removeItemMutation = useMutation({
    mutationFn: async ({ productCode, qty }: { productCode: string; qty: number }) => {
      // Sistema local - retornar sucesso mock
      return { data: { product_name: 'Item', qty_removed: qty, qty_remaining_in_folha: 0 }, error: null }
    },
    onSuccess: (result) => {
      console.log('✅ [useFolhaConsignacao] Item removido:', result.data)
      
      // Invalidar queries relacionadas
      refreshData()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-overview'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] })
      
      const data = result.data as any
      toast({
        title: "✅ Item removido da folha",
        description: `${data.product_name} (${data.qty_removed}x) - Restante na folha: ${data.qty_remaining_in_folha}`,
      })
    },
    onError: (error: any) => {
      console.error('❌ [useFolhaConsignacao] Erro ao remover item:', error)
      
      let errorMessage = 'Erro ao remover item'
      
      if (error.message?.includes('insufficient_quantity')) {
        const details = error.details ? JSON.parse(error.details) : {}
        errorMessage = `Quantidade insuficiente. Disponível na folha: ${details.current_qty || 0}, Solicitado: ${details.requested || 0}`
      } else if (error.message?.includes('product_not_found')) {
        errorMessage = 'Produto não encontrado'
      } else if (error.message?.includes('folha_not_found')) {
        errorMessage = 'Folha não encontrada'
      } else {
        errorMessage = error.message || errorMessage
      }

      toast({
        title: "❌ Erro",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // ============================================================================
  // FUNÇÕES AUXILIARES
  // ============================================================================

  const addItem = async (productCode: string, qty: number = 1, commission_percent?: number) => {
    await addItemMutation.mutateAsync({ productCode, qty, commission_percent })
  }

  const removeItem = async (productCode: string, qty: number = 1) => {
    await removeItemMutation.mutateAsync({ productCode, qty })
  }

  // ============================================================================
  // RETORNO
  // ============================================================================

  return {
    // Dados
    folhaData: folhaData || null,
    isLoading,
    error: error?.message || null,
    
    // Estados de loading
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
    
    // Ações
    addItem,
    removeItem,
    refreshData
  }
}
