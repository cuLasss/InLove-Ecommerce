import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { performanceMonitor } from '@/utils/performance'

/**
 * Componente que limpa automaticamente cache e estado entre navegações
 * OTIMIZADO: Limpeza mais inteligente e menos agressiva para melhor performance
 */
export function RouteCleaner() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const previousPath = useRef<string | null>(null)
  const cleanupTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const currentPath = location.pathname
    
    // Se mudou de rota, agenda limpeza suave (não bloqueante)
    if (previousPath.current && previousPath.current !== currentPath) {
      // Cancelar limpeza anterior se houver
      if (cleanupTimer.current) {
        clearTimeout(cleanupTimer.current)
      }
      
      // Agendar limpeza suave após um delay (não bloqueia navegação)
      cleanupTimer.current = setTimeout(() => {
        cleanupQueries(previousPath.current!, currentPath)
      }, 1000) // Delay de 1 segundo para não bloquear navegação
    }
    
    previousPath.current = currentPath
    
    return () => {
      if (cleanupTimer.current) {
        clearTimeout(cleanupTimer.current)
      }
    }
  }, [location.pathname, queryClient])

  const cleanupQueries = (from: string, to: string) => {
    const startTime = performance.now()
    const navigationCount = parseInt(sessionStorage.getItem('navigationCount') || '0')
    const newCount = navigationCount + 1
    
    sessionStorage.setItem('navigationCount', newCount.toString())
    
    try {
      // ✅ OTIMIZAÇÃO: Limpeza muito menos agressiva
      // Limpa cache completamente apenas a cada 100 navegações (reduzido de 50)
      if (newCount > 0 && newCount % 100 === 0) {
        const beforeSize = queryClient.getQueryCache().getAll().length
        queryClient.clear()
        const duration = performance.now() - startTime
        performanceMonitor.log('navigation', 'Cache limpo completamente', duration, {
          from,
          to,
          queriesRemoved: beforeSize,
          navigationCount: newCount
        });
      } else {
        // Limpeza suave - apenas remove queries muito antigas e inativas
        // Aumentado de 5 minutos para 10 minutos para manter mais cache
        const oldQueries = queryClient.getQueryCache().getAll().filter((query) => {
          const lastUpdate = query.state.dataUpdatedAt
          const lastAccess = query.state.dataUpdatedAt
          const age = Date.now() - Math.max(lastUpdate, lastAccess)
          
          // Remove apenas queries não usadas há mais de 10 minutos
          // E que não estão sendo usadas atualmente
          return age > 10 * 60 * 1000 && !query.state.isFetching
        })
        
        if (oldQueries.length > 0 && newCount % 20 === 0) {
      queryClient.removeQueries({
        predicate: (query) => {
              const lastUpdate = query.state.dataUpdatedAt
              const age = Date.now() - lastUpdate
              return age > 10 * 60 * 1000 && !query.state.isFetching
        }
      })
          
          const duration = performance.now() - startTime
          performanceMonitor.log('navigation', 'Queries antigas removidas', duration, {
            from,
            to,
            queriesRemoved: oldQueries.length,
            navigationCount: newCount
          });
        }
      }
    } catch (error) {
      // Ignorar erros de limpeza para não afetar navegação
      console.error('[RouteCleaner] Erro ao limpar cache:', error)
    }
  }

  return null // Este componente não renderiza nada
}
