import { supabase } from '@/integrations/supabase/client'

type SupabaseLookup = {
  select: (columns: string) => SupabaseLookup
  eq: (column: string, value: string) => SupabaseLookup
  single: () => Promise<{
    data: { name?: string; product_name?: string } | null
    error: unknown
  }>
}

const supabaseClient = supabase as unknown as { from: (table: string) => SupabaseLookup }

/**
 * Obtém o nome formatado de um produto, incluindo "(excluído)" se o produto foi deletado
 */
export async function getProductDisplayName(productId: string | null | undefined, productName: string | null | undefined): Promise<string> {
  if (!productId) {
    return productName || 'Produto não identificado'
  }

  // Se já temos o nome do produto, retornar
  if (productName) {
    return productName
  }

  // Tentar buscar o produto
  try {
    const { data: product, error } = await supabaseClient
      .from('products')
      .select('name')
      .eq('id', productId)
      .single()

    if (error || !product) {
      // Produto não encontrado, pode ter sido excluído
      // Tentar buscar na tabela de produtos excluídos se existir
      try {
        const { data: deletedProduct } = await supabaseClient
          .from('deleted_products')
          .select('product_name')
          .eq('product_id', productId)
          .single()

        if (deletedProduct?.product_name) {
          return `${deletedProduct.product_name} (excluído)`
        }
      } catch (error) {
        // Tabela deleted_products não existe, ignorar
      }

      return 'Produto não encontrado (excluído)'
    }

    return product.name
  } catch (error) {
    return 'Produto não encontrado (excluído)'
  }
}

/**
 * Versão síncrona que retorna o nome formatado baseado apenas no que foi passado
 * Usa quando já temos o produto carregado
 */
export function formatProductName(product: { name?: string | null } | null | undefined, productId?: string | null): string {
  if (product?.name) {
    return product.name
  }

  if (productId) {
    return 'Produto não encontrado (excluído)'
  }

  return 'Produto não identificado'
}

