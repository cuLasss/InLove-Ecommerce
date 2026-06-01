import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Edit3, Trash2 } from 'lucide-react';
import { RetailCartItem } from '@/stores/retailSaleStore';
import { formatCurrency } from '@/lib/utils';

interface CartItemProps {
  item: RetailCartItem;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price_cents: number) => void;
  onUpdateDiscount: (discount_pct: number) => void;
  onRemove: () => void;
}

export function CartItem({ 
  item, 
  onUpdateQty, 
  onUpdatePrice, 
  onUpdateDiscount, 
  onRemove 
}: CartItemProps) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(item.unit_price_cents / 100);
  // Inicializar desconto como vazio se for 0, senão mostrar o valor
  const [tempDiscount, setTempDiscount] = useState(
    item.item_discount_pct && item.item_discount_pct > 0 
      ? item.item_discount_pct.toString() 
      : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Atualizar o estado local quando o item mudar
  useEffect(() => {
    // Se o desconto for 0 ou não existir, manter vazio ao invés de mostrar "0"
    const discount = item.item_discount_pct || 0;
    setTempDiscount(discount === 0 ? '' : discount.toString());
  }, [item.item_discount_pct]);

  const handlePriceSubmit = () => {
    onUpdatePrice(Math.round(tempPrice * 100));
    setEditingPrice(false);
  };

  const handleDiscountChange = (value: string) => {
    // Se o campo estiver vazio ou contiver apenas números válidos, atualizar
    // Permite digitar diretamente sobre o "0" sem precisar apagar
    setTempDiscount(value);
  };

  const handleDiscountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Se o valor for "0", limpar o campo para permitir digitação direta
    if (tempDiscount === '0') {
      setTempDiscount('');
      // Selecionar todo o texto para facilitar substituição
      setTimeout(() => {
        e.target.select();
      }, 0);
    }
  };

  const handleDiscountBlur = () => {
    const discount = parseFloat(tempDiscount) || 0;
    const clampedDiscount = Math.max(0, Math.min(100, discount));
    onUpdateDiscount(clampedDiscount);
    // Se o desconto for 0, manter vazio ao invés de mostrar "0"
    setTempDiscount(clampedDiscount === 0 ? '' : clampedDiscount.toString());
  };

  // ESTÁVEL - Função para atualizar quantidade com debounce
  const handleQtyUpdate = useCallback((newQty: number) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    onUpdateQty(newQty);
    
    // Pequeno delay para evitar flicker
    setTimeout(() => {
      setIsUpdating(false);
    }, 100);
  }, [onUpdateQty, isUpdating]);

  const itemTotal = item.unit_price_cents * item.qty;
  const discountAmount = itemTotal * ((item.item_discount_pct || 0) / 100);
  const finalTotal = itemTotal - discountAmount;

  const stockReservedHere = item.qty;
  const stockAvailable = item.stock_available - stockReservedHere;

  return (
    <>
      <style>{`
        .cart-item-container {
          min-width: 900px !important; /* Largura mínima baseada na soma das colunas: 250 + 130 + 120 + 120 + 100 + 120 + 60 + gaps */
          max-width: none !important;
          width: max-content !important;
          flex: 0 0 auto !important;
          flex-shrink: 0 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 1rem !important;
          padding: 0.5rem 1rem !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
          border-radius: 0 !important;
        }
        
        /* Quando há apenas um item, ele pode ocupar toda a largura mas ainda permite scroll se necessário */
        .cart-items-container.single-item .cart-item-container {
          min-width: 100% !important;
        }
        
        .cart-item-container:first-child {
          border-top-left-radius: 0.5rem !important;
          border-top-right-radius: 0.5rem !important;
        }
        
        .cart-item-container:last-child {
          border-bottom: none !important;
        }
        
        .cart-item-container:only-child {
          border-bottom: none !important;
        }
        
        .cart-item-container:hover {
          background-color: hsl(var(--muted) / 0.3) !important;
        }
        
        .cart-item-col {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.25rem !important;
          min-width: 0 !important;
          flex-shrink: 0 !important;
        }
        
        .cart-item-col-name {
          flex: 0 0 250px !important;
          min-width: 250px !important;
          max-width: 250px !important;
        }
        
        .cart-item-col-stock {
          flex: 0 0 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        
        .cart-item-col-price {
          flex: 0 0 130px !important;
          min-width: 130px !important;
          max-width: 130px !important;
        }
        
        .cart-item-col-qty {
          flex: 0 0 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        
        .cart-item-col-discount {
          flex: 0 0 100px !important;
          min-width: 100px !important;
          max-width: 100px !important;
        }
        
        .cart-item-col-total {
          flex: 0 0 120px !important;
          min-width: 120px !important;
          max-width: 120px !important;
        }
        
        .cart-item-col-actions {
          flex: 0 0 60px !important;
          min-width: 60px !important;
          max-width: 60px !important;
        }
        
        .cart-item-label {
          font-size: 0.7rem !important;
          color: hsl(var(--muted-foreground)) !important;
          font-weight: 500 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        
        .cart-item-value {
          font-size: 0.875rem !important;
        }
        
        /* Layout compacto para telas médias - garantir que preço e informações cruciais fiquem visíveis */
        @media (max-width: 1024px) {
          .cart-item-container {
            gap: 0.75rem !important;
            padding: 0.5rem 0.75rem !important;
            min-width: 910px !important; /* Aumentado para garantir que todas as informações fiquem visíveis, incluindo preços com 3 dígitos */
          }
          
          .cart-item-col-name {
            flex: 0 0 220px !important;
            min-width: 220px !important;
            max-width: 220px !important;
          }
          
          .cart-item-col-stock {
            flex: 0 0 110px !important;
            min-width: 110px !important;
            max-width: 110px !important;
          }
          
          .cart-item-col-price {
            flex: 0 0 125px !important;
            min-width: 125px !important;
            max-width: 125px !important;
          }
          
          .cart-item-col-qty {
            flex: 0 0 110px !important;
            min-width: 110px !important;
            max-width: 110px !important;
          }
          
          .cart-item-col-discount {
            flex: 0 0 90px !important;
            min-width: 90px !important;
            max-width: 90px !important;
          }
          
          .cart-item-col-total {
            flex: 0 0 110px !important;
            min-width: 110px !important;
            max-width: 110px !important;
          }
        }
        
        /* Para telas pequenas, ocultar estoque mas manter informações cruciais visíveis */
        @media (max-width: 768px) {
          .cart-item-container {
            gap: 0.5rem !important;
            padding: 0.5rem !important;
            min-width: 710px !important; /* Aumentado para garantir que preço e outras informações fiquem visíveis, incluindo preços com 3 dígitos */
          }
          
          .cart-item-col-stock {
            display: none !important;
          }
          
          .cart-item-col-name {
            flex: 0 0 200px !important;
            min-width: 200px !important;
            max-width: 200px !important;
          }
          
          .cart-item-col-price {
            flex: 0 0 115px !important;
            min-width: 115px !important;
            max-width: 115px !important;
          }
          
          .cart-item-col-qty {
            flex: 0 0 100px !important;
            min-width: 100px !important;
            max-width: 100px !important;
          }
          
          .cart-item-col-discount {
            flex: 0 0 80px !important;
            min-width: 80px !important;
            max-width: 80px !important;
          }
          
          .cart-item-col-total {
            flex: 0 0 100px !important;
            min-width: 100px !important;
            max-width: 100px !important;
          }
        }
        
        @media (max-width: 480px) {
          .cart-item-container {
            gap: 0.5rem !important;
            padding: 0.5rem !important;
            min-width: 650px !important; /* Mantém layout horizontal com scroll */
          }
          
          .cart-item-col-stock {
            display: none !important;
          }
          
          .cart-item-col-name {
            flex: 0 0 180px !important;
            min-width: 180px !important;
            max-width: 180px !important;
          }
          
          .cart-item-col-price {
            flex: 0 0 110px !important;
            min-width: 110px !important;
            max-width: 110px !important;
          }
          
          .cart-item-col-qty {
            flex: 0 0 95px !important;
            min-width: 95px !important;
            max-width: 95px !important;
          }
          
          .cart-item-col-discount {
            flex: 0 0 75px !important;
            min-width: 75px !important;
            max-width: 75px !important;
          }
          
          .cart-item-col-total {
            flex: 0 0 100px !important;
            min-width: 100px !important;
            max-width: 100px !important;
          }
          
          .cart-item-col-actions {
            flex: 0 0 50px !important;
            min-width: 50px !important;
            max-width: 50px !important;
          }
          
          /* Reduzir tamanhos de fonte para telas muito pequenas */
          .cart-item-label {
            font-size: 0.65rem !important;
          }
          
          .cart-item-value {
            font-size: 0.8rem !important;
          }
        }
      `}</style>
      <div className="bg-card cart-item-container">
        {/* Coluna: Nome do Produto */}
        <div className="cart-item-col cart-item-col-name">
          <div className="cart-item-label">Produto</div>
          <div className="cart-item-value font-medium truncate">{item.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {item.brand && <span>{item.brand}</span>}
            {item.size && <span> • {item.size}</span>}
            {item.short_code && <span> • #{item.short_code}</span>}
        </div>
        </div>

        {/* Coluna: Estoque */}
        <div className="cart-item-col cart-item-col-stock">
          <div className="cart-item-label">Estoque</div>
          <div className="text-xs">
            <span className="text-green-600">Disp: {stockAvailable}</span>
          {stockReservedHere > 0 && (
              <span className="ml-1 text-blue-600">(res: {stockReservedHere})</span>
          )}
        </div>
      </div>

        {/* Coluna: Preço */}
        <div className="cart-item-col cart-item-col-price">
          <div className="cart-item-label">Preço</div>
        {editingPrice ? (
          <Input
            type="number"
            step="0.01"
            value={tempPrice}
            onChange={(e) => setTempPrice(parseFloat(e.target.value) || 0)}
            onBlur={handlePriceSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handlePriceSubmit()}
              className="h-8 text-center text-xs"
            autoFocus
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTempPrice(item.unit_price_cents / 100);
              setEditingPrice(true);
            }}
              className="h-8 px-2 text-xs font-semibold hover:bg-muted justify-start"
          >
              <span className="whitespace-nowrap">{formatCurrency(item.unit_price_cents / 100)}</span>
                <Edit3 className="ml-1 h-3 w-3 flex-shrink-0" />
          </Button>
        )}
      </div>

        {/* Coluna: Quantidade */}
        <div className="cart-item-col cart-item-col-qty">
          <div className="cart-item-label">Qtd</div>
          <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQtyUpdate(item.qty - 1)}
            disabled={item.qty <= 1 || isUpdating}
                className="h-8 w-8 p-0"
          >
            <Minus className="h-3 w-3" />
          </Button>
            <span className="w-8 text-center font-semibold text-xs">{item.qty}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQtyUpdate(item.qty + 1)}
            disabled={item.qty >= item.stock_available || item.stock_available <= 0 || isUpdating}
                className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

        {/* Coluna: Desconto */}
        <div className="cart-item-col cart-item-col-discount">
          <div className="cart-item-label">Desc %</div>
        <Input
          type="number"
          min="0"
          max="100"
          step="1"
          inputMode="numeric"
          value={tempDiscount}
          onChange={(e) => handleDiscountChange(e.target.value)}
          onFocus={handleDiscountFocus}
          onBlur={handleDiscountBlur}
          className="h-8 text-center text-xs"
          placeholder="0"
        />
      </div>

        {/* Coluna: Total */}
        <div className="cart-item-col cart-item-col-total">
          <div className="cart-item-label">Total</div>
          <div className="flex flex-col">
        {discountAmount > 0 && (
                <div className="text-[10px] text-red-500 line-through">
            {formatCurrency(itemTotal / 100)}
          </div>
        )}
              <div className="font-semibold text-primary text-sm">
          {formatCurrency(finalTotal / 100)}
            </div>
        </div>
      </div>

        {/* Coluna: Ações */}
        <div className="cart-item-col cart-item-col-actions">
          <div className="cart-item-label" style={{ opacity: 0 }}>Ações</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
            <Trash2 className="h-4 w-4" />
      </Button>
    </div>
      </div>
    </>
  );
}