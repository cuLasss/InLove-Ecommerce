import { useState, useCallback } from 'react'

// Tipos para as rotas
type RouteImportFn = () => Promise<any>

interface RouteTask {
  name: string
  importFn: RouteImportFn
}

// Lista de todas as rotas que precisam ser pré-carregadas
// Esta lista deve corresponder às rotas definidas em App.tsx
const routeTasks: RouteTask[] = [
  { name: 'Clientes', importFn: () => import('../pages/Clientes') },
  { name: 'Produtos', importFn: () => import('../pages/Produtos') },
  { name: 'Varejo', importFn: () => import('../pages/Varejo') },
  { name: 'Varejo Novo', importFn: () => import('../pages/VarejoNovo') },
  { name: 'Varejo Simplificado', importFn: () => import('../pages/VarejoSimplificado') },
  { name: 'Consignado', importFn: () => import('../pages/Consignado') },
  { name: 'Consignação Novo', importFn: () => import('../pages/ConsignacaoNovo') },
  { name: 'Consignação Lotes', importFn: () => import('../pages/consignado/lotes/page') },
  { name: 'Consignação Nova', importFn: () => import('../pages/consignado/nova/page') },
  { name: 'Consignação Lote Detail', importFn: () => import('../pages/consignado/lotes/[id]/page') },
  { name: 'Consignação Lotes Entregues', importFn: () => import('../pages/consignado/lotes/entregues/page') },
  { name: 'Consignação Acerto', importFn: () => import('../pages/consignado/acerto/[id]/page') },
  { name: 'Folha Consignação', importFn: () => import('../pages/consignado/FolhaConsignacaoPage') },
  { name: 'Atacado', importFn: () => import('../pages/Atacado') },
  { name: 'Notas Fiscais', importFn: () => import('../pages/NotasFiscais') },
  { name: 'Aniversariantes', importFn: () => import('../pages/Aniversariantes') },
  { name: 'Colaboradoras', importFn: () => import('../pages/Colaboradoras') },
  { name: 'Financeiro', importFn: () => import('../pages/Financeiro') },
  { name: 'Not Found', importFn: () => import('../pages/NotFound') },
]

export function usePreloadRoutes() {
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadedRoutes, setLoadedRoutes] = useState<Set<string>>(new Set())

  const preloadAll = useCallback(async () => {
    setIsLoading(true)
    setProgress(0)
    setCurrentTask('Iniciando pré-carregamento de rotas...')
    
    const totalRoutes = routeTasks.length
    let completedRoutes = 0
    const loaded = new Set<string>()

    // Pré-carregar todas as rotas em paralelo, mas com progresso
    const preloadPromises = routeTasks.map(async (route) => {
      try {
        setCurrentTask(`Carregando rota: ${route.name}...`)
        
        // Tentar pré-carregar o módulo
        await route.importFn()
        
        loaded.add(route.name)
        completedRoutes++
        setProgress((completedRoutes / totalRoutes) * 100)
        
        return { route: route.name, success: true }
      } catch (error) {
        // Em caso de erro, continuar com as outras rotas
        completedRoutes++
        setProgress((completedRoutes / totalRoutes) * 100)
        return { route: route.name, success: false, error }
      }
    })

    // Aguardar todas as rotas serem pré-carregadas
    await Promise.allSettled(preloadPromises)
    
    setLoadedRoutes(loaded)
    setCurrentTask('Rotas pré-carregadas!')
    setProgress(100)
    
    // Pequeno delay para garantir que tudo foi processado
    await new Promise(resolve => setTimeout(resolve, 200))
    
    setIsLoading(false)
  }, [])

  return {
    preloadAll,
    progress,
    currentTask,
    isLoading,
    loadedRoutes
  }
}

