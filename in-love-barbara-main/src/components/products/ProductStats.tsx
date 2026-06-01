import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, AlertTriangle, Package, ShoppingCart, Truck } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ProductStatsProps {
  products: any[]
  consignedProductIds?: Set<string>
  onFilterClick?: (filter: 'low_stock' | 'no_stock' | 'in_stock' | 'consigned' | null) => void
}

export function ProductStats({ products, consignedProductIds, onFilterClick }: ProductStatsProps) {
  // Calcular estatísticas dos produtos baseadas nos dados reais
  const safeProducts = products || [];
  const totalProducts = safeProducts.length;


  // Função para obter estoque atual (usar 'stock' como estoque principal)
  const getCurrentStock = (product: any) => {
    // CORREÇÃO: Para exibição geral, usar 'stock' como estoque principal
    return product.stock || 0;
  };

  // Função para obter estoque mínimo
  const getMinStock = (product: any) => {
    return product.stock_min !== undefined ? product.stock_min : (product.min_stock || 5);
  };

  // Função para obter preço de custo
  const getCostPrice = (product: any) => {
    if (product.cost_price_cents) return product.cost_price_cents / 100;
    if (product.cost_cents) return product.cost_cents / 100;
    return product.cost_price || 0;
  };

  // Calcular estatísticas
  const lowStockProducts = safeProducts.filter(p => {
    const currentStock = getCurrentStock(p);
    const minStock = getMinStock(p);
    return currentStock > 0 && currentStock <= minStock;
  }).length;

  const outOfStockProducts = safeProducts.filter(p => getCurrentStock(p) === 0).length;

  const inStockProducts = safeProducts.filter(p => {
    const currentStock = getCurrentStock(p);
    const minStock = getMinStock(p);
    return currentStock > minStock;
  }).length;

  // Calcular valor total do estoque
  const totalValue = safeProducts.reduce((sum, product) => {
    const currentStock = getCurrentStock(product);
    const costPrice = getCostPrice(product);
    return sum + (currentStock * costPrice);
  }, 0);

  // Calcular produtos consignados baseado nos IDs fornecidos
  const consignedProductsCount = consignedProductIds ? 
    safeProducts.filter(p => consignedProductIds.has(p.id)).length : 
    safeProducts.filter(p => (p.stock_consigned || 0) > 0).length;


  const stats = [
    {
      title: "Total de Produtos",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      filter: null,
    } as const,
    {
      title: "Em Estoque",
      value: inStockProducts,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      filter: 'in_stock' as const,
    },
    {
      title: "Estoque Baixo",
      value: lowStockProducts,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      filter: 'low_stock' as const,
    },
    {
      title: "Sem Estoque",
      value: outOfStockProducts,
      icon: ShoppingCart,
      color: "text-red-600",
      bgColor: "bg-red-50",
      filter: 'no_stock' as const,
    },
    {
      title: "Consignados",
      value: consignedProductsCount,
      icon: Truck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      filter: 'consigned' as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 tablet:grid-cols-3 desktop:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-2 md:gap-2.5 tablet:gap-2.5 desktop:gap-3 xl:gap-3 2xl:gap-4 mb-4 sm:mb-6">
      {stats.map((stat, index) => (
        <Card 
          key={index} 
          className={`cursor-pointer hover:shadow-md transition-shadow overflow-visible h-full flex ${
            onFilterClick ? 'hover:bg-gray-50' : ''
          }`}
          onClick={() => onFilterClick?.(stat.filter)}
        >
          <CardContent className="p-2.5 sm:p-2.5 md:p-3 tablet:p-3 desktop:p-3.5 xl:p-3.5 2xl:p-4 w-full flex flex-col">
            <div className="flex items-start justify-between gap-1.5 sm:gap-2 md:gap-2 tablet:gap-2.5 desktop:gap-2.5 xl:gap-2.5 2xl:gap-3">
              <div className="min-w-0 flex-1 overflow-hidden flex flex-col">
                <div className="min-h-[32px] sm:min-h-[36px] md:min-h-[38px] tablet:min-h-[40px] desktop:min-h-[42px] xl:min-h-[42px] 2xl:min-h-[44px] mb-2 sm:mb-2 md:mb-2 tablet:mb-2.5 desktop:mb-2.5 xl:mb-2.5 2xl:mb-3 flex items-start">
                  <p className="text-[10px] sm:text-[11px] md:text-xs tablet:text-xs desktop:text-xs xl:text-xs 2xl:text-sm font-medium text-gray-600 leading-[1.4] break-words whitespace-normal">{stat.title}</p>
                </div>
                <p className="text-sm sm:text-base md:text-lg tablet:text-lg desktop:text-xl xl:text-xl 2xl:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-1.5 sm:p-1.5 md:p-1.5 tablet:p-1.5 desktop:p-1.5 xl:p-2 2xl:p-2 rounded-lg ${stat.bgColor} flex-shrink-0 self-start`}>
                <stat.icon className={`h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 tablet:h-4 tablet:w-4 desktop:h-4 desktop:w-4 xl:h-4 xl:w-4 2xl:h-5 2xl:w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
