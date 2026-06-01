import { Button } from '@/components/ui/button';
import { ShoppingBag, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CartSummaryProps {
  totals: {
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    items_count: number;
  };
  onCheckout: () => void;
  onCancel: () => void;
}

export function CartSummary({ totals, onCheckout, onCancel }: CartSummaryProps) {
  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-hidden">
      {/* Totals */}
      <div className="space-y-2 min-w-0 max-w-full">
        <div className="flex justify-between text-sm min-w-0">
          <span className="text-muted-foreground truncate">Itens ({totals.items_count})</span>
          <span className="flex-shrink-0 ml-2">{formatCurrency(totals.subtotal_cents / 100)}</span>
        </div>
        
        {totals.discount_cents > 0 && (
          <div className="flex justify-between text-sm min-w-0">
            <span className="text-muted-foreground truncate">Descontos</span>
            <span className="text-red-600 flex-shrink-0 ml-2">-{formatCurrency(totals.discount_cents / 100)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-base sm:text-lg font-semibold pt-2 border-t min-w-0">
          <span className="truncate">Total</span>
          <span className="text-primary flex-shrink-0 ml-2">{formatCurrency(totals.total_cents / 100)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-0 max-w-full cart-summary-buttons">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="flex-1 w-full sm:w-auto text-xs sm:text-sm min-w-0 cart-summary-button"
        >
          <X className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
          <span className="truncate cart-summary-button-text-full">Cancelar Venda</span>
          <span className="truncate cart-summary-button-text-short">Cancelar</span>
        </Button>
        <Button 
          onClick={onCheckout}
          className="flex-1 w-full sm:w-auto bg-primary hover:bg-primary-hover text-xs sm:text-sm min-w-0 cart-summary-button"
        >
          <ShoppingBag className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
          <span className="truncate cart-summary-button-text-full">Conferir Venda</span>
          <span className="truncate cart-summary-button-text-short">Conferir</span>
        </Button>
      </div>
      <style>{`
        .cart-summary-buttons {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        
        .cart-summary-button {
          min-width: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Faixa problemática: 767px até 918px */
        @media (min-width: 768px) and (max-width: 918px) {
          .cart-summary-buttons {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-summary-button {
            flex: 1 1 calc(50% - 0.25rem) !important;
            min-width: 0 !important;
            max-width: calc(50% - 0.25rem) !important;
            width: auto !important;
            font-size: 0.75rem !important;
            padding: 0.5rem 0.75rem !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-summary-button span {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 100% !important;
            display: inline-block !important;
          }
        }
        
        /* Faixa 693px até 767px */
        @media (min-width: 693px) and (max-width: 767px) {
          .cart-summary-buttons {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-summary-button {
            flex: 1 1 calc(50% - 0.25rem) !important;
            min-width: 0 !important;
            max-width: calc(50% - 0.25rem) !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          
          .cart-summary-button span {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            max-width: 100% !important;
            display: inline-block !important;
          }
        }
        
        /* Texto dos botões - versão completa e curta */
        .cart-summary-button-text-short {
          display: none !important;
        }
        
        .cart-summary-button-text-full {
          display: inline-block !important;
        }
        
        /* A partir de 459px, mostrar apenas texto curto */
        @media (max-width: 459px) {
          .cart-summary-button-text-short {
            display: inline-block !important;
          }
          
          .cart-summary-button-text-full {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}