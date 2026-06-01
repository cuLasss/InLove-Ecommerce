import React from "react";
import { ResponsiveScannerSheet } from "./ResponsiveScannerSheet";
import { useToast } from "@/hooks/use-toast";

interface SmartScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeDetected?: (code: string) => Promise<void>;
  // Modo consignado
  mode?: 'varejo' | 'consignado';
  onConfirmItem?: (productId: string, qty: number) => Promise<void>;
  getProductByCode?: (code: string) => Promise<any>;
  getAvailableStock?: (productId: string) => Promise<number>;
  getDraftQty?: (productId: string) => number;
  // ✅ NOVA PROP: Produtos da folha para busca filtrada
  folhaProducts?: any[];
}

export function SmartScannerSheet({ 
  open, 
  onOpenChange, 
  onCodeDetected,
  mode = 'varejo',
  onConfirmItem,
  getProductByCode,
  getAvailableStock,
  getDraftQty,
  folhaProducts
}: SmartScannerSheetProps) {
  const { toast } = useToast();

  // Validação específica para modo varejo/consignado
  const validateProduct = async (product: any) => {
    if (mode === 'varejo') {
      // Para varejo, sempre válido
      return {
        valid: true,
        type: 'success' as const,
        message: `Item encontrado: ${product.name}`
      };
    }

    // Para consignado, verificar estoque disponível
    if (getAvailableStock) {
      const available = await getAvailableStock(product.id);
      const draftQty = getDraftQty ? getDraftQty(product.id) : 0;
      const remainingStock = available - draftQty;

      if (remainingStock <= 0) {
        return {
          valid: false,
          type: 'warning' as const,
          message: 'Sem estoque disponível para este item'
        };
      }

      return {
        valid: true,
        type: 'success' as const,
        message: `Item válido! ${remainingStock} unidade(s) disponível(is)`
      };
    }

    return {
      valid: true,
      type: 'success' as const,
      message: `Item encontrado: ${product.name}`
    };
  };

  return (
    <ResponsiveScannerSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'consignado' ? "Scanner Consignado" : "Scanner Varejo"}
      subtitle={mode === 'consignado' ? "Escaneie produtos do estoque consignado" : "Escaneie produtos para venda"}
      mode={mode}
      onConfirmAction={onConfirmItem}
      getProductByCode={getProductByCode}
      getAvailableStock={getAvailableStock}
      getDraftQty={getDraftQty}
      validateProduct={validateProduct}
      onCodeDetected={onCodeDetected}
      folhaProducts={folhaProducts}
    />
  );
}