import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, QrCode, ShoppingBag } from 'lucide-react';
import { useRetailSaleStore } from '@/stores/retailSaleStore';
import { ManualProductEntry } from './ManualProductEntry';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { SmartScannerSheet } from '@/components/scan/SmartScannerSheet';
import { useProducts } from '@/hooks/useProducts';
import { useStockQuery } from '@/hooks/useStockQuery';
import { useToast } from '@/hooks/use-toast';
interface CartCardProps {
  onCheckout: () => void;
  onCancel: () => void;
}
export function CartCard({
  onCheckout,
  onCancel
}: CartCardProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();
  const { findProductByCode } = useProducts();
  const { getAvailableStock } = useStockQuery();
  
  const {
    items,
    updateItemQty,
    updateItemPrice,
    updateItemDiscount,
    removeItem,
    addToCart,
    addOrIncrementItem,
    getTotals
  } = useRetailSaleStore();
  const totals = getTotals();
  const totalItems = totals.items_count;


  const handleScannerClose = (open: boolean) => {
    setScannerOpen(open);
    // Quando o scanner fechar, focar o input de código
    if (!open) {
      setTimeout(() => {
        const input = document.getElementById('manual-code') as HTMLInputElement;
        input?.focus();
      }, 100);
    }
  };

  
  return <>
      <style>{`
        .cart-card-header {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.75rem !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        .cart-card-header-title {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex-shrink: 0;
          overflow: hidden !important;
        }
        
        .cart-card-header-actions {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.5rem !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        .cart-card-header-actions button {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex-shrink: 0;
          box-sizing: border-box !important;
          white-space: nowrap;
        }
        
        @media (min-width: 640px) {
          .cart-card-header-actions {
            flex-direction: row !important;
            width: auto !important;
          }
          
          .cart-card-header-actions button {
            width: auto !important;
            flex: 0 1 auto !important;
            min-width: min-content;
          }
        }
        
        /* Faixa problemática: 767px até 918px - forçar layout vertical e botões divididos */
        @media (min-width: 768px) and (max-width: 918px) {
          .cart-card-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-card-header-title {
            width: 100% !important;
            flex: 0 0 auto !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          
          .cart-card-header-actions {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            gap: 0.5rem !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-card-header-actions button {
            flex: 1 1 calc(50% - 0.25rem) !important;
            min-width: 0 !important;
            max-width: calc(50% - 0.25rem) !important;
            width: auto !important;
            font-size: 0.75rem !important;
            padding: 0.5rem 0.5rem !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            white-space: normal !important;
          }
          
          .cart-card-header-actions button > span {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 100% !important;
            display: inline-block !important;
            min-width: 0 !important;
          }
          
          /* Forçar que os ícones dentro dos botões não quebrem o layout */
          .cart-card-header-actions button svg {
            flex-shrink: 0 !important;
          }
        }
        
        @media (min-width: 919px) {
          .cart-card-header {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 1rem !important;
          }
          
          .cart-card-header-title {
            width: auto !important;
            flex: 0 1 auto !important;
          }
          
          .cart-card-header-actions {
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            width: auto !important;
          }
          
          .cart-card-header-actions button {
            width: auto !important;
            flex: 0 0 auto !important;
          }
        }
        
        /* Ajustes para telas muito pequenas (<= 692px) */
        @media (max-width: 692px) {
          .cart-card-header-title span {
            font-size: 0.875rem !important;
          }
          
          .cart-card-header-actions button {
            font-size: 0.75rem !important;
            padding: 0.5rem 0.75rem !important;
          }
        }
        
        /* Ajustes específicos para faixa 693px até 767px */
        @media (min-width: 693px) and (max-width: 767px) {
          .cart-card-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          .cart-card-header-title {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }
          
          .cart-card-header-actions {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            flex-wrap: wrap !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-card-header-actions button {
            flex: 1 1 calc(50% - 0.25rem) !important;
            min-width: 0 !important;
            max-width: calc(50% - 0.25rem) !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          
          .cart-card-header-actions button span {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 100% !important;
            display: inline-block !important;
          }
        }
        
        /* Garantir que o Card principal nunca ultrapasse os limites */
        .cart-card-main {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        .cart-card-footer-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        .cart-card-content-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        
        /* CardHeader precisa permitir overflow para o modal de pesquisa aparecer */
        .cart-card-header-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }
        
        /* Específico para faixa 767px até 918px - garantir contenção total */
        @media (min-width: 768px) and (max-width: 918px) {
          .cart-card-main,
          .cart-card-content-wrapper,
          .cart-card-footer-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-card-header-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          
          .cart-card-header {
            overflow: hidden !important;
          }
          
          .cart-card-header-actions {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .cart-card-header-actions button {
            max-width: calc(50% - 0.25rem) !important;
          }
        }
        
        /* Container wrapper para scroll vertical quando houver muitos itens */
        .cart-items-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-y: auto !important;
          overflow-x: visible !important;
          max-height: calc(100vh - 400px) !important;
          min-height: 200px !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: thin !important;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
          position: relative !important;
        }
        
        /* Scrollbar vertical personalizada */
        .cart-items-wrapper::-webkit-scrollbar {
          width: 8px;
        }
        
        .cart-items-wrapper::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.1);
          border-radius: 4px;
        }
        
        .cart-items-wrapper::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        
        .cart-items-wrapper::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        
        /* Container de itens do carrinho - layout vertical como planilha */
        .cart-items-container {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          overflow-x: auto !important;
          overflow-y: visible !important;
          padding: 0 !important;
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 0.5rem !important;
          background: hsl(var(--card)) !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: thin !important;
          scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
        }
        
        /* Garantir que os itens dentro do container possam ter scroll horizontal */
        .cart-items-container > * {
          min-width: min-content !important;
          width: 100% !important;
        }
        
        /* Quando o item é maior que o container, permitir scroll horizontal */
        .cart-items-container .cart-item-container {
          width: max-content !important;
          min-width: 100% !important;
        }
        
        /* Scrollbar horizontal personalizada */
        .cart-items-container::-webkit-scrollbar {
          height: 8px;
        }
        
        .cart-items-container::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.1);
          border-radius: 4px;
        }
        
        .cart-items-container::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        
        .cart-items-container::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
        
        /* Ajustes responsivos para container de itens */
        @media (max-width: 640px) {
          .cart-items-wrapper {
            max-height: calc(100vh - 350px) !important;
          }
        }
        
        @media (max-width: 480px) {
          .cart-items-wrapper {
            max-height: calc(100vh - 320px) !important;
          }
        }
      `}</style>
      <Card className="w-full rounded-2xl shadow-md bg-white relative max-w-full min-w-0 cart-card-main" style={{ overflow: 'hidden', boxSizing: 'border-box' }}>
        {/* Header */}
        <CardHeader className="px-2 sm:px-4 md:px-5 py-4 cart-card-header-wrapper" style={{ overflow: 'visible', position: 'relative', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <div className="cart-card-header" style={{ overflow: 'hidden' }}>
            <CardTitle className="cart-card-header-title flex items-center gap-2 text-base sm:text-lg lg:text-xl">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <span className="whitespace-nowrap">
              Carrinho ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
              </span>
            </CardTitle>
            <div className="cart-card-header-actions">
              <Button 
                onClick={() => setScannerOpen(true)} 
                className="bg-primary hover:bg-primary-hover text-xs sm:text-sm min-w-0"
                style={{ maxWidth: '100%', boxSizing: 'border-box' }}
              >
                <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Abrir Scanner</span>
              </Button>
              <Button 
                onClick={onCheckout} 
                disabled={totalItems === 0} 
                variant="secondary"
                className="text-xs sm:text-sm min-w-0"
                style={{ maxWidth: '100%', boxSizing: 'border-box' }}
              >
                <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Conferir Venda ({totalItems})</span>
              </Button>
            </div>
          </div>
          
          {/* Search bar - Separado dos botões com borda e espaço adequado */}
          <div className="mt-6 pt-5 pl-1 sm:pl-2 border-t border-border/40" style={{ position: 'relative', overflow: 'visible', zIndex: 1, maxWidth: '100%', minWidth: 0 }}>
            <ManualProductEntry 
              placeholder="Digite código reduzido, ID ou QR..." 
              onOpenSelectionDialog={() => {
                // Fechar o scanner quando o modal de seleção de produtos abrir
                if (scannerOpen) {
                  setScannerOpen(false);
                  console.log('✅ [CartCard] Scanner fechado para abrir modal de seleção');
                }
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-2 sm:px-4 md:px-5 cart-card-content-wrapper" style={{ maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'visible' }}>
          {/* Items list */}
          {items.length > 0 ? <div className="cart-items-wrapper">
              <div className={`cart-items-container ${items.length === 1 ? 'single-item' : ''}`}>
              {items.map(item => <CartItem key={item.product_id} item={item} onUpdateQty={qty => updateItemQty(item.product_id, qty)} onUpdatePrice={price => updateItemPrice(item.product_id, price)} onUpdateDiscount={discount => updateItemDiscount(item.product_id, discount)} onRemove={() => removeItem(item.product_id)} />)}
              </div>
            </div> : (/* Empty state */
        <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Use o scanner ou digite um código para começar
              </h3>
              <Button 
                onClick={() => setScannerOpen(true)} 
                className="mt-4 bg-primary hover:bg-primary/90"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Abrir Scanner
              </Button>
            </div>)}

          {/* Footer - only show if there are items */}
          {items.length > 0 && <div className="border-t pt-4 cart-card-footer-wrapper" style={{ maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
              <CartSummary totals={totals} onCheckout={onCheckout} onCancel={onCancel} />
            </div>}
        </CardContent>
      </Card>

      {/* Scanner Sheet */}
      <SmartScannerSheet 
        open={scannerOpen} 
        onOpenChange={handleScannerClose}
        mode="varejo"
        onConfirmItem={async (productId: string, qty: number) => {
          // Adicionar item ao carrinho do varejo
          const existingItem = items.find(item => item.product_id === productId);
          if (existingItem) {
            // Se já existe no carrinho, incrementar quantidade
            addToCart(productId, qty);
          } else {
            // Se não existe, buscar o produto pelo ID e adicionar
            const product = await findProductByCode(productId);
            if (product) {
              // Buscar estoque disponível
              const availableStock = await getAvailableStock(product.id);
              // Adicionar com a quantidade especificada
              for (let i = 0; i < qty; i++) {
                addOrIncrementItem(product, availableStock);
              }
            } else {
              throw new Error('Produto não encontrado');
            }
          }
        }}
        getProductByCode={async (code: string) => {
          return findProductByCode(code);
        }}
        getAvailableStock={async (productId: string) => {
          return await getAvailableStock(productId);
        }}
        getDraftQty={(productId: string) => {
          const item = items.find(i => i.product_id === productId);
          return item?.qty || 0;
        }}
      />
    </>;
}