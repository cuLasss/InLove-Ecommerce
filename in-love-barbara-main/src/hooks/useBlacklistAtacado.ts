/**
 * Hook: useBlacklistAtacado
 * 
 * Hook para gerenciar dados da blacklist de clientes do atacado
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { universalDataAdapter } from '@/lib/universal-data-adapter'
import { useToast } from '@/hooks/use-toast'

export interface BlacklistEntry {
  id: string
  client_id: string
  client_name: string
  client_type: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'
  reason: string
  blocked_at: string
  blocked_until: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface BlacklistFormData {
  client_id: string
  client_name: string
  client_type: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'
  reason: string
  days_blocked: number
}

export function useBlacklistAtacado() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Buscar clientes do atacado para adicionar à blacklist
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients-atacado', 'blacklist-atacado'],
    queryFn: async () => {
      console.log('🔍 [useBlacklistAtacado] Iniciando busca de clientes...')
      const response = await universalDataAdapter.getClients()
      if (response.error) {
        throw new Error(response.error.message)
      }
      
      // Buscar blacklist do atacado para filtrar clientes já bloqueados
      const blacklistResponse = await universalDataAdapter.getBlacklistByType('ATACADO')
      const blockedClientIds = new Set(
        (blacklistResponse.data || [])
          .filter((entry: any) => {
            const now = new Date()
            const blockedUntil = new Date(entry.blocked_until)
            return now <= blockedUntil // Apenas bloqueios ativos
          })
          .map((entry: any) => entry.client_id)
      )
      
      console.log('🔍 [useBlacklistAtacado] Todos os clientes recebidos:', response.data?.map(c => ({ 
        id: c.id, 
        name: c.name, 
        types: c.types 
      })))
      
      console.log('🔍 [useBlacklistAtacado] Clientes bloqueados no ATACADO:', Array.from(blockedClientIds))
      
      // Filtrar apenas clientes do tipo ATACADO que NÃO estão bloqueados
      const atacadoClients = (response.data || []).filter((client: any) => {
        const hasAtacado = client.types && client.types.includes('ATACADO')
        const isBlocked = blockedClientIds.has(client.id)
        
        console.log(`🔍 [useBlacklistAtacado] Cliente ${client.name}:`, {
          types: client.types,
          hasAtacado: hasAtacado,
          isBlocked: isBlocked
        })
        
        return hasAtacado && !isBlocked
      })
      
      console.log('🔍 [useBlacklistAtacado] Clientes ATACADO disponíveis (não bloqueados):', {
        totalClients: response.data?.length || 0,
        atacadoClients: atacadoClients.length,
        atacadoClientsList: atacadoClients.map((c: any) => ({ id: c.id, name: c.name, types: c.types }))
      })
      return atacadoClients
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Buscar entradas da blacklist específicas do atacado
  const { data: blacklistEntries = [], isLoading: isLoadingBlacklist } = useQuery({
    queryKey: ['blacklist-atacado'],
    queryFn: async () => {
      const response = await universalDataAdapter.getBlacklistByType('ATACADO')
      if (response.error) {
        throw new Error(response.error.message)
      }
      // Filtrar apenas entradas do tipo ATACADO para garantir
      const atacadoEntries = (response.data || []).filter((entry: any) => 
        entry.client_type === 'ATACADO'
      )
      return atacadoEntries
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false, // Não refetch quando a janela ganha foco
    refetchOnMount: false, // Não refetch ao montar
  })

  // Adicionar cliente à blacklist
  const addToBlacklistMutation = useMutation({
    mutationFn: async (data: BlacklistFormData) => {
      const response = await universalDataAdapter.addToBlacklist(data)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: () => {
      // Invalidar ambas as queries para atualizar a lista de clientes e blacklist
      queryClient.invalidateQueries({ queryKey: ['blacklist-atacado'] })
      queryClient.invalidateQueries({ queryKey: ['clients-atacado'] })
      toast({
        title: 'Cliente bloqueado',
        description: 'Cliente foi adicionado à blacklist do atacado com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao bloquear cliente',
        description: error.message || 'Não foi possível bloquear o cliente.',
        variant: 'destructive',
      })
    },
  })

  // Remover cliente da blacklist do atacado
  const removeFromBlacklistMutation = useMutation({
    mutationFn: async (id: string) => {
      // Passar 'ATACADO' como tipo para remover apenas bloqueios do atacado
      const response = await universalDataAdapter.removeFromBlacklist(id, 'ATACADO')
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data || null
    },
    onSuccess: () => {
      console.log('🎉 [useBlacklistAtacado] Mutation de desbloqueio bem-sucedida!')
      console.log('🔄 [useBlacklistAtacado] Invalidando queries da blacklist...')
      
      // Invalidar todas as queries relacionadas à blacklist de forma mais agressiva
      queryClient.invalidateQueries({ queryKey: ['blacklist-atacado'] })
      queryClient.invalidateQueries({ queryKey: ['clients-atacado'] })
      
      // Limpar cache completamente e forçar refetch
      queryClient.removeQueries({ queryKey: ['blacklist-atacado'] })
      queryClient.refetchQueries({ queryKey: ['blacklist-atacado'] })
      
      // Aguardar um pouco e refetch novamente para garantir
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['blacklist-atacado'] })
      }, 100)
      
      console.log('✅ [useBlacklistAtacado] Queries invalidadas e refetch executado, mostrando toast...')
      toast({
        title: 'Cliente desbloqueado',
        description: 'Cliente foi removido da blacklist com sucesso.',
        duration: 2000,
      })
    },
    onError: (error: any) => {
      console.error('❌ [useBlacklistAtacado] Erro na mutation de desbloqueio:', error)
      toast({
        title: 'Erro ao desbloquear cliente',
        description: error.message || 'Não foi possível desbloquear o cliente.',
        variant: 'destructive',
        duration: 3000,
      })
    },
  })

  // Verificar se cliente está na blacklist do atacado
  const checkClientBlacklist = async (clientId: string): Promise<boolean> => {
    try {
      const response = await universalDataAdapter.checkClientBlacklist(clientId, 'ATACADO')
      if (response.error) {
        console.error('Erro ao verificar blacklist:', response.error)
        return false // Em caso de erro, permitir compra
      }
      return response.data || false
    } catch (error) {
      console.error('Erro ao verificar blacklist do atacado:', error)
      return false // Em caso de erro, permitir consignação
    }
  }

  // Função para obter status de bloqueio
  const getBlockStatus = (entry: BlacklistEntry) => {
    const now = new Date()
    const blockedUntil = new Date(entry.blocked_until)
    
    if (now > blockedUntil) {
      return { status: 'expired', text: 'Expirado', color: 'bg-yellow-100 text-yellow-700' }
    }
    
    return { status: 'active', text: 'Ativo', color: 'bg-red-100 text-red-700' }
  }

  // Função para filtrar entradas ativas
  const getActiveEntries = () => {
    return blacklistEntries // Todas as entradas são ativas agora
  }

  // Função para filtrar entradas expiradas
  const getExpiredEntries = () => {
    const now = new Date()
    return blacklistEntries.filter(entry => 
      new Date(entry.blocked_until) < now
    )
  }

  // Função para verificar se um cliente está bloqueado no ATACADO (apenas bloqueios ativos)
  const isClientBlocked = (clientId: string): boolean => {
    const now = new Date()
    return blacklistEntries.some(entry => {
      // Verificar se é o cliente correto E se é do tipo ATACADO
      if (entry.client_id !== clientId || entry.client_type !== 'ATACADO') return false
      // Verificar se o bloqueio ainda está ativo (não expirado)
      const blockedUntil = new Date(entry.blocked_until)
      return now <= blockedUntil
    })
  }

  // Calcular estatísticas
  const stats = {
    totalBlocked: blacklistEntries.length, // Todos os clientes na blacklist estão bloqueados
    expiredBlocks: blacklistEntries.filter(entry => {
      const now = new Date()
      const blockedUntil = new Date(entry.blocked_until)
      return now > blockedUntil
    }).length,
    totalEntries: blacklistEntries.length,
  }

  // Função para forçar refresh dos dados
  const refreshData = () => {
    console.log('🔄 [useBlacklistAtacado] Forçando refresh dos dados...')
    queryClient.invalidateQueries({ queryKey: ['clients-atacado'] })
    queryClient.invalidateQueries({ queryKey: ['blacklist-atacado'] })
    queryClient.refetchQueries({ queryKey: ['clients-atacado'] })
    queryClient.refetchQueries({ queryKey: ['blacklist-atacado'] })
  }

  return {
    clients,
    blacklistEntries,
    isLoading: isLoadingClients || isLoadingBlacklist,
    isLoadingClients,
    isLoadingBlacklist,
    addToBlacklist: addToBlacklistMutation.mutateAsync,
    removeFromBlacklist: removeFromBlacklistMutation.mutateAsync,
    checkClientBlacklist,
    isAdding: addToBlacklistMutation.isPending,
    isRemoving: removeFromBlacklistMutation.isPending,
    stats,
    getBlockStatus,
    getActiveEntries,
    getExpiredEntries,
    isClientBlocked,
    refreshData,
  }
}
