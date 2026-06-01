import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface PendingItem {
  productId: string;
  code: string;
  name: string;
  price: number;
  priceCents: number;
  available: number;
  alreadyInDraft: number;
  toAddQty: number;
  brand?: string;
  color?: string;
  size?: string;
}

interface UseScannerPendingItemOptions {
  onConfirm: (productId: string, qty: number) => Promise<void>;
  onCancel?: () => void;
  mode?: 'consignado' | 'varejo';
}

export function useScannerPendingItem({
  onConfirm,
  onCancel,
  mode = 'consignado'
}: UseScannerPendingItemOptions) {
  const { toast } = useToast();
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);

  const setPending = useCallback((item: Omit<PendingItem, 'toAddQty'>) => {
    const maxQty = Math.max(1, item.available - item.alreadyInDraft);
    
    setPendingItem({
      ...item,
      toAddQty: Math.min(1, maxQty) // Começar com 1 ou o máximo disponível
    });
  }, []);

  const incrementPending = useCallback(() => {
    if (!pendingItem) return;
    
    const maxQty = Math.max(1, pendingItem.available - pendingItem.alreadyInDraft);
    const newQty = Math.min(pendingItem.toAddQty + 1, maxQty);
    
    if (newQty > maxQty) {
      toast({
        title: "❌ Quantidade máxima atingida",
        description: `Máximo disponível: ${maxQty}`,
        variant: "destructive"
      });
      return;
    }
    
    if (pendingItem.available <= 0) {
      toast({
        title: "❌ Produto sem estoque",
        description: `Estoque disponível: ${pendingItem.available}`,
        variant: "destructive"
      });
      return;
    }
    
    setPendingItem(prev => prev ? { ...prev, toAddQty: newQty } : null);
  }, [pendingItem, toast]);

  const decrementPending = useCallback(() => {
    if (!pendingItem) return;
    
    const newQty = Math.max(1, pendingItem.toAddQty - 1);
    setPendingItem(prev => prev ? { ...prev, toAddQty: newQty } : null);
  }, [pendingItem]);

  const confirmPending = useCallback(async () => {
    if (!pendingItem) return;
    
    console.log('🎯 Confirmando item pendente:', pendingItem);
    
    try {
      await onConfirm(pendingItem.productId, pendingItem.toAddQty);
      setPendingItem(null);
      
      const successMessage = mode === 'varejo' 
        ? "✅ Item adicionado ao carrinho"
        : "✅ Item adicionado ao rascunho";
        
      toast({
        title: successMessage,
        description: `${pendingItem.name} (${pendingItem.toAddQty}x)`
      });
      
      console.log('✅ Item confirmado com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao confirmar item:', error);
      toast({
        title: "❌ Erro ao adicionar item",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      });
    }
  }, [pendingItem, onConfirm, toast, mode]);

  const cancelPending = useCallback(() => {
    setPendingItem(null);
    onCancel?.();
  }, [onCancel]);

  const clearPending = useCallback(() => {
    setPendingItem(null);
  }, []);

  // Verificar se pode incrementar
  const canIncrement = pendingItem ? 
    pendingItem.toAddQty < (pendingItem.available - pendingItem.alreadyInDraft) : false;
  
  // Verificar se pode decrementar
  const canDecrement = pendingItem ? pendingItem.toAddQty > 1 : false;

  return {
    pendingItem,
    setPending,
    incrementPending,
    decrementPending,
    confirmPending,
    cancelPending,
    clearPending,
    canIncrement,
    canDecrement,
    hasPending: !!pendingItem
  };
}
