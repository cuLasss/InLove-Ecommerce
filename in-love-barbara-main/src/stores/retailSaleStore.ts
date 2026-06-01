import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RetailCartItem {
  product_id: string;
  short_code?: string;
  name: string;
  brand?: string;
  color?: string;
  size?: string;
  unit_price_cents: number;
  qty: number;
  item_discount_pct?: number; // 0-100
  stock_available: number;
}

export interface RetailSaleClient {
  id?: string;
  name: string;
  isNew?: boolean; // Para clientes digitados livremente
}

export interface RetailPayment {
  method: string;
  amount_cents: number;
}

interface RetailSaleState {
  // Dados da venda
  client: RetailSaleClient | null;
  employee_id?: string | null;
  items: RetailCartItem[];
  payments: RetailPayment[];
  currentStep: number; // 1 = produtos, 2 = cliente, 3 = pagamento
  
  // Ações para gerenciar cliente
  setClient: (client: RetailSaleClient | null) => void;
  setEmployee: (employee_id: string | null) => void;
  setCurrentStep: (step: number) => void;
  
  // Ações para gerenciar itens
  addOrIncrementItem: (product: any, availableStock?: number) => void;
  addToCart: (productId: string, qty: number) => void;
  updateItemQty: (product_id: string, qty: number) => void;
  updateItemPrice: (product_id: string, unit_price_cents: number) => void;
  updateItemDiscount: (product_id: string, discount_pct: number) => void;
  removeItem: (product_id: string) => void;
  applyDiscountToAll: (discount_pct: number) => void;
  
  // Ações para gerenciar pagamentos
  setPayments: (payments: RetailPayment[]) => void;
  
  // Totais calculados
  getTotals: () => {
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    items_count: number;
  };
  
  // Limpar tudo
  clear: () => void;
}

// Store com persistência automática no localStorage
export const useRetailSaleStore = create<RetailSaleState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      client: null,
      employee_id: null,
      items: [],
      payments: [],
      currentStep: 1, // Começar na etapa de produtos
      
      setClient: (client) => {
        console.log('🛒 [RetailSaleStore] Cliente definido:', client);
        set({ client });
      },
      
      setEmployee: (employee_id) => {
        console.log('🛒 [RetailSaleStore] Funcionário definido:', employee_id);
        set({ employee_id });
      },
      
      setCurrentStep: (step) => {
        console.log('🛒 [RetailSaleStore] Etapa atual definida:', step);
        set({ currentStep: step });
      },
        
      addOrIncrementItem: (product, availableStock) => {
        const items = get().items;
        const existingIndex = items.findIndex(item => item.product_id === product.id);
        
        // Usar estoque disponível se fornecido, senão usar estoque físico como fallback
        const stockToUse = availableStock !== undefined ? availableStock : (product.stock || 0);
        
        if (existingIndex >= 0) {
          // Incrementa quantidade se já existe
          const newQty = items[existingIndex].qty + 1;
          if (newQty <= items[existingIndex].stock_available) {
            const newItems = items.map((item, index) =>
              index === existingIndex ? { ...item, qty: newQty } : item
            );
            console.log('🛒 [RetailSaleStore] Item incrementado:', product.name, 'Qty:', newQty);
            set({ items: newItems });
          }
        } else {
          // Adiciona novo item
          const newItem: RetailCartItem = {
            product_id: product.id,
            short_code: product.short_code,
            name: product.name,
            brand: product.brand || product.brands?.name,
            color: product.color,
            size: product.size,
            unit_price_cents: product.price_cents || Math.round((product.price || 0) * 100),
            qty: 1,
            item_discount_pct: 0,
            stock_available: stockToUse
          };
          
          if (newItem.qty <= newItem.stock_available) {
            const newItems = [...items, newItem];
            console.log('🛒 [RetailSaleStore] Item adicionado:', product.name, 'Total items:', newItems.length, 'Stock available:', stockToUse);
            set({ items: newItems });
          }
        }
      },

      addToCart: (productId: string, qty: number) => {
        const items = get().items;
        const existingIndex = items.findIndex(item => item.product_id === productId);
        
        if (existingIndex >= 0) {
          // Incrementa quantidade se já existe
          const newQty = items[existingIndex].qty + qty;
          if (newQty <= items[existingIndex].stock_available) {
            set({
              items: items.map((item, index) =>
                index === existingIndex ? { ...item, qty: newQty } : item
              )
            });
          } else {
            throw new Error(`Estoque insuficiente. Disponível: ${items[existingIndex].stock_available}`);
          }
        } else {
          throw new Error('Produto não encontrado no carrinho. Use addOrIncrementItem para adicionar novos produtos.');
        }
      },
        
      updateItemQty: (product_id, qty) => {
        if (qty <= 0) {
          // Remove item se qty for 0 ou negativo
          const newItems = get().items.filter(item => item.product_id !== product_id);
          console.log('🛒 [RetailSaleStore] Item removido:', product_id, 'Items restantes:', newItems.length);
          set({ items: newItems });
          return;
        }
        
        const newItems = get().items.map(item => {
          if (item.product_id === product_id) {
            // Limitar quantidade ao estoque disponível
            const validQty = Math.min(qty, item.stock_available);
            return { ...item, qty: validQty };
          }
          return item;
        });
        console.log('🛒 [RetailSaleStore] Quantidade atualizada:', product_id, 'Qty:', qty);
        set({ items: newItems });
      },
      
      updateItemPrice: (product_id, unit_price_cents) => {
        set({
          items: get().items.map(item =>
            item.product_id === product_id ? { ...item, unit_price_cents } : item
          )
        });
      },
      
      updateItemDiscount: (product_id, item_discount_pct) => {
        set({
          items: get().items.map(item =>
            item.product_id === product_id ? { ...item, item_discount_pct } : item
          )
        });
      },
      
      removeItem: (product_id) => {
        const newItems = get().items.filter(item => item.product_id !== product_id);
        console.log('🛒 [RetailSaleStore] Item removido:', product_id, 'Items restantes:', newItems.length);
        set({ items: newItems });
      },

      applyDiscountToAll: (discount_pct) => {
        const clampedDiscount = Math.max(0, Math.min(100, discount_pct));
        set({
          items: get().items.map(item => ({ 
            ...item, 
            item_discount_pct: clampedDiscount 
          }))
        });
      },
      
      setPayments: (payments) => {
        console.log('🛒 [RetailSaleStore] Pagamentos definidos:', payments.length);
        set({ payments });
      },
        
      getTotals: () => {
        const { items } = get();
        
        let subtotal_cents = 0;
        let discount_cents = 0;
        
        items.forEach(item => {
          const itemSubtotal = item.unit_price_cents * item.qty;
          const itemDiscountAmount = Math.round(itemSubtotal * ((item.item_discount_pct || 0) / 100));
          
          subtotal_cents += itemSubtotal;
          discount_cents += itemDiscountAmount;
        });
        
        const total_cents = subtotal_cents - discount_cents;
        
        return {
          subtotal_cents: Math.round(subtotal_cents),
          discount_cents: Math.round(discount_cents),
          total_cents: Math.round(total_cents),
          items_count: items.reduce((acc, item) => acc + item.qty, 0)
        };
      },
      
      clear: () => {
        console.log('🛒 [RetailSaleStore] Carrinho limpo');
        set({
          client: null,
          employee_id: null,
          items: [],
          payments: [],
          currentStep: 1
        });
      }
    }),
    {
      name: 'retail-sale-cart', // chave no localStorage
      partialize: (state) => ({
        client: state.client,
        employee_id: state.employee_id,
        items: state.items,
        payments: state.payments,
        currentStep: state.currentStep
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // ✅ Logs desabilitados
          // console.log('🛒 [RetailSaleStore] Estado restaurado do localStorage:', {
          //   client: state.client?.name || 'Nenhum',
          //   employee_id: state.employee_id || 'Nenhum',
          //   items_count: state.items.length,
          //   payments_count: state.payments.length,
          //   current_step: state.currentStep
          // });
        }
      }
    }
  )
);