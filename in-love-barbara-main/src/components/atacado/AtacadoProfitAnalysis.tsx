import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Target,
  DollarSign,
  Package,
  BarChart3
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';

export function AtacadoProfitAnalysis() {
  const { atacadoSales } = useAtacadoSales();

  // Análise detalhada de lucro
  const profitAnalysis = useMemo(() => {
    const closedSales = atacadoSales.filter(sale => sale.status === 'FECHADA');
    
    // Análise por produto
    const productAnalysis = closedSales
      .flatMap(sale => sale.items)
      .reduce((acc, item) => {
        const productId = item.product_id;
        const productName = item.product?.name || 'Produto não encontrado';
        
        if (!acc[productId]) {
          acc[productId] = {
            name: productName,
            totalQuantity: 0,
            totalRevenue: 0,
            totalProfit: 0,
            sales: 0
          };
        }
        
        const revenue = item.unit_price_cents * item.qty;
        const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
        const cost = productCost * item.qty;
        const profit = revenue - cost;
        
        acc[productId].totalQuantity += item.qty;
        acc[productId].totalRevenue += revenue;
        acc[productId].totalProfit += profit;
        acc[productId].sales += 1;
        
        return acc;
      }, {} as Record<string, any>);

    const productStats = Object.values(productAnalysis)
      .map((product: any) => ({
        ...product,
        averageProfitPerUnit: product.totalQuantity > 0 ? product.totalProfit / product.totalQuantity : 0
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit);

    // Totais gerais
    const totalRevenue = closedSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0);
    const totalProfit = closedSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const revenue = item.unit_price_cents * item.qty;
        const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
        const cost = productCost * item.qty;
        const profitPerUnit = (revenue - cost) / item.qty;
        return itemSum + (profitPerUnit * item.qty);
      }, 0);
    }, 0);

    return {
      productStats,
      totalRevenue,
      totalProfit,
      totalSales: closedSales.length
    };
  }, [atacadoSales]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(profitAnalysis.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              De {profitAnalysis.totalSales} vendas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro Total
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(profitAnalysis.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro absoluto
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produtos Analisados
            </CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {profitAnalysis.productStats.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Produtos únicos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos por Lucro */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Top Produtos por Lucro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profitAnalysis.productStats.slice(0, 10).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={index < 3 ? "default" : "outline"}
                    className={index < 3 ? "bg-primary text-primary-foreground" : ""}
                  >
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.totalQuantity} unidades • {product.sales} vendas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">
                    {formatCurrency(product.totalProfit)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(product.averageProfitPerUnit)}/unidade
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}