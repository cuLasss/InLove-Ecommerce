import { useState, useCallback } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useRetailSaleStore } from "@/stores/retailSaleStore";
import { useToast } from "@/hooks/use-toast";
import { useStockQuery } from "@/hooks/useStockQuery";

export interface CurrentItem {
  productId: string;
  code: string;
  name: string;
  price: number;
  supplier?: string;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
}

export function useCurrentItem() {
  const [currentItem, setCurrentItem] = useState<CurrentItem | null>(null);
  const [availableServer, setAvailableServer] = useState<number>(0);
  const { findProductByCode } = useProducts();
  const { items, addOrIncrementItem, updateItemQty } = useRetailSaleStore();
  const { toast } = useToast();
  const { getAvailableStock } = useStockQuery();

  // Buscar item atual no carrinho
  const currentQty = currentItem 
    ? items.find(item => item.product_id === currentItem.productId)?.qty || 0
    : 0;

  // Calcular estoque disponível na sessão
  const availableSession = Math.max(0, availableServer - currentQty);

  const recompute = useCallback(async (productId: string) => {
    const stock = await getAvailableStock(productId);
    setAvailableServer(stock);
  }, [getAvailableStock]);

  const setByCode = useCallback(async (code: string) => {
    // Se é o mesmo código, ignorar
    if (currentItem?.code === code) return false;

    try {
      // Resolver no servidor SEM cache (aceitar: short_code | id | qr_code | "inlove_product:<short>")
      let product = findProductByCode(code);
      
      // FALLBACK DIRETO AO SUPABASE se não encontrar
      if (!product) {
        toast({
          title: "❌ Código não encontrado",
          description: code,
          variant: "destructive"
        });
        return false;
      }

      const newCurrentItem: CurrentItem = {
        productId: product.id,
        code: code,
        name: product.name,
        price: product.price_cents || Math.round((product.price || 0) * 100),
        supplier: product.suppliers?.name,
        category: product.categories?.name,
        brand: product.brands?.name || product.brand,
        color: product.color,
        size: product.size
      };

      setCurrentItem(newCurrentItem);
      await recompute(product.id);

      toast({
        title: "📦 Item selecionado",
        description: product.name,
      });

      return true;
    } catch (error) {
      toast({
        title: "❌ Erro ao buscar produto",
        description: "Tente novamente",
        variant: "destructive"
      });
      return false;
    }
  }, [currentItem?.code, findProductByCode, toast, recompute]);

  const addOne = useCallback(async () => {
    if (!currentItem) return;
    if (availableSession <= 0) throw new Error("Sem estoque");
    
    // Upsert mesma linha por productId
    const product = {
      id: currentItem.productId,
      name: currentItem.name,
      price_cents: currentItem.price,
      brand: currentItem.brand,
      color: currentItem.color,
      size: currentItem.size,
      stock: availableServer
    };

    addOrIncrementItem(product);
    await recompute(currentItem.productId);
    navigator.vibrate?.(30);
  }, [currentItem, availableSession, availableServer, addOrIncrementItem, recompute]);

  const removeOne = useCallback(async () => {
    if (!currentItem) return;
    if (currentQty <= 0) return;
    
    // Decrementa, remove se qty==0
    updateItemQty(currentItem.productId, currentQty - 1);
    await recompute(currentItem.productId);
    navigator.vibrate?.(15);
  }, [currentItem, currentQty, updateItemQty, recompute]);

  return { 
    currentItem, 
    setByCode,
    setCurrentItemByCode: setByCode, // backward compatibility
    addOne, 
    removeOne, 
    currentQty,
    currentQtyInCart: currentQty, // backward compatibility
    availableServer, 
    availableSession,
    canAddMore: availableSession > 0,
    canRemove: currentQty > 0
  };
}