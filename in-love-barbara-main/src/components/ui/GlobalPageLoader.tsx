import { useEffect, useState, useRef } from "react"
import { useLocation } from "react-router-dom"
import { useIsFetching } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

export function GlobalPageLoader() {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const navigationStartTimeRef = useRef<number>(Date.now())
  const isFetching = useIsFetching() // ✅ Verificar se há queries em execução
  
  useEffect(() => {
    // Limpar timeouts anteriores
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }

    // Marcar início da navegação
    navigationStartTimeRef.current = Date.now()

    // Esconder loading imediatamente ao mudar de rota
    setIsLoading(false)

    // ✅ OTIMIZAÇÃO: Mostrar loading mais cedo se detectar queries em execução
    // Primeira verificação rápida (100ms) - para queries que já estão rodando
    const quickCheck = setTimeout(() => {
      if (isFetching > 0) {
        setIsLoading(true)
      }
    }, 100)

    // Segunda verificação (300ms) - para queries que podem iniciar depois
    showTimeoutRef.current = setTimeout(() => {
      // Mostrar se houver queries OU se já passou muito tempo (navegação lenta)
      const elapsed = Date.now() - navigationStartTimeRef.current
      if (isFetching > 0 || elapsed > 500) {
        setIsLoading(true)
      }
    }, 300)

    // Esconder loading quando não houver mais queries
    const checkAndHide = () => {
      const elapsed = Date.now() - navigationStartTimeRef.current
      // Esconder se não houver queries E já passou tempo suficiente (página carregou)
      if (isFetching === 0 && elapsed > 500) {
        setIsLoading(false)
      }
    }
    
    // Verificar periodicamente se as queries terminaram
    const intervalId = setInterval(checkAndHide, 100)
    
    // Timeout de segurança: esconder após 10s mesmo se ainda estiver carregando
    hideTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
    }, 10000)

    return () => {
      clearTimeout(quickCheck)
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      clearInterval(intervalId)
    }
  }, [location.pathname, isFetching])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Spinner animado */}
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          </div>
          
          {/* Texto de loading */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Carregando...
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aguarde enquanto carregamos os dados
            </p>
          </div>
          
          {/* Barra de progresso animada */}
          <div className="w-full max-w-xs">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

