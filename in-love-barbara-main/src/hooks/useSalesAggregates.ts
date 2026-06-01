import { useQuery } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
export interface SaleAggregateItem {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  discount_percent?: number
  products?: {
    id: string
    name: string
    short_code?: string
  } | null
}

export interface SaleAggregate {
  id: string
  client_id: string | null
  user_id: string | null
  channel: string
  status: string
  created_at: string
  closed_at: string | null
  discount_total_cents: number
  payment_summary?: any
  clients?: {
    name: string
  }
  users?: {
    name: string
  }
  sale_items: SaleAggregateItem[]
}

export interface SalesAggregatesData {
  // Loading states
  isLoading: boolean
  error: any
  
  // Filters
  channel: string
  dateRange: {
    start: Date
    end: Date
  }
  
  // Aggregated metrics
  totalSalesCount: number
  totalSalesAmount: number
  avgTicket: number
  
  // By periods
  today: {
    count: number
    amount: number
  }
  thisWeek: {
    count: number
    amount: number
  }
  thisMonth: {
    count: number
    amount: number
  }
  
  // Status counts
  draftsCount: number
  completedCount: number
  
  // Recent sales list
  recentSales: Array<{
    id: string
    created_at: string
    client_name?: string
    items_count: number
    payment_methods: string[]
    final_total: number
    status: string
  }>
  
  // Utility functions
  calculateSaleTotal: (sale: SaleAggregate) => number
  refetch: () => void
}

export function useSalesAggregates(channel: string = 'VAREJO'): SalesAggregatesData {
  
  // Calculate date ranges
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  // Query all sales for the channel
  const salesQuery = useQuery({
    queryKey: ['sales-aggregates', channel],
    queryFn: async (): Promise<SaleAggregate[]> => {
      const { data, error } = await Promise.resolve({ data: [], error: null }); // Sistema local
      
      if (error) {
        console.error('Erro ao buscar vendas agregadas:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  });

  const sales = salesQuery.data || [];

  // Helper function to calculate sale total
  const calculateSaleTotal = (sale: SaleAggregate): number => {
    const itemsTotal = sale.sale_items.reduce((acc, item) => {
      const itemTotal = item.unit_price_cents * item.qty;
      const discount = item.discount_percent ? (itemTotal * item.discount_percent / 100) : 0;
      return acc + (itemTotal - discount);
    }, 0);
    
    return Math.max(0, itemsTotal - (sale.discount_total_cents || 0));
  };

  // Filter sales by date ranges
  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= today && saleDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
  });

  const thisWeekSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= startOfWeek;
  });

  const thisMonthSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= startOfMonth;
  });

  // Calculate aggregated metrics
  const totalSalesCount = sales.length;
  const totalSalesAmount = sales.reduce((acc, sale) => acc + calculateSaleTotal(sale), 0);
  const avgTicket = totalSalesCount > 0 ? totalSalesAmount / totalSalesCount : 0;

  // Calculate period metrics
  const today_metrics = {
    count: todaySales.length,
    amount: todaySales.reduce((acc, sale) => acc + calculateSaleTotal(sale), 0)
  };

  const thisWeek_metrics = {
    count: thisWeekSales.length,
    amount: thisWeekSales.reduce((acc, sale) => acc + calculateSaleTotal(sale), 0)
  };

  const thisMonth_metrics = {
    count: thisMonthSales.length,
    amount: thisMonthSales.reduce((acc, sale) => acc + calculateSaleTotal(sale), 0)
  };

  // Status counts
  const draftsCount = sales.filter(sale => sale.status === 'RASCUNHO' || sale.status === 'DRAFT').length;
  const completedCount = sales.filter(sale => sale.status === 'FECHADA' || sale.status === 'COMPLETED').length;

  // Recent sales (last 10)
  const recentSales = sales
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(sale => ({
      id: sale.id,
      created_at: sale.created_at,
      client_name: sale.clients?.name || 'Consumidor final',
      items_count: sale.sale_items.length,
      payment_methods: sale.payment_summary?.payments?.map((p: any) => p.method) || [],
      final_total: calculateSaleTotal(sale),
      status: sale.status
    }));

  return {
    // Loading states
    isLoading: salesQuery.isLoading,
    error: salesQuery.error,
    
    // Filters
    channel,
    dateRange: {
      start: startOfMonth,
      end: now
    },
    
    // Aggregated metrics
    totalSalesCount,
    totalSalesAmount,
    avgTicket,
    
    // By periods
    today: today_metrics,
    thisWeek: thisWeek_metrics,
    thisMonth: thisMonth_metrics,
    
    // Status counts
    draftsCount,
    completedCount,
    
    // Recent sales list
    recentSales,
    
    // Utility functions
    calculateSaleTotal,
    refetch: salesQuery.refetch
  };
}