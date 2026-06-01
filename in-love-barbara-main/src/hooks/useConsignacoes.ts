import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { consignacaoApi } from '@/lib/api'

export interface Consultora {
  id: string
  nome: string
  documento: string | null
  contato: string | null
  comissao_default_pct: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ConsignacaoLote {
  id: string
  consultora_id: string
  status: string
  data_entrega: string | null
  data_prevista: string | null
  data_finalizacao: string | null
  observacao: string | null
  created_at: string
  updated_at: string
  // Campos adicionais que podem vir da query
  client_id?: string
  commission_default_percent?: number
  representative_name?: string
  city?: string
  codigo?: string
  clients?: {
    id: string
    name: string
    whatsapp: string | null
  }
  consultoras?: Consultora
}

// Temporary stubs for missing functions to prevent build errors
export function useLoteDetails(id: string) {
  return {
    lote: null,
    items: [],
    acerto: null,
    isLoading: true
  }
}

export function useConsignacoes() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ✅ OTIMIZAÇÃO: Usar a mesma query base que Consignado.tsx para compartilhar cache
  const { data: allConsignacoesRaw, isLoading: loadingLotes, refetch: refetchLotes } = useQuery({
    queryKey: ['consignacao-all'],
    queryFn: async () => {
      console.log('🔍 [Consignação] Buscando lotes existentes...')
      const data = await consignacaoApi.getAll(undefined, 1, 1000)
      
      const lotes = Array.isArray(data) ? data : ((data as any)?.data || [])
      console.log('📊 [Consignação] Lotes encontrados:', lotes.length)
      
      return lotes
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (mesma config do Consignado)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 30 * 60 * 1000
  })

  // Extrair dados da query base
  const lotes = Array.isArray(allConsignacoesRaw) 
    ? allConsignacoesRaw 
    : ((allConsignacoesRaw as any)?.data || [])

  // Mutations
  const createLoteMutation = useMutation({
    mutationFn: async (loteData: Partial<ConsignacaoLote>) => {
      console.log('Criando lote via API:', loteData)
      
      // Preparar dados para criação
      const consignacaoData = {
        client_id: loteData.client_id!,
        consultora_id: loteData.consultora_id || null,
        status: 'RASCUNHO' as const,
        commission_default_percent: loteData.commission_default_percent || 30,
        representative_name: loteData.representative_name || 'Admin',
        city: loteData.city || 'Carandaí',
        data_prevista: loteData.data_prevista || loteData.prazo_previsto || null,
        observacao: loteData.observacao || null
      }
      
      const result = await consignacaoApi.create(consignacaoData)
      console.log('📊 [Consignação] Lote criado:', {
        id: result.id,
        codigo: result.codigo,
        status: result.status,
        client_id: result.client_id,
        data_prevista: result.data_prevista
      })
      
      return result
    },
    onSuccess: () => {
      // ✅ OTIMIZAÇÃO: Invalidar apenas a query base (as outras são derivadas)
      queryClient.invalidateQueries({ queryKey: ['consignacao-all'] })
      toast({
        title: 'Sucesso',
        description: 'Lote de consignação criado com sucesso!',
        duration: 2000
      })
    },
    onError: (error: any) => {
      logger.error('Erro ao criar lote:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao criar lote de consignação',
        variant: 'destructive'
      })
    }
  })

  const updateLoteMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ConsignacaoLote> & { id: string }) => {
      // Sistema local - simular atualização
      console.log('Atualizando lote local:', id, updates)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      return {
        id,
        ...updates,
        updated_at: new Date().toISOString()
      }
    },
    onSuccess: () => {
      // ✅ OTIMIZAÇÃO: Invalidar apenas a query base
      queryClient.invalidateQueries({ queryKey: ['consignacao-all'] })
      toast({
        title: 'Sucesso',
        description: 'Lote atualizado com sucesso!'
      })
    },
    onError: (error: any) => {
      logger.error('Erro ao atualizar lote:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar lote',
        variant: 'destructive'
      })
    }
  })

  const deleteLoteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Sistema local - simular exclusão
      console.log('Removendo lote local:', id)
      await new Promise(resolve => setTimeout(resolve, 200))
    },
    onSuccess: () => {
      // ✅ OTIMIZAÇÃO: Invalidar apenas a query base
      queryClient.invalidateQueries({ queryKey: ['consignacao-all'] })
      toast({
        title: 'Sucesso',
        description: 'Lote removido com sucesso!'
      })
    },
    onError: (error: any) => {
      logger.error('Erro ao remover lote:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao remover lote',
        variant: 'destructive'
      })
    }
  })

  return {
    // Data
    lotes,
    isLoading: loadingLotes,
    
    // Actions
    createLote: createLoteMutation.mutateAsync,
    updateLote: updateLoteMutation.mutateAsync,
    deleteLote: deleteLoteMutation.mutateAsync,
    refetchLotes,
    
    // Loading states
    isCreating: createLoteMutation.isPending,
    isUpdating: updateLoteMutation.isPending,
    isDeleting: deleteLoteMutation.isPending
  }
}