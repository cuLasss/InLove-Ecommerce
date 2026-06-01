/**
 * Hook: useDevolucoesPersistencia
 * 
 * Hook específico para gerenciar a persistência de devoluções salvas
 * Resolve o problema de devoluções não persistirem após reload
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface ProdutoDevolvido {
  id: string
  product_id: string
  product_code: string
  product_name: string
  qty_original: number
  qty_devolvida: number
  qty_vendida: number
  preco_unitario_cents: number
  subtotal_cents: number
  commission_percent?: number
  commission_value_cents?: number
  net_value_cents?: number
}

interface DevolucoesPersistenciaData {
  folha_codigo: string
  folha_id: string
  produtos_salvos: ProdutoDevolvido[]
  metadata: {
    created_at: string
    updated_at: string
    version: string
    tipo: string
  }
}

export function useDevolucoesPersistencia(folhaCodigo: string) {
  const { toast } = useToast()
  const [devolucoes, setDevolucoes] = useState<ProdutoDevolvido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Chave para localStorage
  const getStorageKey = useCallback(() => {
    return `folha_${folhaCodigo}_produtos_salvos`
  }, [folhaCodigo])

  // Carregar devoluções salvas do localStorage
  const carregarDevolucoesSalvas = useCallback(async () => {
    if (!folhaCodigo) return

    setIsLoading(true)
    try {
      const storageKey = getStorageKey()
      const savedData = localStorage.getItem(storageKey)
      
      if (savedData) {
        const parsedData: DevolucoesPersistenciaData = JSON.parse(savedData)
        const cacheAge = Date.now() - new Date(parsedData.metadata?.updated_at || 0).getTime()
        const maxCacheAge = 24 * 60 * 60 * 1000 // 24 horas
        
        if (cacheAge < maxCacheAge && parsedData.produtos_salvos?.length > 0) {
          setDevolucoes(parsedData.produtos_salvos)
          console.log('📦 [useDevolucoesPersistencia] Devoluções carregadas:', {
            folha_codigo: folhaCodigo,
            folha_id: parsedData.folha_id,
            itens: parsedData.produtos_salvos.length,
            version: parsedData.metadata?.version
          })
        } else if (cacheAge >= maxCacheAge) {
          // Limpar dados expirados
          localStorage.removeItem(storageKey)
          console.log('🧹 [useDevolucoesPersistencia] Dados expirados removidos:', folhaCodigo)
          setDevolucoes([])
        }
      } else {
        console.log('📦 [useDevolucoesPersistencia] Nenhuma devolução salva encontrada para:', folhaCodigo)
        setDevolucoes([])
      }
    } catch (error) {
      console.error('❌ [useDevolucoesPersistencia] Erro ao carregar devoluções:', error)
      setDevolucoes([])
    } finally {
      setIsLoading(false)
    }
  }, [folhaCodigo, getStorageKey])

  // Salvar devoluções no localStorage
  const salvarDevolucoes = useCallback(async (novasDevolucoes: ProdutoDevolvido[]) => {
    if (!folhaCodigo) return

    setIsSaving(true)
    try {
      // Buscar folha para obter ID
      const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]')
      const folha = consignacoes.find((c: any) => c.codigo === folhaCodigo)
      
      if (!folha) {
        throw new Error('Folha não encontrada')
      }

      const storageKey = getStorageKey()
      const devolucoesData: DevolucoesPersistenciaData = {
        folha_codigo: folhaCodigo,
        folha_id: folha.id,
        produtos_salvos: novasDevolucoes,
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: '4.0',
          tipo: 'produtos_salvos_persistentes'
        }
      }
      
      localStorage.setItem(storageKey, JSON.stringify(devolucoesData))
      
      console.log('💾 [useDevolucoesPersistencia] Devoluções salvas:', {
        folha_codigo: folhaCodigo,
        folha_id: folha.id,
        total_produtos_salvos: novasDevolucoes.length,
        comDevolucao: novasDevolucoes.filter(d => d.qty_devolvida > 0).length,
        itens: novasDevolucoes.map(d => ({
          produto: d.product_name,
          devolvida: d.qty_devolvida,
          vendida: d.qty_vendida
        }))
      })

      // Atualizar estado local
      setDevolucoes(novasDevolucoes)
      
      toast({
        title: '✅ Devoluções salvas',
        description: `${novasDevolucoes.length} produtos salvos com sucesso`,
      })

    } catch (error) {
      console.error('❌ [useDevolucoesPersistencia] Erro ao salvar devoluções:', error)
      toast({
        title: '❌ Erro ao salvar',
        description: 'Erro ao salvar devoluções',
        variant: 'destructive'
      })
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [folhaCodigo, getStorageKey, toast])

  // Adicionar/atualizar devolução
  const adicionarDevolucao = useCallback((produtoDevolvido: ProdutoDevolvido) => {
    setDevolucoes(prev => {
      const itemExistente = prev.find(item => item.product_id === produtoDevolvido.product_id)
      
      if (itemExistente) {
        // Atualizar item existente
        return prev.map(item => 
          item.product_id === produtoDevolvido.product_id 
            ? { ...produtoDevolvido }
            : item
        )
      } else {
        // Adicionar novo item
        return [...prev, produtoDevolvido]
      }
    })
  }, [])

  // Remover devolução
  const removerDevolucao = useCallback((productId: string) => {
    setDevolucoes(prev => prev.filter(item => item.product_id !== productId))
  }, [])

  // Limpar todas as devoluções
  const limparDevolucoes = useCallback(() => {
    setDevolucoes([])
    if (folhaCodigo) {
      const storageKey = getStorageKey()
      localStorage.removeItem(storageKey)
      console.log('🧹 [useDevolucoesPersistencia] Devoluções limpas:', folhaCodigo)
    }
  }, [folhaCodigo, getStorageKey])

  // Carregar devoluções ao montar o hook
  useEffect(() => {
    carregarDevolucoesSalvas()
  }, [carregarDevolucoesSalvas])

  // Salvar automaticamente quando devoluções mudarem
  useEffect(() => {
    if (devolucoes.length > 0 && !isLoading) {
      salvarDevolucoes(devolucoes)
    }
  }, [devolucoes, isLoading, salvarDevolucoes])

  return {
    devolucoes,
    isLoading,
    isSaving,
    carregarDevolucoesSalvas,
    salvarDevolucoes,
    adicionarDevolucao,
    removerDevolucao,
    limparDevolucoes
  }
}






