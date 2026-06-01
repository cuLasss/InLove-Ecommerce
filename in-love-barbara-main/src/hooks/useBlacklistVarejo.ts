/**
 * Hook: useBlacklistVarejo
 * 
 * Hook para gerenciar dados da blacklist de clientes do varejo
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blacklistApi, clientsApi } from '@/lib/api'
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

export function useBlacklistVarejo() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Buscar clientes do varejo para adicionar à blacklist
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients-varejo'],
    queryFn: () => clientsApi.getByType('VAREJO'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Buscar entradas da blacklist específicas do varejo
  const { data: blacklistEntries = [], isLoading: isLoadingBlacklist } = useQuery({
    queryKey: ['blacklist-varejo'],
    queryFn: () => blacklistApi.getByType('VAREJO'),
    staleTime: 0, // Sempre considerar dados como stale para forçar refetch
    refetchOnWindowFocus: true, // Refetch quando a janela ganha foco
    refetchOnMount: true, // Sempre refetch ao montar
  })

  // Adicionar cliente à blacklist
  const addToBlacklistMutation = useMutation({
    mutationFn: blacklistApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist-varejo'] })
      toast({
        title: 'Cliente bloqueado',
        description: 'Cliente foi adicionado à blacklist com sucesso.',
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

  // Remover cliente da blacklist
  const removeFromBlacklistMutation = useMutation({
    mutationFn: blacklistApi.remove,
    onSuccess: () => {
      console.log('🎉 [useBlacklistVarejo] Mutation de desbloqueio bem-sucedida!')
      console.log('🔄 [useBlacklistVarejo] Invalidando queries da blacklist...')
      
      // Invalidar todas as queries relacionadas à blacklist de forma mais agressiva
      queryClient.invalidateQueries({ queryKey: ['blacklist-varejo'] })
      queryClient.invalidateQueries({ queryKey: ['clients-varejo'] })
      
      // Limpar cache completamente e forçar refetch
      queryClient.removeQueries({ queryKey: ['blacklist-varejo'] })
      queryClient.refetchQueries({ queryKey: ['blacklist-varejo'] })
      
      // Aguardar um pouco e refetch novamente para garantir
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['blacklist-varejo'] })
      }, 100)
      
      console.log('✅ [useBlacklistVarejo] Queries invalidadas e refetch executado, mostrando toast...')
      toast({
        title: 'Cliente desbloqueado',
        description: 'Cliente foi removido da blacklist com sucesso.',
        duration: 2000,
      })
    },
    onError: (error: any) => {
      console.error('❌ [useBlacklistVarejo] Erro na mutation de desbloqueio:', error)
      toast({
        title: 'Erro ao desbloquear cliente',
        description: error.message || 'Não foi possível desbloquear o cliente.',
        variant: 'destructive',
        duration: 3000,
      })
    },
  })

  // Verificar se cliente está na blacklist do varejo
  const checkClientBlacklist = async (clientId: string): Promise<boolean> => {
    try {
      const result = await blacklistApi.checkClient(clientId, 'VAREJO')
      return result
    } catch (error) {
      console.error('Erro ao verificar blacklist do varejo:', error)
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

  // Função para verificar se um cliente está bloqueado
  const isClientBlocked = (clientId: string): boolean => {
    return blacklistEntries.some(entry => entry.client_id === clientId)
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
  }
}
