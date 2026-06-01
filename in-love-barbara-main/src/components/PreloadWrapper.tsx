import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePreloadData } from '@/hooks/usePreloadData'
import { usePreloadRoutes } from '@/hooks/usePreloadRoutes'
import { InitialLoadingScreen } from '@/components/ui/InitialLoadingScreen'

interface PreloadWrapperProps {
  children: React.ReactNode
}

export function PreloadWrapper({ children }: PreloadWrapperProps) {
  const queryClient = useQueryClient()
  const { preloadAll: preloadData, progress: dataProgress, currentTask: dataTask, isLoading: dataLoading } = usePreloadData()
  const { preloadAll: preloadRoutes, progress: routesProgress, currentTask: routesTask, isLoading: routesLoading } = usePreloadRoutes()
  
  const [hasPreloaded, setHasPreloaded] = useState(false)
  const [shouldShowLoading, setShouldShowLoading] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [overallTask, setOverallTask] = useState('')

  useEffect(() => {
    // Verificar se os dados principais já estão em cache
    const productsCached = queryClient.getQueryData(['products'])
    const clientsCached = queryClient.getQueryData(['clients'])
    const salesCached = queryClient.getQueryData(['sales'])
    
    const hasEssentialData = productsCached && clientsCached && salesCached
    
    // Verificar se já pré-carregou nesta sessão (usando sessionStorage)
    // Isso evita pré-carregar múltiplas vezes na mesma sessão
    const preloadedThisSession = sessionStorage.getItem('app_preloaded_session')
    
    // Em produção, sempre pré-carregar na primeira carga para garantir que as rotas estejam em cache
    // Isso simula o comportamento do Vite em desenvolvimento
    if (!preloadedThisSession || !hasEssentialData) {
      // Mostrar loading se não tiver dados essenciais ou se for a primeira carga
        setShouldShowLoading(true)
      
      // Pré-carregar rotas e dados em paralelo
      Promise.all([
        preloadRoutes().then(() => {
          sessionStorage.setItem('routes_preloaded_session', 'true')
        }),
        preloadData().then(() => {
          sessionStorage.setItem('app_preloaded_session', 'true')
        })
      ]).then(() => {
        setHasPreloaded(true)
        setShouldShowLoading(false)
      }).catch(() => {
        // Mesmo com erros, permitir que o app continue
        setHasPreloaded(true)
        setShouldShowLoading(false)
      })
    } else {
      // Se já tem tudo em cache e já pré-carregou nesta sessão, não mostrar loading
      setHasPreloaded(true)
      setShouldShowLoading(false)
      
      // Pré-carregar em background sem bloquear (para atualizar cache e garantir que rotas estejam carregadas)
      // Isso garante que mesmo se o cache do navegador foi limpo, as rotas serão pré-carregadas
      Promise.all([
        preloadRoutes().catch(() => {}),
        preloadData().catch(() => {})
      ])
    }
  }, [preloadData, preloadRoutes, queryClient])

  // Atualizar progresso geral combinando rotas e dados
  useEffect(() => {
    // Rotas representam 50% do progresso, dados representam 50%
    const combinedProgress = (routesProgress * 0.5) + (dataProgress * 0.5)
    setOverallProgress(combinedProgress)
    
    // Mostrar a tarefa atual (priorizar rotas se estiverem carregando)
    if (routesLoading && routesTask) {
      setOverallTask(routesTask)
    } else if (dataLoading && dataTask) {
      setOverallTask(dataTask)
    } else if (routesTask) {
      setOverallTask(routesTask)
    } else if (dataTask) {
      setOverallTask(dataTask)
    } else {
      setOverallTask('Preparando sistema...')
    }
  }, [routesProgress, dataProgress, routesTask, dataTask, routesLoading, dataLoading])

  // Mostrar tela de loading apenas se necessário
  if (shouldShowLoading && (routesLoading || dataLoading)) {
    return <InitialLoadingScreen progress={overallProgress} currentTask={overallTask} />
  }

  return <>{children}</>
}

