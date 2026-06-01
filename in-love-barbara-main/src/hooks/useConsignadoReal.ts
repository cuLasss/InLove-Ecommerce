/**
 * Hook para buscar dados de consignado do banco real
 */

import { useQuery } from '@tanstack/react-query'
import { universalDataAdapter } from '@/lib/universal-data-adapter'

// Hook para buscar reservas de consignado
export function useConsignadoReservas() {
  return useQuery({
    queryKey: ['consignado-reservas'],
    queryFn: async () => {
      console.log('🔍 [useConsignadoReservas] Buscando reservas de consignado...')
      
      const { data, error } = await universalDataAdapter.getConsignadoReservas()
      
      if (error) {
        console.error('❌ [useConsignadoReservas] Erro ao buscar reservas:', error)
        throw error
      }
      
      console.log(`✅ [useConsignadoReservas] ${data?.length || 0} reservas encontradas`)
      return data || []
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
  })
}

// Hook para buscar consignado por produto
export function useConsignadoPorProduto() {
  return useQuery({
    queryKey: ['consignado-por-produto'],
    queryFn: async () => {
      console.log('🔍 [useConsignadoPorProduto] Buscando consignado por produto...')
      
      const { data, error } = await universalDataAdapter.getConsignadoPorProduto()
      
      if (error) {
        console.error('❌ [useConsignadoPorProduto] Erro ao buscar consignado por produto:', error)
        throw error
      }
      
      console.log(`✅ [useConsignadoPorProduto] ${data?.length || 0} produtos com consignado encontrados`)
      return data || []
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
  })
}

// Hook para buscar consignado por cliente
export function useConsignadoPorCliente() {
  return useQuery({
    queryKey: ['consignado-por-cliente'],
    queryFn: async () => {
      console.log('🔍 [useConsignadoPorCliente] Buscando consignado por cliente...')
      
      const { data, error } = await universalDataAdapter.getConsignadoPorCliente()
      
      if (error) {
        console.error('❌ [useConsignadoPorCliente] Erro ao buscar consignado por cliente:', error)
        throw error
      }
      
      console.log(`✅ [useConsignadoPorCliente] ${data?.length || 0} clientes com consignado encontrados`)
      return data || []
    },
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
  })
}

// Hook para buscar estatísticas gerais do consignado
export function useConsignadoStats() {
  const { data: reservas, isLoading: loadingReservas } = useConsignadoReservas()
  const { data: porProduto, isLoading: loadingPorProduto } = useConsignadoPorProduto()
  const { data: porCliente, isLoading: loadingPorCliente } = useConsignadoPorCliente()

  const isLoading = loadingReservas || loadingPorProduto || loadingPorCliente

  const stats = {
    total_reservas: reservas?.length || 0,
    total_produtos_consignados: porProduto?.length || 0,
    total_clientes_ativos: porCliente?.length || 0,
    total_unidades_reservadas: porProduto?.reduce((sum, item) => sum + (item.qty_reservada || 0), 0) || 0,
    valor_total_reservado: porProduto?.reduce((sum, item) => {
      const preco = item.products?.price_cents || 0
      const qty = item.qty_reservada || 0
      return sum + (preco * qty)
    }, 0) || 0
  }

  return {
    stats,
    isLoading,
    reservas,
    porProduto,
    porCliente
  }
}
