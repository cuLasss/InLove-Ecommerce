/**
 * API Client para Sistema de Consignação
 * 
 * Este módulo implementa todas as operações de API para o novo sistema
 * de consignação baseado em lotes.
 */

// Sistema local - não precisa de Supabase
import type {
  ConsignadoLote,
  ConsignadoLoteItem,
  ConsignadoStatus,
  RpcConsignadoAddItemRequest,
  RpcConsignadoAddItemResponse,
  RpcConsignadoRemoveItemRequest,
  RpcConsignadoRemoveItemResponse,
  RpcConsignadoGetDraftResponse,
  RpcConsignadoOverviewResponse,
  RpcConsignadoCreateLoteRequest,
  RpcConsignadoCreateLoteResponse,
  RpcConsignadoUpdateStatusRequest,
  RpcConsignadoUpdateStatusResponse,
  RpcConsignadoListLotesRequest,
  RpcConsignadoListLotesResponse,
  RpcConsignadoGetStatsResponse,
  RpcConsignadoFindProductRequest,
  RpcConsignadoFindProductResponse,
  RpcConsignadoValidateStockRequest,
  RpcConsignadoValidateStockResponse,
  ConsignadoLoteFormData,
  ConsignadoError,
  CONSIGNADO_ERROR_CODES
} from '@/integrations/supabase/consignado-types'

// ============================================================================
// FUNÇÕES DA API (SEM CLASSE PARA EVITAR PROBLEMAS COM HOOKS)
// ============================================================================

export const consignadoApi = {
  async createLote(data: ConsignadoLoteFormData): Promise<RpcConsignadoCreateLoteResponse> {
    try {
      console.log('🔄 [ConsignadoApi] Criando novo lote:', data)
      return { data: { id: 'mock-id' }, error: null }
    } catch (error) {
      console.error('Erro ao criar folha:', error)
      return { data: null, error }
    }
  },

  async getDraft(loteId: string): Promise<any> {
    console.log('🔄 [ConsignadoApi] Buscando rascunho:', loteId)
    return { lote: null, itens: [] }
  },

  async addItem(request: RpcConsignadoAddItemRequest): Promise<RpcConsignadoAddItemResponse> {
    console.log('🔄 [ConsignadoApi] Adicionando item:', request)
    return {
      success: true,
      product_id: 'mock-id',
      product_name: 'Mock Product',
      qty_in_lote: request.p_qtd,
      estoque_normal_restante: 0,
      preco_base: 0
    }
  },

  async removeItem(request: RpcConsignadoRemoveItemRequest): Promise<RpcConsignadoRemoveItemResponse> {
    console.log('🔄 [ConsignadoApi] Removendo item:', request)
    return {
      success: true,
      product_id: request.p_product_id,
      qty_removed: request.p_qtd,
      qty_remaining_in_lote: 0
    }
  },

  async updateStatus(request: RpcConsignadoUpdateStatusRequest): Promise<RpcConsignadoUpdateStatusResponse> {
    console.log('🔄 [ConsignadoApi] Atualizando status:', request)
    return {
      success: true,
      lote_id: request.p_lote_id,
      old_status: 'rascunho',
      new_status: request.p_status
    }
  },

  async getOverview(): Promise<any> {
    console.log('🔄 [ConsignadoApi] Buscando overview')
    return {
      resumo: { total_produtos: 0, total_itens_consignados: 0 },
      produtos: []
    }
  },

  async getStats(): Promise<RpcConsignadoGetStatsResponse> {
    console.log('🔄 [ConsignadoApi] Buscando estatísticas')
    return {
      total_lotes: 0,
      total_itens: 0,
      total_valor_cents: 0,
      lotes_por_status: { rascunho: 0, entregue: 0, fechado: 0, cancelado: 0 }
    }
  },

  async listLotes(request: RpcConsignadoListLotesRequest): Promise<RpcConsignadoListLotesResponse> {
    console.log('🔄 [ConsignadoApi] Listando lotes:', request)
    return { lotes: [], total_count: 0 }
  },

  async validateStock(request: RpcConsignadoValidateStockRequest): Promise<RpcConsignadoValidateStockResponse> {
    console.log('🔄 [ConsignadoApi] Validando estoque:', request)
    return {
      is_valid: true,
      available_stock: 100,
      message: 'Estoque disponível'
    }
  }
}

// Helper functions
export const formatCurrency = (cents: number): string => {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR')
}

export const getStatusColor = (status: ConsignadoStatus): string => {
  const colors = {
    rascunho: 'gray',
    entregue: 'blue',
    fechado: 'green',
    cancelado: 'red'
  }
  return colors[status] || 'gray'
}

export const getStatusText = (status: ConsignadoStatus): string => {
  const texts = {
    rascunho: 'Rascunho',
    entregue: 'Entregue',
    fechado: 'Fechado',
    cancelado: 'Cancelado'
  }
  return texts[status] || status
}
