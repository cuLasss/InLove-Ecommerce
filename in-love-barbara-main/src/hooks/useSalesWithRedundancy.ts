import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export interface SaleWithRedundancy {
  id: string
  client_id: string | null
  channel: string
  status: string
  created_at: string
  closed_at: string | null
  discount_total_cents: number
  payment_summary?: any
  clients?: {
    name: string
  }
  sale_items?: Array<{
    id: string
    quantity: number
    unit_price_cents?: number
    discount_percent?: number
    product_id: string
    products: {
      id: string
      name: string
      short_code?: string
      price_cents?: number
      brand?: string
      category?: string
      size?: string
      deleted?: boolean  // Flag para produtos excluídos
    }
  }>
  payment_method?: string
}

export function useSalesWithRedundancy(channel: string) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Query para buscar vendas
  const salesQuery = useQuery({
    queryKey: ['sales-with-redundancy', channel],
    queryFn: () => salesApi.getByChannel(channel),
    staleTime: 0,
    gcTime: 0
  })

  // Mutation para exclusão física (completa)
  const deletePhysicalMutation = useMutation({
    mutationFn: salesApi.delete,
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Venda excluída permanentemente",
      })
      queryClient.invalidateQueries({ queryKey: ['sales-with-redundancy', channel] })
    },
    onError: (error: any) => {
      console.error('Erro ao excluir venda fisicamente:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir venda. Tente novamente.",
        variant: "destructive"
      })
    }
  })

  // Mutation para exclusão segura (apenas marcação)
  const deleteSafeMutation = useMutation({
    mutationFn: salesApi.safeDelete,
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Venda cancelada com segurança",
      })
      queryClient.invalidateQueries({ queryKey: ['sales-with-redundancy', channel] })
    },
    onError: (error: any) => {
      console.error('Erro ao excluir venda com segurança:', error)
      toast({
        title: "Erro",
        description: "Erro ao cancelar venda. Tente novamente.",
        variant: "destructive"
      })
    }
  })

  // Função para calcular total com redundância de dados
  const calculateSaleTotal = (sale: SaleWithRedundancy) => {
    if (!sale.sale_items || sale.sale_items.length === 0) return 0

    // Se tiver payment_summary, usar o total de lá
    if (sale.payment_summary && typeof sale.payment_summary === 'object' && sale.payment_summary.total_cents) {
      return sale.payment_summary.total_cents || 0
    }
    
    // Caso contrário, calcular baseado nos itens (usando dados redundantes)
    return sale.sale_items.reduce((acc: number, item: any) => {
      const itemTotal = (item.unit_price_cents || 0) * (item.quantity || 0)
      const discount = itemTotal * ((item.discount_percent || 0) / 100)
      return acc + (itemTotal - discount)
    }, 0)
  }

  // Função para verificar se uma venda tem produtos excluídos
  const hasDeletedProducts = (sale: SaleWithRedundancy) => {
    return sale.sale_items?.some(item => item.products?.deleted) || false
  }

  // Função para contar produtos excluídos
  const countDeletedProducts = (sale: SaleWithRedundancy) => {
    return sale.sale_items?.filter(item => item.products?.deleted).length || 0
  }

  // Função para excluir venda com confirmação
  const deleteSaleWithConfirmation = async (saleId: string, type: 'physical' | 'safe' = 'physical') => {
    const sale = salesQuery.data?.find((s: any) => s.id === saleId)
    const hasDeleted = sale ? hasDeletedProducts(sale) : false
    
    let confirmMessage = 'Tem certeza que deseja excluir esta venda?'
    
    if (type === 'physical') {
      confirmMessage = hasDeleted 
        ? 'Esta venda contém produtos que foram excluídos. Deseja remover permanentemente do sistema? Esta ação não pode ser desfeita.'
        : 'Tem certeza que deseja excluir permanentemente esta venda? Esta ação não pode ser desfeita.'
    } else {
      confirmMessage = 'Deseja cancelar esta venda? Ela será marcada como cancelada mas mantida no histórico.'
    }

    if (!confirm(confirmMessage)) {
      return
    }

    if (type === 'physical') {
      deletePhysicalMutation.mutate(saleId)
    } else {
      deleteSafeMutation.mutate(saleId)
    }
  }

  return {
    // Data
    sales: salesQuery.data as SaleWithRedundancy[] || [],
    isLoading: salesQuery.isLoading,
    error: salesQuery.error,
    
    // Mutations
    isDeleting: deletePhysicalMutation.isPending || deleteSafeMutation.isPending,
    
    // Helper functions
    calculateSaleTotal,
    hasDeletedProducts,
    countDeletedProducts,
    deleteSaleWithConfirmation,
    
    // Refetch
    refetch: salesQuery.refetch
  }
}