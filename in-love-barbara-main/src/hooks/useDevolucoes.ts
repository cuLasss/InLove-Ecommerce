/**
 * Hook: useDevolucoes
 * 
 * Hook para gerenciar devoluções de produtos consignados
 */

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
// Sistema local - não precisa de Supabase
import { useQueryClient } from '@tanstack/react-query'

interface ProdutoDevolvido {
  id: string
  product_id: string
  product_code: string
  product_name: string
  qty_original: number
  qty_devolvida: number
  preco_unitario_cents: number
  subtotal_cents: number
}

export function useDevolucoes() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isProcessando, setIsProcessando] = useState(false)

  // Função para confirmar devoluções
  const confirmarDevolucoes = async (
    folhaId: string, 
    folhaCodigo: string, 
    produtosDevolvidos: ProdutoDevolvido[]
  ) => {
    if (produtosDevolvidos.length === 0) {
      toast({
        title: "⚠️ Rascunho vazio",
        description: "Adicione pelo menos um produto para devolver",
        variant: "destructive"
      })
      return false
    }

    setIsProcessando(true)
    try {
      // Processar cada produto devolvido
      for (const produto of produtosDevolvidos) {
        // Sistema local - apenas log
        console.log('Processando devolução:', produto)
      }
      return true
    } catch (error) {
      console.error('Erro ao processar devoluções:', error)
      throw error
    } finally {
      setIsProcessando(false)
    }
  }

  const irParaPagamento = () => {
    console.log('Indo para pagamento')
  }

  return {
    confirmarDevolucoes,
    irParaPagamento,
    isProcessando
  }
}
