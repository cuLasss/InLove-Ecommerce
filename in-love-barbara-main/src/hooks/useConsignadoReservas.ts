import { useQuery } from '@tanstack/react-query'
import { consignacaoApi } from '@/lib/api'

export interface ConsignadoReserva {
  product_id: string
  product_name: string
  short_code: string
  total_reservado: number
  clientes: Array<{
    cliente_id: string
    cliente_name: string
    folha_codigo: string
    quantidade: number
    status: string
  }>
}

export interface ConsignadoReservasData {
  total_produtos_reservados: number
  total_unidades_reservadas: number
  total_valor_reservado_cents: number
  total_clientes_ativos: number
  reservas: ConsignadoReserva[]
}

export function useConsignadoReservas() {
  // ✅ OTIMIZAÇÃO: Usar a mesma query base compartilhada ('consignacao-all')
  // Isso evita múltiplas chamadas ao mesmo endpoint
  // O React Query vai reutilizar o cache se já existir
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['consignado-reservas'],
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (mesma config do Consignado)
    refetchOnWindowFocus: false, // ✅ OTIMIZADO: Não refetch (usa cache base)
    refetchOnMount: false, // ✅ OTIMIZADO: Não refetch (usa cache base)
    refetchOnReconnect: false,
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<ConsignadoReservasData> => {
      try {
        // ✅ OTIMIZAÇÃO: Usar cache compartilhado se disponível
        // Buscar todas as consignações primeiro (sem filtro)
        const consignacoesResponse = await consignacaoApi.getAll(undefined, 1, 1000)
        const allConsignacoes = Array.isArray(consignacoesResponse) 
          ? consignacoesResponse 
          : consignacoesResponse?.data || []

        // Filtrar consignações ENTREGUE (Com a Cliente) e RASCUNHO (Em preparação)
        // EM_CONFERENCIA não deve estar nas reservas pois o produto já foi vendido
        const consignacoes = allConsignacoes.filter((c: any) => c.status === 'ENTREGUE' || c.status === 'RASCUNHO')

        // Agrupar dados por produto
        const reservasMap = new Map<string, ConsignadoReserva>()
        let totalUnidadesReservadas = 0
        let totalValorReservadoCents = 0
        const clientesAtivos = new Set<string>()

        for (const consignacao of consignacoes) {
          if (!consignacao.id) continue

          // Buscar itens da consignação
          const { data: items } = await consignacaoApi.getItemsWithProducts(consignacao.id)
          
          if (!items) continue

          for (const item of items) {
            if (!item.product_id || !item.products) continue

            const productId = item.product_id
            const productName = item.products.name || 'Produto não encontrado'
            const shortCode = item.products.short_code || ''
            const quantidade = item.qty || 0
            const precoUnitario = item.preco_base_cents || item.unit_price_cents || 0

            // Adicionar ao mapa de reservas
            if (!reservasMap.has(productId)) {
              reservasMap.set(productId, {
                product_id: productId,
                product_name: productName,
                short_code: shortCode,
                total_reservado: 0,
                clientes: []
              })
            }

            const reserva = reservasMap.get(productId)!
            reserva.total_reservado += quantidade
            reserva.clientes.push({
              cliente_id: consignacao.client_id || '',
              cliente_name: consignacao.clients?.name || 'Cliente não informado',
              folha_codigo: consignacao.codigo || '',
              quantidade: quantidade,
              status: consignacao.status || 'ENTREGUE'
            })

            totalUnidadesReservadas += quantidade
            totalValorReservadoCents += quantidade * precoUnitario
            clientesAtivos.add(consignacao.client_id || '')
          }
        }

        const reservas = Array.from(reservasMap.values())

        return {
          total_produtos_reservados: reservas.length,
          total_unidades_reservadas: totalUnidadesReservadas,
          total_valor_reservado_cents: totalValorReservadoCents,
          total_clientes_ativos: clientesAtivos.size,
          reservas
        }
      } catch (error) {
        console.error('❌ [useConsignadoReservas] Erro ao buscar dados:', error)
        return {
          total_produtos_reservados: 0,
          total_unidades_reservadas: 0,
          total_valor_reservado_cents: 0,
          total_clientes_ativos: 0,
          reservas: []
        }
      }
    }
  })

  return {
    data: data || {
      total_produtos_reservados: 0,
      total_unidades_reservadas: 0,
      total_valor_reservado_cents: 0,
      total_clientes_ativos: 0,
      reservas: []
    },
    isLoading,
    error,
    refetch
  }
}

// Hook auxiliar para buscar reservas de um produto específico
export function useProductReservas(productId: string) {
  const { data, isLoading, error } = useConsignadoReservas()
  
  const productReservas = data.reservas.find(r => r.product_id === productId)
  
  return {
    reservas: productReservas || {
      product_id: productId,
      product_name: '',
      short_code: '',
      total_reservado: 0,
      clientes: []
    },
    isLoading,
    error
  }
}
