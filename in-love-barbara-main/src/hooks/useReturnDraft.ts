import { useState, useCallback } from 'react';
import { consignacaoApi } from '@/lib/api';

export interface ReturnDraftItem {
  productId: string;
  quantity: number;
}

export function useReturnDraft() {
  const [draftItems, setDraftItems] = useState<ReturnDraftItem[]>([]);

  // Adicionar item ao rascunho
  const addToDraft = useCallback((productId: string, qty: number) => {
    setDraftItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === productId);
      
      if (existingIndex >= 0) {
        // Item já existe no rascunho - atualizar quantidade
        const newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + qty
        };
        return newItems;
      } else {
        // Novo item no rascunho
        return [...prev, {
          productId,
          quantity: qty
        }];
      }
    });
  }, []);

  // Remover item do rascunho
  const removeFromDraft = useCallback((productId: string) => {
    setDraftItems(prev => prev.filter(item => item.productId !== productId));
  }, []);

  // Atualizar quantidade de um item no rascunho
  const updateDraftQuantity = useCallback((productId: string, newQty: number) => {
    setDraftItems(prev => {
      const index = prev.findIndex(item => item.productId === productId);
      if (index === -1) return prev;

      if (newQty <= 0) {
        // Remove o item se quantidade for 0 ou menor
        return prev.filter(item => item.productId !== productId);
      }

      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        quantity: newQty
      };
      
      return newItems;
    });
  }, []);

  // Limpar rascunho
  const clearDraft = useCallback(() => {
    setDraftItems([]);
  }, []);

  // Obter total de itens no rascunho
  const getTotalDraftItems = useCallback(() => {
    return draftItems.reduce((total, item) => total + item.quantity, 0);
  }, [draftItems]);

  // Confirmar devolução (processar todos os itens do rascunho)
  const confirmReturn = useCallback(async (loteId: string) => {
    if (draftItems.length === 0) {
      throw new Error('Nenhum item no rascunho para processar');
    }

    try {
      const result = await consignacaoApi.processReturn(loteId, draftItems);
      
      // Limpar rascunho após sucesso
      setDraftItems([]);
      
      return result;
    } catch (error) {
      throw error;
    }
  }, [draftItems]);

  return {
    draftItems,
    addToDraft,
    removeFromDraft,
    updateDraftQuantity,
    clearDraft,
    getTotalDraftItems,
    confirmReturn
  };
}