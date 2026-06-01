// Tipos para o sistema de consignação

export type ConsignadoStatus = 'rascunho' | 'entregue' | 'fechado' | 'cancelado'

export interface ConsignadoLote {
  id: string
  cliente_id: string | null
  status: ConsignadoStatus
  comissao_percentual: number
  codigo: string | null
  observacoes: string | null
  criado_em: string
  prazo: string | null
}

export interface ConsignadoLoteItem {
  lote_id: string
  product_id: string
  preco_base_cents: number
  qtd: number
  desconto_percentual: number
}

export interface ConsignadoLoteFormData {
  cliente_id: string
  comissao_percentual: number
  prazo: string | null
  observacoes: string | null
}

export interface RpcConsignadoCreateLoteRequest {
  p_cliente_id: string
  p_comissao_percentual: number
  p_prazo: string | null
  p_observacoes: string | null
}

export interface RpcConsignadoCreateLoteResponse {
  data: { id: string } | null
  error: any
}

export interface RpcConsignadoAddItemRequest {
  p_lote_id: string
  p_product_code: string
  p_qtd: number
}

export interface RpcConsignadoAddItemResponse {
  success: boolean
  product_id: string
  product_name: string
  qty_in_lote: number
  estoque_normal_restante: number
  preco_base: number
}

export interface RpcConsignadoRemoveItemRequest {
  p_lote_id: string
  p_product_id: string
  p_qtd: number
}

export interface RpcConsignadoRemoveItemResponse {
  success: boolean
  product_id: string
  qty_removed: number
  qty_remaining_in_lote: number
}

export interface RpcConsignadoGetDraftResponse {
  lote: ConsignadoLote
  itens: ConsignadoLoteItem[]
}

export interface RpcConsignadoOverviewResponse {
  resumo: {
    total_produtos: number
    total_itens_consignados: number
  }
  produtos: Array<{
    product_id: string
    product_name: string
    short_code: string
    estoque_normal: number
    estoque_consignado: number
    estoque_total: number
    preco_cents: number
    clientes_count: number
  }>
}

export interface RpcConsignadoUpdateStatusRequest {
  p_lote_id: string
  p_status: ConsignadoStatus
}

export interface RpcConsignadoUpdateStatusResponse {
  success: boolean
  lote_id: string
  old_status: ConsignadoStatus
  new_status: ConsignadoStatus
}

export interface RpcConsignadoListLotesRequest {
  p_status: ConsignadoStatus | null
  p_cliente_id: string | null
  p_limit: number
  p_offset: number
}

export interface RpcConsignadoListLotesResponse {
  lotes: ConsignadoLote[]
  total_count: number
}

export interface RpcConsignadoGetStatsResponse {
  total_lotes: number
  total_itens: number
  total_valor_cents: number
  lotes_por_status: Record<ConsignadoStatus, number>
}

export interface RpcConsignadoFindProductRequest {
  p_search_term: string
}

export interface RpcConsignadoFindProductResponse {
  id: string
  name: string
  short_code: string
  price_cents: number
  stock: number
}

export interface RpcConsignadoValidateStockRequest {
  p_product_id: string
  p_qtd: number
}

export interface RpcConsignadoValidateStockResponse {
  is_valid: boolean
  available_stock: number
  message: string
}

export interface ConsignadoStockOverview {
  total_produtos: number
  total_itens_consignados: number
  total_valor_consignado_cents: number
  produtos: Array<{
    product_id: string
    product_name: string
    short_code: string
    estoque_normal: number
    estoque_consignado: number
    estoque_total: number
    preco_cents: number
    clientes_count: number
  }>
}

export interface UseConsignadoOverviewOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseConsignadoOverviewReturn {
  overview: ConsignadoStockOverview | null
  isLoading: boolean
  refresh: () => Promise<void>
}

export const CONSIGNADO_ERROR_CODES = {
  PRODUCT_NOT_FOUND: 'product_not_found',
  STOCK_INSUFFICIENT: 'stock_insufficient',
  LOTE_NOT_FOUND: 'lote_not_found',
  INVALID_STATUS: 'invalid_status',
  TRANSACTION_FAILED: 'transaction_failed'
} as const

export class ConsignadoError extends Error {
  code: string
  details?: any

  constructor(message: string, code: string, details?: any) {
    super(message)
    this.name = 'ConsignadoError'
    this.code = code
    this.details = details
  }
}

// Additional types for useConsignadoLote
export interface ConsignadoLoteSummary {
  lote: ConsignadoLote
  itens: Array<ConsignadoLoteItem & {
    product_name: string
    short_code: string
    estoque_disponivel: number
  }>
  totals: {
    subtotal_cents: number
    discount_cents: number
    total_cents: number
  }
}

export interface UseConsignadoLoteOptions {
  autoRefresh?: boolean
}

export interface UseConsignadoLoteReturn {
  lote: ConsignadoLote | null
  itens: ConsignadoLoteItem[]
  isLoading: boolean
  addItem: (productCode: string, qty: number) => Promise<void>
  removeItem: (productId: string, qty: number) => Promise<void>
  updateStatus: (status: ConsignadoStatus) => Promise<void>
  refresh: () => Promise<void>
}
