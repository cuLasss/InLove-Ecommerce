import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Users,
  Package,
  DollarSign,
  Zap,
  Award,
  AlertTriangle
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AtacadoAdvancedAnalytics() {
  const { atacadoSales } = useAtacadoSales();

  // Análise avançada de performance
  const advancedAnalytics = useMemo(() => {
    const closedSales = atacadoSales.filter(sale => sale.status === 'FECHADA');
    
    // Análise de tendências mensais
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthSales = closedSales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        const saleMonthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        return saleMonthKey === monthKey;
      });

      const monthRevenue = monthSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0);
      const monthProfit = monthSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const revenue = item.unit_price_cents * item.qty;
          // Get cost from product if available
          const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
          const cost = productCost * item.qty;
          return itemSum + (revenue - cost);
        }, 0);
      }, 0);

      return {
        month: monthKey,
        monthName: format(date, 'MMM/yyyy', { locale: ptBR }),
        sales: monthSales.length,
        revenue: monthRevenue,
        profit: monthProfit,
        margin: monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0
      };
    }).reverse();

    // Análise de sazonalidade
    const seasonalAnalysis = Array.from({ length: 12 }, (_, i) => {
      const monthSales = closedSales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate.getMonth() === i;
      });

      return {
        month: i,
        monthName: format(new Date(2024, i, 1), 'MMM', { locale: ptBR }),
        avgSales: monthSales.length / Math.max(closedSales.length > 0 ? Math.ceil(closedSales.length / 12) : 1, 1),
        avgRevenue: monthSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0) / Math.max(monthSales.length, 1)
      };
    });

    // Análise de clientes VIP
    const clientAnalysis = closedSales
      .filter(sale => sale.client)
      .reduce((acc, sale) => {
        const clientId = sale.client!.id;
        if (!acc[clientId]) {
          acc[clientId] = {
            client: sale.client,
            totalSales: 0,
            totalRevenue: 0,
            totalProfit: 0,
            avgOrderValue: 0,
            lastPurchase: sale.created_at
          };
        }
        
        acc[clientId].totalSales += 1;
        acc[clientId].totalRevenue += (sale.total_cents || 0);
        acc[clientId].totalProfit += sale.items.reduce((sum, item) => {
          const revenue = item.unit_price_cents * item.qty;
          const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
          const cost = productCost * item.qty;
          return sum + (revenue - cost);
        }, 0);
        
        if (new Date(sale.created_at) > new Date(acc[clientId].lastPurchase)) {
          acc[clientId].lastPurchase = sale.created_at;
        }
        
        return acc;
      }, {} as Record<string, any>);

    // Calcular valores médios
    Object.values(clientAnalysis).forEach((client: any) => {
      client.avgOrderValue = client.totalRevenue / client.totalSales;
    });

    const vipClients = Object.values(clientAnalysis)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Análise de produtos estrela
    const productAnalysis = closedSales
      .flatMap(sale => sale.items)
      .reduce((acc, item) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            product: item.product,
            totalQuantity: 0,
            totalRevenue: 0,
            totalProfit: 0,
            sales: 0,
            avgMargin: 0
          };
        }
        
        acc[productId].totalQuantity += item.qty;
        acc[productId].totalRevenue += (item.unit_price_cents * item.qty);
        const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
        acc[productId].totalProfit += ((item.unit_price_cents * item.qty) - (productCost * item.qty));
        acc[productId].sales += 1;
        
        return acc;
      }, {} as Record<string, any>);

    // Calcular margem média
    Object.values(productAnalysis).forEach((product: any) => {
      product.avgMargin = product.totalRevenue > 0 ? (product.totalProfit / product.totalRevenue) * 100 : 0;
    });

    const starProducts = Object.values(productAnalysis)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Métricas de crescimento
    const currentMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    
    const revenueGrowth = previousMonth && previousMonth.revenue > 0 ? 
      ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100 : 0;
    
    const salesGrowth = previousMonth && previousMonth.sales > 0 ? 
      ((currentMonth.sales - previousMonth.sales) / previousMonth.sales) * 100 : 0;

    return {
      monthlyData,
      seasonalAnalysis,
      vipClients,
      starProducts,
      revenueGrowth,
      salesGrowth,
      currentMonth,
      previousMonth
    };
  }, [atacadoSales]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Métricas de Crescimento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crescimento de Receita
            </CardTitle>
            {getGrowthIcon(advancedAnalytics.revenueGrowth)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGrowthColor(advancedAnalytics.revenueGrowth)}`}>
              {advancedAnalytics.revenueGrowth >= 0 ? '+' : ''}{advancedAnalytics.revenueGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crescimento de Vendas
            </CardTitle>
            {getGrowthIcon(advancedAnalytics.salesGrowth)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getGrowthColor(advancedAnalytics.salesGrowth)}`}>
              {advancedAnalytics.salesGrowth >= 0 ? '+' : ''}{advancedAnalytics.salesGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Performance Atual
            </CardTitle>
            <Award className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {advancedAnalytics.currentMonth?.margin?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Margem média atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análise Mensal */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Evolução Mensal (Últimos 12 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {advancedAnalytics.monthlyData.slice(-6).map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="font-medium text-sm">{month.monthName}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {month.sales} vendas
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(month.revenue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(month.profit)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lucro
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600">
                      {month.margin.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Margem
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clientes VIP e Produtos Estrela */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes VIP */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Clientes VIP Atacado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {advancedAnalytics.vipClients.slice(0, 5).map((client: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={index < 3 ? "default" : "outline"}
                      className={index < 3 ? "bg-primary text-primary-foreground" : ""}
                    >
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{client.client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.totalSales} vendas • Última: {format(new Date(client.lastPurchase), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(client.totalRevenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ticket médio: {formatCurrency(client.avgOrderValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Estrela */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos Estrela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {advancedAnalytics.starProducts.slice(0, 5).map((product: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={index < 3 ? "default" : "outline"}
                      className={index < 3 ? "bg-primary text-primary-foreground" : ""}
                    >
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">{product.product?.name || 'Produto não encontrado'}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.totalQuantity} unidades • {product.sales} vendas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatCurrency(product.totalRevenue)}
                    </div>
                    <div className="text-xs text-green-600">
                      {product.avgMargin.toFixed(1)}% margem
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Sazonalidade */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Análise de Sazonalidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {advancedAnalytics.seasonalAnalysis.map((season, index) => (
              <div key={index} className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium mb-1">{season.monthName}</div>
                <div className="text-lg font-bold text-primary">
                  {season.avgSales.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  vendas/mês
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {formatCurrency(season.avgRevenue)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
