/**
 * Hook para Visão Geral do Estoque Consignado
 * 
 * Este hook gerencia a visualização geral do estoque consignado,
 * incluindo estatísticas e distribuição por produto.
 */

import { useQuery } from '@tanstack/react-query'
import { consignadoApi } from '@/lib/consignado/api'
import type {
  ConsignadoStockOverview,
  UseConsignadoOverviewOptions,
  UseConsignadoOverviewReturn
} from '@/integrations/supabase/consignado-types'

export function useConsignadoOverview(options: UseConsignadoOverviewOptions = {}): UseConsignadoOverviewReturn {
  const { autoRefresh = true, refreshInterval = 30000 } = options

  // Buscar visão geral do estoque
  const { 
    data: overviewData, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['consignado-overview'],
    queryFn: consignadoApi.getOverview,
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: true,
    retry: 3,
    staleTime: 10000 // 10 segundos
  })

  // Transformar dados para o formato esperado
  const overview: ConsignadoStockOverview | null = overviewData ? {
    total_produtos: overviewData.resumo.total_produtos,
    total_itens_consignados: overviewData.resumo.total_itens_consignados,
    total_valor_consignado_cents: overviewData.produtos.reduce(
      (sum, produto) => sum + (produto.preco_cents * produto.estoque_consignado), 
      0
    ),
    produtos: overviewData.produtos.map(produto => ({
      product_id: produto.product_id,
      product_name: produto.product_name,
      short_code: produto.short_code,
      estoque_normal: produto.estoque_normal,
      estoque_consignado: produto.estoque_consignado,
      estoque_total: produto.estoque_total,
      preco_cents: produto.preco_cents,
      clientes_count: produto.clientes_count
    }))
  } : null

  return {
    overview,
    isLoading,
    refresh: async () => { await refetch(); }
  }
}

/**
 * Hook para Estatísticas de Consignação
 */
export function useConsignadoStats() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['consignado-stats'],
    queryFn: consignadoApi.getStats,
    refetchInterval: 60000, // 1 minuto
    refetchOnWindowFocus: true,
    retry: 3,
    staleTime: 30000 // 30 segundos
  })

  return {
    stats,
    isLoading,
    refresh: refetch
  }
}

/**
 * Hook para Listar Lotes com Filtros
 */
export function useConsignadoLotes(filters: {
  status?: string | null
  cliente_id?: string | null
  limit?: number
  offset?: number
} = {}) {
  const { data: lotesData, isLoading, refetch } = useQuery({
    queryKey: ['consignado-lotes', filters],
    queryFn: () => consignadoApi.listLotes({
      p_status: filters.status as any,
      p_cliente_id: filters.cliente_id,
      p_limit: filters.limit || 50,
      p_offset: filters.offset || 0
    }),
    refetchInterval: 120000, // 2 minutos (otimizado)
    refetchOnWindowFocus: true,
    retry: 3,
    staleTime: 15000 // 15 segundos
  })

  return {
    lotes: lotesData?.lotes || [],
    totalCount: lotesData?.total_count || 0,
    isLoading,
    refresh: refetch
  }
}
