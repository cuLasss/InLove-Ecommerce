import React from "react";
import { ResponsiveScannerSheet } from "./ResponsiveScannerSheet";
import { useToast } from "@/hooks/use-toast";

interface ReturnScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteItems: any[]; // Itens do lote entregue
  onConfirmReturn: (productId: string, qty: number) => Promise<void>;
  getProductByCode: (code: string) => Promise<any>;
}

export function ReturnScannerSheet({ 
  open, 
  onOpenChange, 
  loteItems,
  onConfirmReturn,
  getProductByCode
}: ReturnScannerSheetProps) {
  const { toast } = useToast();

  // Validação específica para devolução
  const validateReturnProduct = async (product: any): Promise<{ valid: boolean; message: string; type: 'error' | 'warning' | 'success' }> => {
    // Verificar se o produto está no lote
    if (!loteItems.some(item => item.product_id === product.id)) {
      return {
        valid: false,
        type: 'error' as const,
        message: 'Esse item não faz parte desse lote'
      };
    }

    const loteItem = loteItems.find(item => item.product_id === product.id);
    const returnableQty = loteItem ? loteItem.qty : 0;
    
    if (returnableQty <= 0) {
      return {
        valid: false,
        type: 'warning' as const,
        message: 'Este item já foi totalmente devolvido'
      };
    }

    return {
      valid: true,
      type: 'success' as const,
      message: `Item válido! ${returnableQty} unidade(s) disponível(is) para devolução`
    };
  };

  // Função para obter o estoque disponível baseado no lote
  const getAvailableStock = async (productId: string): Promise<number> => {
    const loteItem = loteItems.find(item => item.product_id === productId);
    if (!loteItem) return 0;
    
    // Usar 'qty' ao invés de 'quantity' para consistência com a estrutura do banco
    const returnableQty = (loteItem.qty || 0) - (loteItem.returned_quantity || 0);
    return Math.max(0, returnableQty);
  };

  // Função para obter quantidade já no rascunho (não aplicável para devolução, sempre 0)
  const getDraftQty = (productId: string): number => {
    return 0; // Em devolução não há conceito de rascunho
  };

  return (
    <ResponsiveScannerSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Scanner de Devolução"
      subtitle="Escaneie apenas itens que fazem parte deste lote"
      mode="return"
      loteItems={loteItems}
      onConfirmAction={onConfirmReturn}
      getProductByCode={getProductByCode}
      validateProduct={validateReturnProduct}
      getAvailableStock={getAvailableStock}
      getDraftQty={getDraftQty}
    />
  );
}