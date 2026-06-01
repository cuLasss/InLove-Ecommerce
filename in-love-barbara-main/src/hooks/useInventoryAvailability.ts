import { useQuery, useQueryClient } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
export interface ProductAvailability {
  product_id: string
  available: number
  total_stock: number
  reserved_consigned: number
}

/**
 * Get stock availability for multiple products
 * Reuses the same logic as retail system
 */
export function useProductsAvailability(productIds: string[]) {
  return useQuery({
    queryKey: ['products-availability', productIds.sort()],
    queryFn: async (): Promise<ProductAvailability[]> => {
      if (productIds.length === 0) return []

      // Sistema local - retornar dados vazios
      return productIds.map(id => ({
        product_id: id,
        available: 0,
        total_stock: 0,
        reserved_consigned: 0
      }))
    },
    staleTime: 1000 * 30
  })
}
