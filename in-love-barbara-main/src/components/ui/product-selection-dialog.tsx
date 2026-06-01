import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Search, AlertCircle } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useRetailSaleStore } from '@/stores/retailSaleStore';
import { useStockQuery } from '@/hooks/useStockQuery';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  searchTerm: string;
  onSelectProduct: (product: Product) => void;
}

export function ProductSelectionDialog({
  open,
  onOpenChange,
  products,
  searchTerm,
  onSelectProduct
}: ProductSelectionDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [realStocks, setRealStocks] = useState<Record<string, number>>({});
  const { items } = useRetailSaleStore();
  const { getAvailableStock } = useStockQuery();
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Ajustar altura e largura do modal quando abrir - usando querySelector para garantir que encontre o elemento
  useEffect(() => {
    if (open) {
      const updateModalSize = () => {
        // Usar querySelector para encontrar o DialogContent após renderização
        const dialogContent = document.querySelector('[data-radix-dialog-content].product-selection-dialog-content') as HTMLElement;
        if (!dialogContent) return;
        
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Calcular largura máxima baseada na viewport
        let maxWidth: number;
        if (viewportWidth <= 640) {
          maxWidth = viewportWidth - 8; // 4px de margem em cada lado
        } else if (viewportWidth <= 692) {
          // Para telas entre 640px e 692px (problema reportado)
          maxWidth = viewportWidth - 8; // 4px de margem em cada lado
        } else if (viewportWidth <= 969) {
          // Para telas entre 693px e 969px
          maxWidth = viewportWidth - 12; // 6px de margem em cada lado
        } else if (viewportWidth <= 1095) {
          maxWidth = viewportWidth - 16; // 8px de margem em cada lado
        } else {
          maxWidth = Math.min(896, viewportWidth - 64); // 56rem = 896px, com margem
        }
        
        // Calcular altura máxima baseada na viewport
        let maxHeight: number;
        if (viewportWidth <= 692) {
          // Para telas <= 692px (problema reportado)
          maxHeight = viewportHeight - 8; // 4px de margem em cada lado
        } else if (viewportWidth <= 969) {
          // Para telas entre 693px e 969px
          maxHeight = viewportHeight - 12; // 6px de margem em cada lado
        } else if (viewportWidth <= 1095) {
          // Para telas entre 969px e 1095px
          maxHeight = viewportHeight - 16; // 8px de margem em cada lado
        } else {
          // Para telas maiores, usar 85% da viewport
          maxHeight = Math.floor(viewportHeight * 0.85);
        }
        
        // Garantir que nunca exceda a viewport e tenha margem mínima
        if (viewportWidth <= 692) {
          maxHeight = Math.min(maxHeight, viewportHeight - 8);
          maxWidth = Math.min(maxWidth, viewportWidth - 8);
        } else if (viewportWidth <= 969) {
          maxHeight = Math.min(maxHeight, viewportHeight - 12);
          maxWidth = Math.min(maxWidth, viewportWidth - 12);
        } else {
          maxHeight = Math.min(maxHeight, viewportHeight - 16);
          maxWidth = Math.min(maxWidth, viewportWidth - 8);
        }
        
        // Aplicar dimensões máximas ao modal
        dialogContent.style.setProperty('max-height', `${maxHeight}px`, 'important');
        dialogContent.style.setProperty('max-width', `${maxWidth}px`, 'important');
        dialogContent.style.setProperty('width', `${maxWidth}px`, 'important');
        dialogContent.style.setProperty('height', 'auto', 'important');
        
        // Garantir que o modal não saia da viewport
        dialogContent.style.setProperty('left', '50%', 'important');
        dialogContent.style.setProperty('top', '50%', 'important');
        dialogContent.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        
        // Calcular altura disponível para o body (modal - header - footer)
        const header = dialogContent.querySelector('.product-selection-dialog-header') as HTMLElement;
        const footer = dialogContent.querySelector('.product-selection-dialog-footer') as HTMLElement;
        const body = dialogContent.querySelector('.product-selection-dialog-body') as HTMLElement;
        
        if (header && footer && body) {
          const headerHeight = header.offsetHeight;
          const footerHeight = footer.offsetHeight;
          // Para telas <= 692px, usar padding menor
          const borderPadding = viewportWidth <= 692 ? 4 : viewportWidth <= 969 ? 4 : 2;
          const availableHeight = maxHeight - headerHeight - footerHeight - borderPadding;
          
          // Garantir que o body não exceda o espaço disponível
          // Para telas menores, garantir altura mínima menor
          const minBodyHeight = viewportWidth <= 640 ? 150 : viewportWidth <= 692 ? 160 : viewportWidth <= 969 ? 180 : 200;
          body.style.setProperty('max-height', `${Math.max(availableHeight, minBodyHeight)}px`, 'important');
          body.style.setProperty('max-width', '100%', 'important');
          body.style.setProperty('width', '100%', 'important');
        }
      };

      // Aguardar próximo frame para garantir que o elemento foi renderizado
      const timeoutId = setTimeout(updateModalSize, 10);
      const animationFrameId = requestAnimationFrame(updateModalSize);
      
      // Observar mudanças na viewport
      window.addEventListener('resize', updateModalSize);
      window.addEventListener('orientationchange', updateModalSize);
      
      // Tentar atualizar após um pequeno delay para garantir renderização completa
      const delayedUpdate = setTimeout(updateModalSize, 100);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(delayedUpdate);
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', updateModalSize);
        window.removeEventListener('orientationchange', updateModalSize);
      };
    }
  }, [open]);

  // Buscar estoques reais quando o dialog abrir
  useEffect(() => {
    if (open && products.length > 0) {
      const fetchRealStocks = async () => {
        const stocks: Record<string, number> = {};
        for (const product of products) {
          try {
            const realStock = await getAvailableStock(product.id);
            stocks[product.id] = realStock;
          } catch (error) {
            console.error(`Erro ao buscar estoque para ${product.id}:`, error);
            stocks[product.id] = product.stock || 0; // Fallback
          }
        }
        setRealStocks(stocks);
      };
      fetchRealStocks();
    }
  }, [open, products, getAvailableStock]);

  const handleSelect = async () => {
    if (selectedProduct) {
      const currentQty = items.find(item => item.product_id === selectedProduct.id)?.qty || 0;
      // Buscar estoque real do sistema
      const realStock = await getAvailableStock(selectedProduct.id);
      const availableStock = Math.max(0, realStock - currentQty);
      
      if (availableStock <= 0) {
        // Não permitir seleção se não há estoque
        return;
      }
      
      onSelectProduct(selectedProduct);
      onOpenChange(false);
      setSelectedProduct(null);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedProduct(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  // Forçar z-index muito alto quando o modal abrir e garantir que fique acima de tudo
  useEffect(() => {
    if (open && products.length > 0) {
      console.log('🔍 [ProductSelectionDialog] Modal aberto, produtos:', products.length);
      
      // Fechar qualquer Sheet que esteja aberto (scanner, etc)
      const closeAnyOpenSheets = () => {
        // Procurar por Sheets abertos (que são dialogs do Radix UI)
        const allDialogs = document.querySelectorAll('[data-radix-dialog-content]');
        allDialogs.forEach((dialog) => {
          const el = dialog as HTMLElement;
          // Se não é nosso modal de seleção, pode ser um Sheet
          if (!el.classList.contains('product-selection-dialog-content')) {
            // Verificar se tem a classe de Sheet ou se está no mesmo portal
            const portal = el.closest('[data-radix-portal]');
            if (portal) {
              // Não fechar Sheets programaticamente, apenas garantir z-index
              console.log('⚠️ [ProductSelectionDialog] Sheet encontrado, garantindo z-index do modal acima');
            }
          }
        });
      };
      
      // Forçar z-index após renderização - múltiplas tentativas
      const forceZIndex = () => {
        // Procurar nosso dialog específico
        const ourDialog = document.querySelector('[data-radix-dialog-content].product-selection-dialog-content') as HTMLElement;
        if (!ourDialog) {
          console.warn('⚠️ [ProductSelectionDialog] Dialog não encontrado ainda');
          return;
        }
        
        const ourPortal = ourDialog.closest('[data-radix-portal]') as HTMLElement;
        
        // Aplicar z-index muito alto no nosso dialog
        ourDialog.style.setProperty('z-index', '10000', 'important');
        ourDialog.style.setProperty('position', 'fixed', 'important');
        ourDialog.style.setProperty('visibility', 'visible', 'important');
        ourDialog.style.setProperty('opacity', '1', 'important');
        console.log('✅ [ProductSelectionDialog] Dialog z-index aplicado: 10000');
        
        // Encontrar o overlay no mesmo portal do nosso dialog
        if (ourPortal) {
          const overlayInOurPortal = ourPortal.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
          if (overlayInOurPortal) {
            overlayInOurPortal.style.setProperty('z-index', '9999', 'important');
            overlayInOurPortal.style.setProperty('position', 'fixed', 'important');
            overlayInOurPortal.style.setProperty('visibility', 'visible', 'important');
            overlayInOurPortal.style.setProperty('opacity', '1', 'important');
            console.log('✅ [ProductSelectionDialog] Overlay do nosso portal z-index aplicado: 9999');
          }
          
          ourPortal.style.setProperty('z-index', '9999', 'important');
          console.log('✅ [ProductSelectionDialog] Portal z-index aplicado: 9999');
        }
        
        // Garantir que TODOS os outros dialogs (Sheets, etc) tenham z-index menor
        const allDialogs = document.querySelectorAll('[data-radix-dialog-content]');
        allDialogs.forEach((dialog) => {
          const el = dialog as HTMLElement;
          if (!el.classList.contains('product-selection-dialog-content')) {
            // É um Sheet ou outro dialog - garantir z-index baixo
            el.style.setProperty('z-index', '61', 'important');
            console.log('⚠️ [ProductSelectionDialog] Dialog não-our reduzido para z-index: 61');
          }
        });
        
        // Garantir que TODOS os overlays de outros dialogs tenham z-index baixo
        const allOverlays = document.querySelectorAll('[data-radix-dialog-overlay]');
        allOverlays.forEach((overlay) => {
          const overlayEl = overlay as HTMLElement;
          const overlayPortal = overlayEl.closest('[data-radix-portal]');
          // Se o overlay NÃO está no portal do nosso dialog, reduzir z-index
          if (!ourPortal || overlayPortal !== ourPortal) {
            overlayEl.style.setProperty('z-index', '60', 'important');
            console.log('⚠️ [ProductSelectionDialog] Overlay de outro dialog reduzido para z-index: 60');
          }
        });
      };
      
      closeAnyOpenSheets();
      
      // Tentar múltiplas vezes com diferentes delays
      const timeouts = [
        setTimeout(forceZIndex, 0),
        setTimeout(forceZIndex, 50),
        setTimeout(forceZIndex, 100),
        setTimeout(forceZIndex, 200),
        setTimeout(forceZIndex, 500),
      ];
      
      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [open, products.length]);

  return (
    <>
      <style>{`
        /* Sobrescrever TODOS os estilos do DialogContent com máxima especificidade */
        /* IMPORTANTE: z-index muito alto para ficar acima de Sheets (z-[60]/z-[61]) e outros elementos */
        [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
        body [data-radix-dialog-content].product-selection-dialog-content,
        [data-radix-dialog-content].product-selection-dialog-content {
          position: fixed !important;
          left: 50% !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
          display: flex !important;
          flex-direction: column !important;
          max-height: calc(100vh - 2rem) !important;
          height: auto !important;
          min-height: 400px !important;
          max-width: min(95vw, 1400px) !important;
          width: min(95vw, 1400px) !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          border-radius: 0.5rem !important;
          background: hsl(var(--background)) !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          z-index: 10000 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          clip: auto !important;
          clip-path: none !important;
          contain: none !important;
        }
        
        /* Garantir que o overlay também tenha z-index alto e esteja visível */
        /* z-index alto para ficar acima de Sheet overlays (z-[60]) mas abaixo do conteúdo do dialog */
        [data-radix-portal] [data-radix-dialog-overlay],
        body [data-radix-dialog-overlay],
        [data-radix-dialog-overlay] {
          z-index: 9999 !important;
          background: rgba(0, 0, 0, 0.8) !important;
          position: fixed !important;
          inset: 0 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        
        /* Garantir que o portal do dialog esteja no nível correto */
        [data-radix-portal] {
          position: relative !important;
          z-index: 9999 !important;
        }
        
        /* Garantir que nenhum elemento interfira - especialmente Sheets e outros dialogs */
        [data-radix-dialog-content].product-selection-dialog-content[data-state="open"] {
          z-index: 10000 !important;
        }
        
        [data-radix-dialog-overlay][data-state="open"] {
          z-index: 9999 !important;
        }
        
        /* Garantir que Sheets não bloqueiem o modal de seleção */
        /* Sheets devem ter z-index menor que o modal de seleção */
        /* Selecionar todos os dialogs que NÃO são o nosso modal de seleção */
        [data-radix-dialog-content]:not(.product-selection-dialog-content) {
          z-index: 61 !important;
        }
        
        /* Selecionar overlays que estão com Sheets (não com nosso modal) */
        [data-radix-dialog-overlay]:not(:has(~ [data-radix-dialog-content].product-selection-dialog-content)) {
          z-index: 60 !important;
        }
        
        /* Garantir que quando nosso modal estiver aberto, ele tenha prioridade absoluta */
        body:has([data-radix-dialog-content].product-selection-dialog-content[data-state="open"]) 
          [data-radix-dialog-content]:not(.product-selection-dialog-content) {
          z-index: 61 !important;
        }
        
        body:has([data-radix-dialog-content].product-selection-dialog-content[data-state="open"]) 
          [data-radix-dialog-overlay]:not(:has(~ [data-radix-dialog-content].product-selection-dialog-content)) {
          z-index: 60 !important;
        }
        
        /* Garantir que o body não scroll quando o modal estiver aberto */
        body[data-scroll-locked] {
          overflow: hidden !important;
        }
        
        .product-selection-dialog-header {
          flex-shrink: 0 !important;
          padding: 1rem 0.75rem !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--background)) !important;
          min-height: fit-content !important;
          min-width: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        .product-selection-dialog-body {
          flex: 1 1 0% !important;
          min-height: 0 !important;
          min-width: 0 !important;
          max-height: calc(100% - 140px) !important;
          overflow-y: hidden !important;
          overflow-x: auto !important;
          padding: 1rem 0.75rem !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          box-sizing: border-box !important;
          scrollbar-width: thin !important;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
        }
        
        /* Container horizontal para os produtos */
        .product-selection-products-container {
          display: flex !important;
          flex-direction: row !important;
          gap: 1rem !important;
          min-width: fit-content !important;
          padding-bottom: 0.5rem !important;
          align-items: stretch !important;
        }
        
        /* Ajustar altura do body para telas <= 969px */
        @media (max-width: 969px) {
          .product-selection-dialog-body {
            max-height: none !important;
            flex: 1 1 auto !important;
            overflow-y: hidden !important;
            overflow-x: auto !important;
          }
        }
        
        /* Ajustar altura do body para telas <= 692px */
        @media (max-width: 692px) {
          .product-selection-dialog-body {
            max-height: none !important;
            flex: 1 1 auto !important;
            overflow-y: hidden !important;
            overflow-x: auto !important;
            padding: 0.75rem 0.5rem !important;
          }
          
          .product-selection-products-container {
            gap: 0.75rem !important;
          }
        }
        
        @media (max-height: 600px) {
          .product-selection-dialog-body {
            max-height: calc(100% - 100px) !important;
          }
        }
        
        @media (max-width: 969px) and (max-height: 600px) {
          .product-selection-dialog-body {
            max-height: none !important;
          }
        }
        
        @media (max-width: 692px) and (max-height: 600px) {
          .product-selection-dialog-body {
            max-height: none !important;
          }
        }
        
        .product-selection-dialog-footer {
          flex-shrink: 0 !important;
          padding: 0.75rem 0.75rem !important;
          border-top: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--background)) !important;
          min-height: fit-content !important;
          min-width: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        /* Específico para resoluções problemáticas abaixo de 693px */
        @media (max-width: 692px) {
          [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
          body [data-radix-dialog-content].product-selection-dialog-content {
            max-height: calc(100vh - 0.5rem) !important;
            height: auto !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: calc(100vw - 0.5rem) !important;
            width: calc(100vw - 0.5rem) !important;
            padding: 0 !important;
          }
          
          .product-selection-dialog-header {
            padding: 0.5rem 0.25rem !important;
            flex-shrink: 0 !important;
          }
          
          .product-selection-dialog-body {
            padding: 0.25rem !important;
            flex: 1 1 auto !important;
            overflow-y: auto !important;
          }
          
          .product-selection-dialog-footer {
            padding: 0.5rem 0.25rem !important;
            flex-shrink: 0 !important;
          }
        }
        
        /* Específico para resoluções entre 693px e 969px */
        @media (min-width: 693px) and (max-width: 969px) {
          [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
          body [data-radix-dialog-content].product-selection-dialog-content {
            max-height: calc(100vh - 0.75rem) !important;
            height: auto !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: calc(100vw - 0.75rem) !important;
            width: calc(100vw - 0.75rem) !important;
            padding: 0 !important;
          }
          
          .product-selection-dialog-header {
            padding: 0.75rem 0.5rem !important;
            flex-shrink: 0 !important;
          }
          
          .product-selection-dialog-body {
            padding: 0.5rem !important;
            flex: 1 1 auto !important;
            overflow-y: auto !important;
          }
          
          .product-selection-dialog-footer {
            padding: 0.75rem 0.5rem !important;
            flex-shrink: 0 !important;
          }
        }
        
        /* Específico para resoluções entre 969px e 1095px */
        @media (min-width: 970px) and (max-width: 1095px) {
          [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
          body [data-radix-dialog-content].product-selection-dialog-content {
            max-height: calc(100vh - 1rem) !important;
            height: auto !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: calc(100vw - 1rem) !important;
            width: calc(100vw - 1rem) !important;
          }
          
          .product-selection-dialog-header {
            padding: 1rem 0.75rem !important;
          }
          
          .product-selection-dialog-body {
            padding: 1rem 0.75rem !important;
          }
          
          .product-selection-dialog-footer {
            padding: 0.75rem 0.75rem !important;
          }
        }
        
        /* Para telas maiores que 1095px */
        @media (min-width: 1096px) {
          [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
          body [data-radix-dialog-content].product-selection-dialog-content {
            max-height: 85vh !important;
            max-width: min(56rem, calc(100vw - 4rem)) !important;
            width: min(56rem, calc(100vw - 4rem)) !important;
          }
          
          .product-selection-dialog-header {
            padding: 1.5rem 1.5rem !important;
          }
          
          .product-selection-dialog-body {
            padding: 1.5rem 1.5rem !important;
          }
          
          .product-selection-dialog-footer {
            padding: 1rem 1.5rem !important;
          }
        }
        
        @media (max-height: 800px) {
          [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
          body [data-radix-dialog-content].product-selection-dialog-content {
            max-height: calc(100vh - 1rem) !important;
          }
          
          .product-selection-dialog-header {
            padding: 0.75rem 1rem !important;
          }
          
          .product-selection-dialog-body {
            padding: 0.75rem 1rem !important;
          }
          
          .product-selection-dialog-footer {
            padding: 0.5rem 1rem !important;
          }
        }
        
        @media (max-height: 600px) {
          [data-radix-portal] [data-radix-dialog-content].product-selection-dialog-content,
          body [data-radix-dialog-content].product-selection-dialog-content {
            max-height: calc(100vh - 0.5rem) !important;
          }
          
          .product-selection-dialog-header {
            padding: 0.5rem 0.75rem !important;
          }
          
          .product-selection-dialog-body {
            padding: 0.5rem 0.75rem !important;
          }
          
          .product-selection-dialog-footer {
            padding: 0.5rem 0.75rem !important;
          }
        }
        
        /* Cards de produtos - largura fixa para scroll horizontal */
        .product-selection-card {
          min-height: fit-content !important;
          min-width: 280px !important;
          max-width: 280px !important;
          width: 280px !important;
          flex-shrink: 0 !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        
        /* Para telas pequenas, cards menores */
        @media (max-width: 640px) {
          .product-selection-card {
            min-width: 260px !important;
            max-width: 260px !important;
            width: 260px !important;
          }
        }
        
        @media (max-width: 480px) {
          .product-selection-card {
            min-width: 240px !important;
            max-width: 240px !important;
            width: 240px !important;
          }
        }
        
        .product-selection-card-content {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        /* Container de produtos - permitir largura flexível para scroll horizontal */
        .product-selection-products-container {
          min-width: fit-content !important;
          width: auto !important;
        }
        
        .product-selection-dialog-body * {
          box-sizing: border-box !important;
        }
        
        /* Prevenir overflow em elementos flex dentro dos cards */
        .product-selection-card .flex {
          min-width: 0 !important;
        }
        
        .product-selection-card .flex-1 {
          min-width: 0 !important;
          overflow: hidden !important;
        }
        
        /* Garantir que badges não causem overflow */
        .product-selection-card .badge,
        .product-selection-card [class*="Badge"] {
          max-width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        
        /* Scrollbar horizontal personalizada para melhor UX */
        .product-selection-dialog-body::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        
        .product-selection-dialog-body::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.1);
          border-radius: 4px;
        }
        
        .product-selection-dialog-body::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        
        .product-selection-dialog-body::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        
        /* Para Firefox */
        .product-selection-dialog-body {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) hsl(var(--muted) / 0.1);
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogContent 
          ref={dialogContentRef}
          className="product-selection-dialog-content"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="product-selection-dialog-header">
        <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Múltiplos produtos encontrados</span>
          </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-1">
            Encontramos {products.length} produtos para "{searchTerm}". Selecione o produto desejado:
          </DialogDescription>
        </DialogHeader>
          </div>

          <div className="product-selection-dialog-body">
            <div className="product-selection-products-container">
          {products.map((product) => {
            const currentQty = items.find(item => item.product_id === product.id)?.qty || 0;
            // Usar estoque real do sistema em vez do product.stock estático
            const realStock = realStocks[product.id] ?? product.stock ?? 0;
            const availableStock = Math.max(0, realStock - currentQty);
            const isOutOfStock = availableStock <= 0;
            const isLowStock = availableStock <= 5 && availableStock > 0;
            
            return (
              <Card 
                key={product.id}
                    className={`product-selection-card transition-all duration-200 border-2 ${
                  isOutOfStock 
                    ? 'cursor-not-allowed opacity-60 border-red-200 bg-red-50' 
                        : 'cursor-pointer hover:bg-muted/50 border-slate-200 hover:shadow-md'
                } ${
                  selectedProduct?.id === product.id 
                        ? 'ring-2 ring-primary bg-primary/5 border-primary shadow-lg' 
                    : ''
                }`}
                onClick={() => !isOutOfStock && setSelectedProduct(product)}
              >
                    <CardContent className="product-selection-card-content p-3 sm:p-4">
                      <div className="flex flex-col gap-3 h-full">
                        {/* Header do card */}
                        <div className="flex items-start gap-2 mb-1">
                          <Package className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isOutOfStock ? 'text-red-400' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium text-sm sm:text-base line-clamp-2 ${isOutOfStock ? 'text-red-600' : ''}`}>
                          {product.name}
                        </h3>
                        {isOutOfStock && (
                              <AlertCircle className="h-4 w-4 text-red-500 inline-block ml-1" />
                        )}
                          </div>
                      </div>
                      
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5">
                        {product.short_code && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                              {product.short_code}
                          </Badge>
                        )}
                        {product.brands?.name && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                            {product.brands.name}
                          </Badge>
                        )}
                        {product.size && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">
                            {product.size}
                          </Badge>
                        )}
                      </div>

                        {/* Descrição */}
                        {product.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2 flex-shrink-0">
                            {product.description}
                          </div>
                        )}
                      
                        {/* Informações de estoque e preço - agrupadas no final */}
                        <div className="mt-auto space-y-2">
                          {/* Estoque */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`font-medium ${
                          isOutOfStock 
                            ? 'text-red-600' 
                            : isLowStock 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                        }`}>
                          Estoque: {realStock}
                          {currentQty > 0 && ` (${currentQty} no carrinho)`}
                        </span>
                        {isOutOfStock && (
                              <span className="text-red-600 text-[10px] font-medium">• Sem estoque</span>
                        )}
                        {isLowStock && !isOutOfStock && (
                              <span className="text-orange-600 text-[10px] font-medium">• Baixo</span>
                        )}
                    </div>

                          {/* Preço */}
                          <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                            <div className="text-lg font-bold text-primary">
                        {formatCurrency(product.price_cents || 0)}
                      </div>
                            <div className="text-[10px] text-muted-foreground">
                              ID: {product.id.slice(-6)}
                            </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
        </div>

          <div className="product-selection-dialog-footer">
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
            Cancelar
          </Button>
          <Button 
            onClick={handleSelect}
            disabled={!selectedProduct || (selectedProduct && (() => {
              const currentQty = items.find(item => item.product_id === selectedProduct.id)?.qty || 0;
              const realStock = realStocks[selectedProduct.id] ?? selectedProduct.stock ?? 0;
              const availableStock = Math.max(0, realStock - currentQty);
              return availableStock <= 0;
            })())}
                className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Selecionar Produto
          </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
