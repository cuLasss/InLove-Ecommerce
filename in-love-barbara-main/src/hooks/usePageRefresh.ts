import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Hook para garantir que os dados sejam sempre recarregados ao entrar em uma página
 * Isso garante que os dados estejam sempre atualizados, mesmo com lazy loading
 */
export function usePageRefresh() {
  const location = useLocation()
  const previousLocation = useRef<string | null>(null)
  
  useEffect(() => {
    // Se mudou de página, força refresh dos dados
    if (previousLocation.current && previousLocation.current !== location.pathname) {
      // Disparar evento customizado para que os hooks possam escutar
      window.dispatchEvent(new CustomEvent('pageChanged', {
        detail: {
          from: previousLocation.current,
          to: location.pathname,
          timestamp: Date.now()
        }
      }))
    }
    
    previousLocation.current = location.pathname
  }, [location.pathname])
  
  return {
    currentPath: location.pathname,
    isPageChanged: previousLocation.current !== location.pathname
  }
}

/**
 * Hook para escutar mudanças de página e executar callbacks
 */
export function usePageChangeListener(callback: (event: CustomEvent) => void) {
  useEffect(() => {
    const handlePageChange = (event: CustomEvent) => {
      console.log('📡 [usePageChangeListener] Evento de mudança de página recebido:', event.detail)
      callback(event)
    }
    
    window.addEventListener('pageChanged', handlePageChange as EventListener)
    
    return () => {
      window.removeEventListener('pageChanged', handlePageChange as EventListener)
    }
  }, [callback])
}
