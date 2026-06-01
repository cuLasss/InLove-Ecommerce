import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback } from 'react'
import { universalDataAdapter } from '@/lib/universal-data-adapter'

interface PreloadTask {
  name: string
  queryKey: string[]
  queryFn: () => Promise<any>
}

export function usePreloadData() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const preloadAll = useCallback(async () => {
    setIsLoading(true)
    setProgress(0)
    
    // Lista de todas as queries que precisam ser pré-carregadas
    const tasks: PreloadTask[] = [
      {
        name: 'Produtos',
        queryKey: ['products'],
        queryFn: async () => {
          const response = await universalDataAdapter.getProducts()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Clientes',
        queryKey: ['clients'],
        queryFn: async () => {
          const response = await universalDataAdapter.getClients()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Vendas de Varejo',
        queryKey: ['sales'],
        queryFn: async () => {
          const response = await universalDataAdapter.getSales()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Categorias',
        queryKey: ['categories'],
        queryFn: async () => {
          const response = await universalDataAdapter.getCategories()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Marcas',
        queryKey: ['brands'],
        queryFn: async () => {
          const response = await universalDataAdapter.getBrands()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Fornecedores',
        queryKey: ['suppliers'],
        queryFn: async () => {
          const response = await universalDataAdapter.getSuppliers()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Consignações',
        queryKey: ['consignacoes'],
        queryFn: async () => {
          const response = await universalDataAdapter.getConsignacoes()
          if (response.error) throw response.error
          return response.data || []
        }
      },
      {
        name: 'Colaboradores',
        queryKey: ['collaborators'],
        queryFn: async () => {
          const response = await universalDataAdapter.getCollaborators()
          if (response.error) throw response.error
          return response.data || []
        }
      },
    ]

    const totalTasks = tasks.length
    let completedTasks = 0

    // Pré-carregar todas as queries em paralelo, mas com progresso
    const preloadPromises = tasks.map(async (task) => {
      try {
        setCurrentTask(`Carregando ${task.name}...`)
        
        // Verificar se já existe no cache
        const cachedData = queryClient.getQueryData(task.queryKey)
        if (cachedData) {
          completedTasks++
          setProgress((completedTasks / totalTasks) * 100)
          return { task: task.name, success: true, cached: true }
        }

        // Pré-carregar a query
        await queryClient.prefetchQuery({
          queryKey: task.queryKey,
          queryFn: task.queryFn,
          staleTime: 10 * 60 * 1000, // 10 minutos
        })

        completedTasks++
        setProgress((completedTasks / totalTasks) * 100)
        return { task: task.name, success: true, cached: false }
      } catch (error) {
        console.warn(`⚠️ Erro ao pré-carregar ${task.name}:`, error)
        completedTasks++
        setProgress((completedTasks / totalTasks) * 100)
        return { task: task.name, success: false, error }
      }
    })

    // Aguardar todas as queries serem pré-carregadas
    await Promise.allSettled(preloadPromises)

    // Pré-carregar queries mais pesadas em segundo plano (sem bloquear)
    setCurrentTask('Otimizando cache...')
    
    // Pré-carregar vendas de atacado (mais pesado, fazer em background)
    queryClient.prefetchQuery({
      queryKey: ['sales', 'ATACADO'],
      queryFn: async () => {
        try {
          const response = await universalDataAdapter.getSalesByChannel('ATACADO')
          if (response.error) throw response.error
          return response.data || []
        } catch (error) {
          console.warn('⚠️ Erro ao pré-carregar vendas de atacado:', error)
          return []
        }
      },
      staleTime: 10 * 60 * 1000,
    }).catch(() => {
      // Ignorar erros silenciosamente
    })

    setCurrentTask('Finalizando...')
    setProgress(100)
    
    // Pequeno delay para garantir que tudo foi processado
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setIsLoading(false)
  }, [queryClient])

  return {
    preloadAll,
    progress,
    currentTask,
    isLoading
  }
}

