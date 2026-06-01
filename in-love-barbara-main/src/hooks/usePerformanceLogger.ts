import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook para logar performance de navegação e queries
 */
export function usePerformanceLogger(pageName: string) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const mountTime = useRef<number>(Date.now())
  const previousPath = useRef<string | null>(null)

  useEffect(() => {
    // Log apenas em desenvolvimento
    if (!import.meta.env.DEV) return
    
    try {
      const currentPath = location.pathname
      const now = Date.now()

      // Log quando a página é montada
      if (previousPath.current !== currentPath) {
        mountTime.current = now
        console.log(`🚀 [PERFORMANCE] ${pageName} - Página iniciou carregamento:`, {
          path: currentPath,
          timestamp: new Date().toISOString()
        })

        // Log queries ativas (com segurança)
        try {
          const activeQueries = queryClient.getQueryCache().getAll()
          const activeQueryKeys = activeQueries.map(q => q.queryKey[0])
          console.log(`📊 [PERFORMANCE] ${pageName} - Queries em cache:`, {
            count: activeQueries.length,
            keys: activeQueryKeys
          })
        } catch (e) {
          // Ignorar erros ao acessar queries
        }
      }

      previousPath.current = currentPath
    } catch (e) {
      // Ignorar erros de log
    }
  }, [location.pathname, pageName, queryClient])

  // Log quando a página termina de renderizar
  useEffect(() => {
    // Log apenas em desenvolvimento
    if (!import.meta.env.DEV) return
    
    const renderTime = Date.now() - mountTime.current
    
    // Log após um pequeno delay para capturar renderização completa
    const timer = setTimeout(() => {
      try {
        console.log(`✅ [PERFORMANCE] ${pageName} - Página renderizada:`, {
          renderTime: `${renderTime}ms`,
          path: location.pathname
        })

        // Verificar queries que foram executadas (com segurança)
        try {
          const cache = queryClient.getQueryCache()
          const allQueries = cache.getAll()
          
          // Log queries que foram refeitas (não deveriam se cache está válido)
          const refetchedQueries = allQueries.filter(q => {
            try {
              const timeSinceUpdate = Date.now() - q.state.dataUpdatedAt
              return timeSinceUpdate < 1000 && q.state.fetchStatus === 'fetching'
            } catch {
              return false
            }
          })

          if (refetchedQueries.length > 0) {
            console.warn(`⚠️ [PERFORMANCE] ${pageName} - Queries sendo refeitas (possível problema):`, {
              count: refetchedQueries.length,
              keys: refetchedQueries.map(q => q.queryKey[0])
            })
          } else {
            console.log(`✅ [PERFORMANCE] ${pageName} - Nenhuma query refeita (usando cache)`)
          }
        } catch (e) {
          // Ignorar erros ao verificar queries
        }
      } catch (e) {
        // Ignorar erros de log
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [location.pathname, pageName, queryClient])

  return {
    mountTime: mountTime.current
  }
}

