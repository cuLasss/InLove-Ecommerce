import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface DeletedProduct {
  product_id: string
  product_name: string
  deleted_at: string
}

/**
 * Hook para buscar produtos excluídos
 * Retorna um mapa de product_id -> product_name para fácil acesso
 * 
 * NOTA: Este hook tenta buscar de uma tabela opcional 'deleted_products'.
 * Se a tabela não existir (erro 404), o hook retorna array vazio silenciosamente.
 * Isso é esperado e não afeta o funcionamento do sistema (que usa soft delete).
 */
export function useDeletedProducts() {
  // Verificar se já sabemos que a tabela não existe (para evitar tentativas desnecessárias)
  const tableNotExists = typeof window !== 'undefined' 
    ? sessionStorage.getItem('deleted_products_table_not_exists') === 'true'
    : false

  const { data: deletedProducts = [], isLoading } = useQuery({
    queryKey: ['deleted-products'],
    enabled: !tableNotExists, // Não executar se já sabemos que a tabela não existe
    retry: false, // Não tentar novamente se a tabela não existir
    retryOnMount: false, // Não tentar novamente ao montar
    refetchOnWindowFocus: false, // Não refazer query ao focar na janela
    // Suprimir logs de erro do React Query para erros 404 (tabela não existe)
    meta: {
      errorMessage: false, // Não mostrar mensagem de erro
    },
    queryFn: async (): Promise<DeletedProduct[]> => {
      try {
        // Usar 'as any' para contornar erros de tipo se a tabela não existir no schema
        const { data, error } = await (supabase as any)
          .from('deleted_products')
          .select('product_id, product_name, deleted_at')

        if (error) {
          // Verificar se é erro de tabela não encontrada (404)
          const isTableNotFound = 
            error.code === 'PGRST116' || // Tabela não encontrada
            error.message?.includes('relation') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('404') ||
            error.message?.includes('Could not find the table') ||
            error.status === 404 ||
            error.statusCode === 404
          
          // Se a tabela não existir, retornar array vazio silenciosamente
          // Não logar nada - é esperado que a tabela não exista
          // Salvar no sessionStorage para evitar tentativas futuras
          if (isTableNotFound) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('deleted_products_table_not_exists', 'true')
            }
            return []
          }
          
          // Para outros erros (não relacionados à tabela não existir), logar
          // Mas apenas em desenvolvimento
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ [useDeletedProducts] Erro ao buscar produtos excluídos:', error.message)
          }
          return []
        }

        return data || []
      } catch (error: any) {
        // Verificar se é erro de tabela não encontrada
        const isTableNotFound = 
          error?.code === 'PGRST116' ||
          error?.message?.includes('relation') || 
          error?.message?.includes('does not exist') ||
          error?.message?.includes('404') ||
          error?.message?.includes('Could not find the table') ||
          error?.status === 404 ||
          error?.statusCode === 404
        
        // Se a tabela não existir, retornar array vazio silenciosamente
        // Não logar nada - é esperado
        // Salvar no sessionStorage para evitar tentativas futuras
        if (isTableNotFound) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('deleted_products_table_not_exists', 'true')
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [useDeletedProducts] Erro inesperado:', error?.message)
        }
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    // Suprimir erros do React Query quando a query falhar silenciosamente
    throwOnError: false, // Não lançar erro, apenas retornar array vazio
    // Handler de erro para suprimir logs quando a tabela não existe
    onError: (error: any) => {
      // Verificar se é erro de tabela não encontrada
      const isTableNotFound = 
        error?.code === 'PGRST116' ||
        error?.message?.includes('relation') || 
        error?.message?.includes('does not exist') ||
        error?.message?.includes('404') ||
        error?.message?.includes('Could not find the table') ||
        error?.status === 404 ||
        error?.statusCode === 404
      
      // Se for erro de tabela não encontrada, salvar no sessionStorage e suprimir silenciosamente
      if (isTableNotFound) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('deleted_products_table_not_exists', 'true')
        }
        // Não fazer nada - é esperado que a tabela não exista
        return
      }
      
      // Apenas logar outros erros em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [useDeletedProducts] Erro inesperado na query:', error?.message)
      }
    },
  })

  // Criar um mapa para fácil acesso
  const deletedProductsMap = new Map<string, string>()
  deletedProducts.forEach(dp => {
    deletedProductsMap.set(dp.product_id, dp.product_name)
  })

  return {
    deletedProducts,
    deletedProductsMap,
    isLoading,
    getDeletedProductName: (productId: string | null | undefined): string | null => {
      if (!productId) return null
      return deletedProductsMap.get(productId) || null
    }
  }
}

