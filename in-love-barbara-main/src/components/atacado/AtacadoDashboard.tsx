import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AtacadoDashboard() {
  const { atacadoSales, calculateAtacadoMetrics } = useAtacadoSales();
  
  const metrics = calculateAtacadoMetrics();

  // Debug: verificar dados carregados
  console.log('🔍 [AtacadoDashboard] Total de vendas carregadas:', atacadoSales.length);
  console.log('🔍 [AtacadoDashboard] Primeiras vendas:', atacadoSales.slice(0, 3));
  console.log('🔍 [AtacadoDashboard] Métricas calculadas:', metrics);

  // Calcular estatísticas detalhadas
  const detailedStats = useMemo(() => {
    // Incluir vendas fechadas e rascunhos para análise de produtos
    const closedSales = atacadoSales.filter(sale => sale.status === 'FECHADA' || sale.status === 'RASCUNHO');
    
    // Debug: verificar status das vendas
    console.log('🔍 [AtacadoDashboard] Status das vendas:', atacadoSales.map(s => s.status));
    console.log('🔍 [AtacadoDashboard] Vendas para análise:', closedSales.length);
    
    // Vendas por período (últimos 7 dias) - mais recente primeiro
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i); // Começar do hoje (i=0) e ir para trás
      return date.toDateString();
    });

    const salesByDay = last7Days.map(dateStr => {
      const daySales = closedSales.filter(sale => {
        // Usar closed_at se disponível, senão created_at (mesma lógica do histórico)
        const saleDate = new Date(sale.closed_at || sale.created_at).toDateString();
        return saleDate === dateStr;
      });

      return {
        date: dateStr,
        sales: daySales.length,
        revenue: daySales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0),
        profit: daySales.reduce((sum, sale) => {
          return sum + sale.items.reduce((itemSum, item) => {
            const revenue = item.unit_price_cents * item.qty;
            const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
            const cost = productCost * item.qty;
            const profitPerUnit = (revenue - cost) / item.qty;
            return itemSum + (profitPerUnit * item.qty);
          }, 0);
        }, 0)
      };
    });

    // Debug: log das datas e vendas para verificar ordenação
    console.log('📅 [AtacadoDashboard] Datas dos últimos 7 dias:', 
      last7Days.map(dateStr => ({
        date: dateStr,
        formatted: new Date(dateStr).toLocaleDateString('pt-BR')
      }))
    );
    
    console.log('📅 [AtacadoDashboard] Vendas por dia:', 
      salesByDay.map(day => ({
        date: day.date,
        formatted: new Date(day.date).toLocaleDateString('pt-BR'),
        sales: day.sales,
        revenue: day.revenue
      }))
    );

    // Análise de produtos mais vendidos
    console.log('🔍 [AtacadoDashboard] Vendas fechadas para análise:', closedSales.length);
    console.log('🔍 [AtacadoDashboard] Items das vendas fechadas:', closedSales.map(sale => ({
      saleId: sale.id,
      status: sale.status,
      itemsCount: sale.items?.length || 0,
      items: sale.items?.map(item => ({
        productId: item.product_id,
        productName: item.product?.name,
        qty: item.qty,
        unitPrice: item.unit_price_cents
      }))
    })));
    
    const allItems = closedSales.flatMap(sale => sale.items || []);
    console.log('🔍 [AtacadoDashboard] Todos os items:', allItems);
    
    const productSales = allItems.reduce((acc, item) => {
      const productId = item.product_id;
      const productName = item.product?.name || 'Produto não encontrado';
      
      console.log('🔍 [AtacadoDashboard] Processando item:', {
        productId,
        productName,
        qty: item.qty,
        unitPrice: item.unit_price_cents,
        product: item.product
      });
      
      if (!acc[productId]) {
        acc[productId] = {
          name: productName,
          totalRevenue: 0,
          totalQuantity: 0,
          totalProfit: 0,
          sales: 0,
          averagePrice: 0
        };
      }
      
      const revenue = item.unit_price_cents * item.qty;
      const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
      const cost = productCost * item.qty;
      const profit = revenue - cost;
      
      acc[productId].totalRevenue += revenue;
      acc[productId].totalQuantity += item.qty;
      acc[productId].totalProfit += profit;
      acc[productId].sales += 1;
      
      return acc;
    }, {} as Record<string, any>);

    const topProducts = Object.values(productSales)
      .map((product: any) => ({
        ...product,
        averagePrice: product.totalQuantity > 0 ? product.totalRevenue / product.totalQuantity : 0,
        profitMargin: product.totalRevenue > 0 ? (product.totalProfit / product.totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Debug: logs para produtos mais vendidos
    console.log('🔍 [AtacadoDashboard] Vendas fechadas:', closedSales.length);
    console.log('🔍 [AtacadoDashboard] Items de vendas:', closedSales.flatMap(sale => sale.items).length);
    console.log('🔍 [AtacadoDashboard] Produtos únicos:', Object.keys(productSales).length);
    console.log('🔍 [AtacadoDashboard] Top produtos calculados:', topProducts);

    // Crescimento mensal
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthSales = closedSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    const lastMonthSales = closedSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
    });

    const revenueGrowth = lastMonthSales.length > 0 ? 
      ((thisMonthSales.length - lastMonthSales.length) / lastMonthSales.length) * 100 : 0;

    // Evolução mensal (últimos 12 meses) - mais recente primeiro
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i); // Começar do mês atual (i=0) e ir para trás
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        dateString: date.toDateString()
      };
    });

    const salesByMonth = last12Months.map(monthData => {
      const monthSales = closedSales.filter(sale => {
        // Usar closed_at se disponível, senão created_at (mesma lógica do histórico)
        const saleDate = new Date(sale.closed_at || sale.created_at);
        return saleDate.getMonth() === monthData.month && saleDate.getFullYear() === monthData.year;
      });

      const revenue = monthSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0);
      const profit = monthSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const revenue = item.unit_price_cents * item.qty;
          const productCost = item.product?.cost_price_cents || item.product?.cost_cents || 0;
          const cost = productCost * item.qty;
          const profitPerUnit = (revenue - cost) / item.qty;
          return itemSum + (profitPerUnit * item.qty);
        }, 0);
      }, 0);

      return {
        year: monthData.year,
        month: monthData.month,
        sales: monthSales.length,
        revenue,
        profit
      };
    });

    // Debug: log da evolução mensal
    console.log('📅 [AtacadoDashboard] Evolução mensal:', 
      salesByMonth.map(month => ({
        month: month.month + 1,
        year: month.year,
        formatted: new Date(month.year, month.month).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        sales: month.sales,
        revenue: month.revenue
      }))
    );

    return {
      salesByDay,
      salesByMonth,
      topProducts,
      revenueGrowth,
      thisMonthSales: thisMonthSales.length,
      lastMonthSales: lastMonthSales.length
    };
  }, [atacadoSales]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card hover:shadow-soft transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {formatPercent(detailedStats.revenueGrowth)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lucro Total
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro total das vendas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Vendas
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.totalSales}
            </div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {formatCurrency(metrics.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-soft transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Itens Vendidos
            </CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.totalItems}
            </div>
            <p className="text-xs text-muted-foreground">
              Média: {(metrics.totalItems / Math.max(metrics.totalSales, 1)).toFixed(1)} por venda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas dos Últimos 7 Dias */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Vendas dos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detailedStats.salesByDay.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium">
                      {format(new Date(day.date), 'dd/MM', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {day.sales} vendas
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(day.revenue)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(day.profit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lucro
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Top 5 Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailedStats.topProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum produto vendido ainda</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Os produtos mais vendidos aparecerão aqui conforme as vendas forem realizadas
                </p>
                {/* Debug info */}
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left">
                  <p><strong>Debug Info:</strong></p>
                  <p>Total vendas: {atacadoSales.length}</p>
                  <p>Vendas fechadas: {atacadoSales.filter(s => s.status === 'FECHADA').length}</p>
                  <p>Vendas rascunho: {atacadoSales.filter(s => s.status === 'RASCUNHO').length}</p>
                  <p>Items totais: {atacadoSales.flatMap(s => s.items || []).length}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {detailedStats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/20 to-muted/10 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Badge 
                          variant={index < 3 ? "default" : "outline"}
                          className={`text-xs font-bold ${index < 3 ? "bg-primary text-primary-foreground" : ""}`}
                        >
                          {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{product.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {product.totalQuantity} unidades
                          </span>
                          <span>•</span>
                          <span>{product.sales} vendas</span>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">
                            {product.profitMargin.toFixed(1)}% margem
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(product.totalRevenue)}
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        +{formatCurrency(product.totalProfit)} lucro
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Resumo dos top produtos */}
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Receita total dos top 5:</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(detailedStats.topProducts.reduce((sum, product) => sum + product.totalRevenue, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Lucro total dos top 5:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(detailedStats.topProducts.reduce((sum, product) => sum + product.totalProfit, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Unidades vendidas:</span>
                    <span className="font-semibold text-primary">
                      {detailedStats.topProducts.reduce((sum, product) => sum + product.totalQuantity, 0)} unidades
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolução Mensal (Últimos 12 Meses) */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Evolução Mensal (Últimos 12 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detailedStats.salesByMonth.map((month, index) => (
                <div key={`${month.year}-${month.month}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium">
                      {format(new Date(month.year, month.month), 'MMM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Performance */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {detailedStats.thisMonthSales}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Vendas Este Mês
              </div>
              <div className="flex items-center justify-center text-xs">
                {detailedStats.revenueGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                <span className={detailedStats.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatPercent(detailedStats.revenueGrowth)} vs mês anterior
                </span>
              </div>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(metrics.averageOrderValue)}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Ticket Médio
              </div>
              <div className="text-xs text-muted-foreground">
                Por venda de atacado
              </div>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {formatCurrency(metrics.totalSales > 0 ? metrics.totalProfit / metrics.totalSales : 0)}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Lucro Médio por Venda
              </div>
              <div className="text-xs text-muted-foreground">
                Valor médio de lucro
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
