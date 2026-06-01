/**
 * Hook: Rascunho Local (Sem Salvamento Automático)
 * 
 * Este hook gerencia um rascunho local que não salva automaticamente no banco.
 * Os itens só são salvos quando o usuário clica em "Salvar Rascunho".
 */

import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useProducts } from '@/hooks/useProducts'
import { useStockQuery } from '@/hooks/useStockQuery'
// Sistema local - não precisa de Supabase
export interface RascunhoItem {
  product_id: string
  product_code: string
  product_name: string
  qty: number
  preco_base_cents: number
  subtotal_cents: number
  variation?: string
}

export interface RascunhoLocal {
  items: RascunhoItem[]
  totalItems: number
  totalValue: number
}

export function useRascunhoLocal() {
  const { toast } = useToast()
  const { findProductByCode } = useProducts()
  const { getAvailableStock } = useStockQuery()
  
  const [rascunho, setRascunho] = useState<RascunhoLocal>({
    items: [],
    totalItems: 0,
    totalValue: 0
  })

  // Adicionar item ao rascunho local
  const addItem = useCallback(async (productCode: string, qty: number = 1) => {
    try {
      // Buscar produto
      const product = await findProductByCode(productCode)
      if (!product) {
        throw new Error('Produto não encontrado')
      }

      // Verificar estoque disponível
      const availableStock = await getAvailableStock(product.id)
      const currentQtyInRascunho = rascunho.items.find(item => item.product_id === product.id)?.qty || 0
      
      if (currentQtyInRascunho + qty > availableStock) {
        throw new Error(`Estoque insuficiente. Disponível: ${availableStock}`)
      }

      // Adicionar ou atualizar item no rascunho local
      setRascunho(prev => {
        const existingItem = prev.items.find(item => item.product_id === product.id)
        
        if (existingItem) {
          // Atualizar quantidade existente
          const newQty = existingItem.qty + qty
          const newSubtotal = newQty * existingItem.preco_base_cents
          
          return {
            ...prev,
            items: prev.items.map(item => 
              item.product_id === product.id 
                ? { ...item, qty: newQty, subtotal_cents: newSubtotal }
                : item
            ),
            totalItems: prev.totalItems + qty,
            totalValue: prev.totalValue + (qty * existingItem.preco_base_cents)
          }
        } else {
          // Adicionar novo item
          const newItem: RascunhoItem = {
            product_id: product.id,
            product_code: product.short_code || productCode,
            product_name: product.name,
            qty,
            preco_base_cents: product.price_cents,
            subtotal_cents: qty * product.price_cents,
            variation: product.color || product.size ? `${product.color || ''} ${product.size || ''}`.trim() : undefined
          }
          
          return {
            ...prev,
            items: [...prev.items, newItem],
            totalItems: prev.totalItems + qty,
            totalValue: prev.totalValue + newItem.subtotal_cents
          }
        }
      })

      toast({
        title: "✅ Item adicionado ao rascunho",
        description: `${product.name} adicionado (não salvo ainda)`
      })

    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message,
        variant: "destructive"
      })
      throw error
    }
  }, [rascunho.items, findProductByCode, getAvailableStock, toast])

  // Remover item do rascunho local
  const removeItem = useCallback((productId: string, qty: number = 1) => {
    setRascunho(prev => {
      const existingItem = prev.items.find(item => item.product_id === productId)
      if (!existingItem) return prev

      if (existingItem.qty <= qty) {
        // Remover item completamente
        return {
          ...prev,
          items: prev.items.filter(item => item.product_id !== productId),
          totalItems: prev.totalItems - existingItem.qty,
          totalValue: prev.totalValue - existingItem.subtotal_cents
        }
      } else {
        // Reduzir quantidade
        const newQty = existingItem.qty - qty
        const newSubtotal = newQty * existingItem.preco_base_cents
        
        return {
          ...prev,
          items: prev.items.map(item => 
            item.product_id === productId 
              ? { ...item, qty: newQty, subtotal_cents: newSubtotal }
              : item
          ),
          totalItems: prev.totalItems - qty,
          totalValue: prev.totalValue - (qty * existingItem.preco_base_cents)
        }
      }
    })
  }, [])

  // Limpar rascunho
  const clearRascunho = useCallback(() => {
    setRascunho({
      items: [],
      totalItems: 0,
      totalValue: 0
    })
  }, [])

  // Salvar rascunho no banco
  const saveRascunho = useCallback(async (folhaCodigo: string) => {
    try {
      // Sistema local - apenas log
      console.log('Salvando rascunho:', folhaCodigo)
      return true
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error)
      return false
    }
  }, [rascunho.items])

  return { rascunho, addItem, removeItem, clearRascunho, saveRascunho }
}
