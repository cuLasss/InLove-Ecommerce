import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  Handshake,
  Package,
  Eye,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  Users,
  User,
  FileText
} from "lucide-react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { useSalesOptimized as useSales, SaleWithDetails } from "@/hooks/useSalesOptimized"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { SaleDetailsDrawer } from "@/components/retail/SaleDetailsDrawer"
import { ConsignacaoSaleDetailsModal } from "@/components/consignado/ConsignacaoSaleDetailsModal"
import { useDebounce } from "@/hooks/use-debounce"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import jsPDF from 'jspdf'

interface FinancialSummary {
  totalSales: number
  totalValue: number
  paidValue: number
  pendingValue: number
  salesByChannel: {
    varejo: { count: number, value: number }
    atacado: { count: number, value: number }
    consignado: { count: number, value: number }
  }
  paymentStatus: {
    paid: number
    pending: number
    partial: number
  }
}

interface ChartData {
  name: string
  value: number
  count?: number
  color?: string
}

interface SalesByPeriod {
  period: string
  sales: number
  revenue: number
}

interface TopClient {
  name: string
  totalSales: number
  totalValue: number
  lastPurchase: string
}

interface SalesBySeller {
  seller: string
  totalSales: number
  totalValue: number
  averageTicket: number
}

import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function Financeiro() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Financeiro')
  
  const pageStartTime = useRef<number>(Date.now())
  const processedSalesLogRef = useRef<number>(0)
  const filterLogRef = useRef<string>('')
  const summaryLogRef = useRef<number>(0)
  
  const { sales, isLoading: salesLoading, refreshSales } = useSales();
  
  // ✅ OTIMIZAÇÃO: Log apenas quando sales mudarem significativamente
  useEffect(() => {
    if (!salesLoading && sales.length > 0) {
      const loadTime = Date.now() - pageStartTime.current
      if (loadTime > 1000) { // Só logar se demorar mais de 1s
        console.log(`✅ [Financeiro] Vendas carregadas:`, {
          count: sales.length,
          loadTime: `${loadTime}ms`,
          source: loadTime < 2000 ? 'cache' : 'network'
        })
      }
    }
  }, [salesLoading, sales.length])
  
  // ✅ OTIMIZAÇÃO: Removido refresh forçado - o cache do React Query já gerencia isso
  // Se houver necessidade de refresh, pode ser feito manualmente ou via eventos
  
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    channel: 'ALL',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
    paymentStatus: 'ALL'
  });

  // Report filters
  const [reportFilters, setReportFilters] = useState({
    period: '30', // days
    reportType: 'overview'
  });

  // Debounce filters para evitar travamentos
  const debouncedFilters = useDebounce(filters, 300);

  const { toast } = useToast();

  // Escutar evento de venda finalizada para atualizar automaticamente
  useEffect(() => {
    const handleSaleCompleted = async (event: CustomEvent) => {
      console.log('🔄 [Financeiro] Nova venda detectada, atualizando lista...', event.detail);
      await refreshSales();
      console.log('✅ [Financeiro] Lista atualizada com sucesso');
    };

    const handleConsignacaoPaymentAdded = async (event: CustomEvent) => {
      console.log('💰 [Financeiro] Novo pagamento de consignação detectado, atualizando lista...', event.detail);
      await refreshSales();
      console.log('✅ [Financeiro] Lista atualizada com pagamento de consignação');
    };

    window.addEventListener('saleCompleted', handleSaleCompleted as EventListener);
    window.addEventListener('consignacaoPaymentAdded', handleConsignacaoPaymentAdded as EventListener);
    
    return () => {
      window.removeEventListener('saleCompleted', handleSaleCompleted as EventListener);
      window.removeEventListener('consignacaoPaymentAdded', handleConsignacaoPaymentAdded as EventListener);
    };
  }, [refreshSales])

  // Process sales to add client_name, user_name, payment_status, paid_amount_cents, pending_amount_cents
  // Memoizado com dependência apenas em sales para evitar recálculos desnecessários
  const processedSales = useMemo(() => {
    // ✅ OTIMIZAÇÃO: Log apenas uma vez quando houver mudança significativa
    if (processedSalesLogRef.current === 0 || processedSalesLogRef.current !== sales.length) {
      console.log('🔄 [Financeiro] Processando vendas...', sales.length);
      processedSalesLogRef.current = sales.length
    }
    return sales.map(sale => {
      // CORREÇÃO: Usar total_cents se disponível, senão calcular a partir dos itens
      let totalAmount = 0;
      if (sale.total_cents !== undefined) {
        totalAmount = sale.total_cents;
      } else {
        // Fallback: calcular a partir dos itens
        totalAmount = sale.items?.reduce((sum, item) => {
          const itemTotal = item.unit_price_cents * item.qty;
          const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
          return sum + (itemTotal - discountAmount);
        }, 0) || 0;
      }
      
      const paidAmount = sale.payments?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;
      const pendingAmount = Math.max(0, totalAmount - paidAmount);

      let paymentStatus = 'PENDENTE';
      if (totalAmount === 0) {
        paymentStatus = 'SEM_VALOR';
      } else if (paidAmount >= totalAmount) {
        paymentStatus = 'PAGO';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        paymentStatus = 'PARCIAL';
      }

      return {
        ...sale,
        client_name: sale.client?.name || sale.cliente_name || 'Consumidor final',
        user_name: sale.user?.name || 'Sistema',
        payment_status: paymentStatus,
        paid_amount_cents: paidAmount,
        pending_amount_cents: pendingAmount,
        total_cents: totalAmount,
        // ✅ NOVA FUNCIONALIDADE: Dados específicos de consignação
        folha_codigo: sale.folha_codigo || null,
        tipo: sale.tipo || 'varejo',
        comissao_cents: sale.comissao_cents || 0,
        valor_liquido_cents: sale.valor_liquido_cents || totalAmount
      };
    });
  }, [sales]);

  // Aplicar filtros com debounce para evitar travamentos
  const filteredSales = useMemo(() => {
    // ✅ OTIMIZAÇÃO: Log apenas quando filtros mudarem significativamente
    const currentFilters = JSON.stringify(debouncedFilters)
    if (filterLogRef.current !== currentFilters) {
      console.log('🔍 [Financeiro] Aplicando filtros...', debouncedFilters);
      filterLogRef.current = currentFilters
    }
    let filtered = processedSales;

    // Apply channel filter
    if (debouncedFilters.channel !== 'ALL') {
      filtered = filtered.filter(sale => {
        // ✅ CORREÇÃO: Filtrar por canal incluindo consignação
        if (debouncedFilters.channel === 'CONSIGNADO') {
          return sale.tipo === 'consignacao' || sale.channel === 'CONSIGNADO'
        }
        return sale.channel === debouncedFilters.channel
      });
    }

    // Apply status filter
    if (debouncedFilters.status !== 'ALL') {
      filtered = filtered.filter(sale => sale.status === debouncedFilters.status);
    }

    // Apply date filters
    if (debouncedFilters.dateFrom) {
      const fromDate = new Date(debouncedFilters.dateFrom);
      filtered = filtered.filter(sale => {
        // ✅ CORREÇÃO: Para consignações, usar data do pagamento (closed_at)
        // Para outras vendas, usar data da criação (created_at)
        const saleDate = new Date(sale.closed_at || sale.created_at);
        return saleDate >= fromDate;
      });
    }
    if (debouncedFilters.dateTo) {
      const toDate = new Date(debouncedFilters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(sale => {
        // ✅ CORREÇÃO: Para consignações, usar data do pagamento (closed_at)
        // Para outras vendas, usar data da criação (created_at)
        const saleDate = new Date(sale.closed_at || sale.created_at);
        return saleDate <= toDate;
      });
    }

    // Apply payment status filter
    if (debouncedFilters.paymentStatus !== 'ALL') {
      filtered = filtered.filter(sale => sale.payment_status === debouncedFilters.paymentStatus);
    }

    // Sort by date - most recent first (descending order)
    filtered = filtered.sort((a, b) => {
      // ✅ CORREÇÃO: Para consignações, usar data do pagamento (closed_at)
      // Para outras vendas, usar data da criação (created_at)
      const dateA = new Date(a.closed_at || a.created_at).getTime();
      const dateB = new Date(b.closed_at || b.created_at).getTime();
      return dateB - dateA; // Mais recente primeiro
    });

    console.log('✅ [Financeiro] Filtros aplicados:', filtered.length, 'vendas');
    return filtered;
  }, [processedSales, debouncedFilters]);

  // Calculate financial summary - memoizado para evitar recálculos desnecessários
  const summary: FinancialSummary = useMemo(() => {
    // ✅ OTIMIZAÇÃO: Log apenas quando houver mudança significativa
    if (summaryLogRef.current !== filteredSales.length) {
      console.log('📊 [Financeiro] Calculando resumo financeiro...', filteredSales.length);
      summaryLogRef.current = filteredSales.length
    }
    const initialSummary: FinancialSummary = {
      totalSales: 0,
      totalValue: 0,
      paidValue: 0,
      pendingValue: 0,
      salesByChannel: {
        varejo: { count: 0, value: 0 },
        atacado: { count: 0, value: 0 },
        consignado: { count: 0, value: 0 },
      },
      paymentStatus: {
        paid: 0,
        pending: 0,
        partial: 0,
      },
    };

    return filteredSales.reduce((acc, sale) => {
      acc.totalSales++;

      const totalAmount = sale.total_cents;
      const paidAmount = sale.paid_amount_cents;

      acc.totalValue += totalAmount;
      acc.paidValue += paidAmount;
      acc.pendingValue += Math.max(0, totalAmount - paidAmount);

      if (sale.channel === 'VAREJO') {
        acc.salesByChannel.varejo.count++;
        acc.salesByChannel.varejo.value += totalAmount;
      } else if (sale.channel === 'ATACADO') {
        acc.salesByChannel.atacado.count++;
        acc.salesByChannel.atacado.value += totalAmount;
      } else if (sale.channel === 'CONSIGNADO') {
        acc.salesByChannel.consignado.count++;
        acc.salesByChannel.consignado.value += totalAmount;
      }

      if (sale.payment_status === 'PAGO') {
        acc.paymentStatus.paid++;
      } else if (sale.payment_status === 'PENDENTE') {
        acc.paymentStatus.pending++;
      } else if (sale.payment_status === 'PARCIAL') {
        acc.paymentStatus.partial++;
      }

      return acc;
    }, initialSummary);
  }, [filteredSales]);

  // Helper functions memoizadas para evitar recriações desnecessárias
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data inválida';
    }
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      channel: 'ALL',
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      paymentStatus: 'ALL'
    });
  }, []);

  const getPaymentStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'PAGO':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDENTE':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PARCIAL':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const getPaymentStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'PAGO':
        return 'text-green-600';
      case 'PENDENTE':
        return 'text-yellow-600';
      case 'PARCIAL':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  const getChannelIcon = useCallback((channel: string) => {
    switch (channel) {
      case 'VAREJO':
        return <ShoppingCart className="h-4 w-4" />;
      case 'ATACADO':
        return <Package className="h-4 w-4" />;
      case 'CONSIGNADO':
        return <Handshake className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false)
    setSelectedSaleId(null)
  }, [])

  // ✅ NOVA FUNCIONALIDADE: Determinar se é venda de consignação
  const isConsignacaoSale = useCallback((saleId: string | null) => {
    if (!saleId) return false
    const sale = processedSales.find(s => s.id === saleId)
    return sale?.tipo === 'consignacao' || sale?.folha_codigo
  }, [processedSales])

  const handleSaleDeleted = useCallback(() => {
    refreshSales()
  }, [refreshSales]);

  // ✅ OTIMIZAÇÃO: Memoizar chartData para evitar recálculos desnecessários
  const chartData = useMemo(() => {
    const days = parseInt(reportFilters.period);
    
    // 1. Criar array de datas dos últimos N dias
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push({
        date: date,
        dateKey: date.toISOString().split('T')[0], // YYYY-MM-DD
        formatted: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      });
    }
    
    // 2. Processar cada venda e determinar a data correta
    const salesByDate: { [key: string]: { sales: number, revenue: number } } = {};
    
    // Inicializar todas as datas com zero
    dates.forEach(d => {
      salesByDate[d.dateKey] = { sales: 0, revenue: 0 };
    });
    
    // 3. Processar vendas
    processedSales.forEach(sale => {
      // ✅ LÓGICA: Determinar data correta baseada no tipo
      let saleDate: Date;
      
      if (sale.tipo === 'consignacao' && sale.closed_at) {
        saleDate = new Date(sale.closed_at);
      } else if (sale.closed_at) {
        saleDate = new Date(sale.closed_at);
      } else {
        saleDate = new Date(sale.created_at);
      }
      
      // Extrair apenas a parte da data (YYYY-MM-DD)
      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, '0');
      const day = String(saleDate.getDate()).padStart(2, '0');
      const saleDateKey = `${year}-${month}-${day}`;
      
      // Adicionar ao dia correto
      if (salesByDate[saleDateKey]) {
        salesByDate[saleDateKey].sales += 1;
        salesByDate[saleDateKey].revenue += sale.total_cents;
      }
    });
    
    // 4. Converter para formato do gráfico
    return dates.map(d => ({
      period: d.formatted,
      sales: salesByDate[d.dateKey].sales,
      revenue: salesByDate[d.dateKey].revenue
    })).reverse(); // Mais recente primeiro
  }, [processedSales, reportFilters.period]);

  // ✅ OTIMIZAÇÃO: Função wrapper para manter compatibilidade
  const getSalesByPeriod = useCallback((days: number): SalesByPeriod[] => {
    // Se o período solicitado for diferente do atual, recalcular
    if (parseInt(reportFilters.period) !== days) {
      // Recalcular apenas se necessário (caso raro)
      const dates = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push({
          date: date,
          dateKey: date.toISOString().split('T')[0],
          formatted: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        });
      }
      
      const salesByDate: { [key: string]: { sales: number, revenue: number } } = {};
      dates.forEach(d => {
        salesByDate[d.dateKey] = { sales: 0, revenue: 0 };
      });
      
      processedSales.forEach(sale => {
        let saleDate: Date;
        if (sale.tipo === 'consignacao' && sale.closed_at) {
          saleDate = new Date(sale.closed_at);
        } else if (sale.closed_at) {
          saleDate = new Date(sale.closed_at);
        } else {
          saleDate = new Date(sale.created_at);
        }
        
        const year = saleDate.getFullYear();
        const month = String(saleDate.getMonth() + 1).padStart(2, '0');
        const day = String(saleDate.getDate()).padStart(2, '0');
        const saleDateKey = `${year}-${month}-${day}`;
        
        if (salesByDate[saleDateKey]) {
          salesByDate[saleDateKey].sales += 1;
          salesByDate[saleDateKey].revenue += sale.total_cents;
        }
      });
      
      return dates.map(d => ({
        period: d.formatted,
        sales: salesByDate[d.dateKey].sales,
        revenue: salesByDate[d.dateKey].revenue
      })).reverse();
    }
    
    // Retornar dados memoizados se o período corresponder
    return chartData;
  }, [processedSales, reportFilters.period, chartData]);

  const getTopClients = useCallback((limit: number = 10): TopClient[] => {
    const clientMap: { [key: string]: TopClient } = {};

    processedSales.forEach(sale => {
      const clientName = sale.client_name;
      if (!clientMap[clientName]) {
        clientMap[clientName] = {
          name: clientName,
          totalSales: 0,
          totalValue: 0,
          lastPurchase: sale.created_at
        };
      }
      clientMap[clientName].totalSales += 1;
      clientMap[clientName].totalValue += sale.total_cents;
      if (new Date(sale.created_at) > new Date(clientMap[clientName].lastPurchase)) {
        clientMap[clientName].lastPurchase = sale.created_at;
      }
    });

    return Object.values(clientMap)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }, [processedSales]);

  const getSalesBySeller = useCallback((): SalesBySeller[] => {
    const sellerMap: { [key: string]: SalesBySeller } = {};

    processedSales.forEach(sale => {
      const sellerName = sale.user_name;
      if (!sellerMap[sellerName]) {
        sellerMap[sellerName] = {
          seller: sellerName,
          totalSales: 0,
          totalValue: 0,
          averageTicket: 0
        };
      }
      sellerMap[sellerName].totalSales += 1;
      sellerMap[sellerName].totalValue += sale.total_cents;
    });

    return Object.values(sellerMap).map(seller => ({
      ...seller,
      averageTicket: seller.totalSales > 0 ? seller.totalValue / seller.totalSales : 0
    })).sort((a, b) => b.totalValue - a.totalValue);
  }, [processedSales]);

  const getChannelData = useCallback((): ChartData[] => {
    return [
      {
        name: 'Varejo',
        value: summary.salesByChannel.varejo.value,
        count: summary.salesByChannel.varejo.count,
        color: '#8884d8'
      },
      {
        name: 'Atacado',
        value: summary.salesByChannel.atacado.value,
        count: summary.salesByChannel.atacado.count,
        color: '#82ca9d'
      },
      {
        name: 'Consignado',
        value: summary.salesByChannel.consignado.value,
        count: summary.salesByChannel.consignado.count,
        color: '#ffc658'
      }
    ];
  }, [summary]);

  const getPaymentStatusData = useCallback((): ChartData[] => {
    return [
      {
        name: 'Pago',
        value: summary.paymentStatus.paid,
        color: '#10b981'
      },
      {
        name: 'Pendente',
        value: summary.paymentStatus.pending,
        color: '#f59e0b'
      },
      {
        name: 'Parcial',
        value: summary.paymentStatus.partial,
        color: '#ef4444'
      }
    ];
  }, [summary]);

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(20);
    doc.text('Relatório Financeiro', pageWidth / 2, 20, { align: 'center' });
    
    // Data de geração
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 30, { align: 'center' });
    
    // Resumo
    doc.setFontSize(16);
    doc.text('Resumo Geral', 20, 50);
    
    doc.setFontSize(12);
    doc.text(`Total de Vendas: ${summary.totalSales}`, 20, 65);
    doc.text(`Valor Total: ${formatCurrency(summary.totalValue)}`, 20, 75);
    doc.text(`Valor Recebido: ${formatCurrency(summary.paidValue)}`, 20, 85);
    doc.text(`Valor Pendente: ${formatCurrency(summary.pendingValue)}`, 20, 95);
    
    // Vendas por canal
    doc.setFontSize(16);
    doc.text('Vendas por Canal', 20, 115);
    
    doc.setFontSize(12);
    doc.text(`Varejo: ${summary.salesByChannel.varejo.count} vendas - ${formatCurrency(summary.salesByChannel.varejo.value)}`, 20, 130);
    doc.text(`Atacado: ${summary.salesByChannel.atacado.count} vendas - ${formatCurrency(summary.salesByChannel.atacado.value)}`, 20, 140);
    doc.text(`Consignado: ${summary.salesByChannel.consignado.count} vendas - ${formatCurrency(summary.salesByChannel.consignado.value)}`, 20, 150);
    
    doc.save('relatorio-financeiro.pdf');
    toast({
      title: "Relatório exportado",
      description: "O relatório foi salvo como PDF com sucesso.",
    });
  }, [summary, formatCurrency, toast]);

  return (
    <PageShell>
      <PageHeader 
        title="Financeiro"
        description="Controle financeiro de todas as vendas"
      />

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
          <Card className="overflow-visible">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs 2xl:text-sm font-medium">
                <span className="2xl:hidden">Vendas</span>
                <span className="hidden 2xl:inline">Total de Vendas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl 2xl:text-2xl font-bold">{summary.totalSales}</div>
              <p className="text-xs text-muted-foreground">Vendas registradas</p>
            </CardContent>
          </Card>
          <Card className="overflow-visible">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs 2xl:text-sm font-medium">
                <span className="2xl:hidden">Total</span>
                <span className="hidden 2xl:inline">Valor Total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl 2xl:text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
              <p className="text-xs text-muted-foreground">Valor bruto</p>
            </CardContent>
          </Card>
          <Card className="overflow-visible">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs 2xl:text-sm font-medium">
                <span className="2xl:hidden">Recebido</span>
                <span className="hidden 2xl:inline">Valor Recebido</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl 2xl:text-2xl font-bold">{formatCurrency(summary.paidValue)}</div>
              <p className="text-xs text-muted-foreground">Total pago</p>
            </CardContent>
          </Card>
          <Card className="overflow-visible">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs 2xl:text-sm font-medium">
                <span className="2xl:hidden">Pendente</span>
                <span className="hidden 2xl:inline">Valor Pendente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl 2xl:text-2xl font-bold">{formatCurrency(summary.pendingValue)}</div>
              <p className="text-xs text-muted-foreground">A receber</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label htmlFor="channel">Canal</Label>
                <Select value={filters.channel} onValueChange={(value) => handleFilterChange('channel', value)}>
                  <SelectTrigger id="channel">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="VAREJO">Varejo</SelectItem>
                    <SelectItem value="ATACADO">Atacado</SelectItem>
                    <SelectItem value="CONSIGNADO">Consignado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="status">Status da Venda</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="FECHADA">Fechada</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentStatus">Status Pagamento</Label>
                <Select value={filters.paymentStatus} onValueChange={(value) => handleFilterChange('paymentStatus', value)}>
                  <SelectTrigger id="paymentStatus">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PAGO">Pago</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="PARCIAL">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateFrom">Data Início</Label>
                <Input 
                  id="dateFrom" 
                  type="date" 
                  value={filters.dateFrom} 
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateTo">Data Fim</Label>
                <Input 
                  id="dateTo" 
                  type="date" 
                  value={filters.dateTo} 
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)} 
                />
              </div>
            </div>
            
            {/* Botão separado em uma linha própria */}
            <div className="flex justify-center pt-2 border-t">
              <Button variant="outline" onClick={handleClearFilters} className="w-full lg:w-auto min-w-[200px]">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sales List */}
        <Tabs defaultValue="vendas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="por-canal">Por Canal</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="vendas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="text-center py-8">Carregando vendas...</div>
                ) : filteredSales.length > 0 ? (
                  <div className="space-y-4">
                    {filteredSales.map((sale) => (
                      <div key={sale.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-medium text-sm lg:text-base">#{sale.id.slice(-8)}</span>
                            <Badge variant="outline" className="flex items-center gap-1 text-xs whitespace-nowrap">
                              {getChannelIcon(sale.channel || 'VAREJO')}
                              {sale.channel || 'VAREJO'}
                            </Badge>
                            <Badge variant="outline" className={`flex items-center gap-1 text-xs whitespace-nowrap ${getPaymentStatusColor(sale.payment_status)}`}>
                              {getPaymentStatusIcon(sale.payment_status)}
                              {sale.payment_status}
                            </Badge>
                          </div>
                          <div className="text-xs lg:text-sm text-muted-foreground space-y-1">
                            <div className="truncate">Cliente: {sale.client_name}</div>
                            <div className="truncate">Vendedor: {sale.user_name}</div>
                            <div>Data: {formatDate(sale.closed_at || sale.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end gap-3 lg:gap-4">
                          <div className="text-left lg:text-right">
                            <div className="font-semibold text-primary text-base lg:text-lg">
                              {formatCurrency(sale.total_cents)}
                            </div>
                            <div className="text-xs lg:text-sm text-muted-foreground">
                              Pago: {formatCurrency(sale.paid_amount_cents)}
                            </div>
                            {sale.pending_amount_cents > 0 && (
                              <div className="text-xs lg:text-sm text-yellow-600">
                                Pendente: {formatCurrency(sale.pending_amount_cents)}
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSaleId(sale.id)
                              setDetailsOpen(true)
                            }}
                            className="flex-shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda encontrada com os filtros aplicados.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="por-canal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Verificar se está filtrando por Consignado e Pendente
                  const isConsignadoFilter = debouncedFilters.channel === 'CONSIGNADO'
                  const isPendenteFilter = debouncedFilters.paymentStatus === 'PENDENTE'
                  
                  if (isConsignadoFilter && isPendenteFilter) {
                    // ✅ ATUALIZADO: Usar dados do Supabase via useSalesOptimized
                    const consignacoesPendentes = processedSales.filter(sale => 
                      sale.tipo === 'consignacao' && sale.payment_status === 'PENDENTE'
                    )

                    return consignacoesPendentes.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Handshake className="h-5 w-5 text-orange-600" />
                          <span className="font-medium text-lg">Consignações Pendentes de Pagamento</span>
                        </div>
                        
                        {consignacoesPendentes.map((consignacao: any) => (
                          <div key={consignacao.id} className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pendente
                                </Badge>
                                <span className="font-medium">Folha: {consignacao.folha_codigo}</span>
                                <span className="text-sm text-muted-foreground">
                                  Cliente: {consignacao.client_name}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-semibold text-orange-600">
                                  {formatCurrency(consignacao.total_cents)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Total da folha
                                </div>
                              </div>
                            </div>

                            {/* Resumo Financeiro */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
                              <div className="text-center p-2 lg:p-3 bg-white rounded border">
                                <div className="text-xs lg:text-sm text-muted-foreground">Valor Total</div>
                                <div className="font-semibold text-sm lg:text-base text-green-600 truncate">
                                  {formatCurrency(consignacao.valor_total_cents)}
                                </div>
                              </div>
                              <div className="text-center p-2 lg:p-3 bg-white rounded border">
                                <div className="text-xs lg:text-sm text-muted-foreground">Comissão</div>
                                <div className="font-semibold text-sm lg:text-base text-blue-600 truncate">
                                  {formatCurrency(consignacao.valor_comissao_cents)}
                                </div>
                              </div>
                              <div className="text-center p-2 lg:p-3 bg-white rounded border">
                                <div className="text-xs lg:text-sm text-muted-foreground">Valor Pago</div>
                                <div className="font-semibold text-sm lg:text-base text-purple-600 truncate">
                                  {formatCurrency(consignacao.valor_pago_cents)}
                                </div>
                              </div>
                              <div className="text-center p-2 lg:p-3 bg-white rounded border">
                                <div className="text-xs lg:text-sm text-muted-foreground">Restante</div>
                                <div className="font-semibold text-sm lg:text-base text-red-600 truncate">
                                  {formatCurrency(consignacao.valor_restante_cents)}
                                </div>
                              </div>
                            </div>

                            {/* Produtos */}
                            {consignacao.produtos && consignacao.produtos.length > 0 && (
                              <div className="mb-4">
                                <h4 className="font-medium mb-2 text-sm">Produtos:</h4>
                                <div className="space-y-1">
                                  {consignacao.produtos.map((produto: any, index: number) => (
                                    <div key={index} className="text-sm text-muted-foreground">
                                      {produto.qty}x {produto.product_name} - {formatCurrency(produto.subtotal_cents)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pagamentos Registrados */}
                            {consignacao.pagamentos && consignacao.pagamentos.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 text-sm">Pagamentos Registrados:</h4>
                                <div className="space-y-2">
                                  {consignacao.pagamentos.map((pagamento: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                                      <div className="flex items-center gap-2">
                                        <span>{new Date(pagamento.created_at).toLocaleDateString('pt-BR')}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {pagamento.payment_type === 'cash' ? 'Dinheiro' : 
                                           pagamento.payment_type === 'pix' ? 'PIX' :
                                           pagamento.payment_type === 'card' ? 'Cartão' : 
                                           pagamento.payment_type}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          Recebido por: {pagamento.received_by}
                                        </span>
                                      </div>
                                      <div className="font-semibold">
                                        {formatCurrency(pagamento.amount_cents)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Data de criação */}
                            <div className="mt-3 text-xs text-muted-foreground">
                              Criado em: {new Date(consignacao.data_criacao).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma consignação pendente de pagamento encontrada.</p>
                      </div>
                    )
                  } else {
                    // Mostrar resumo normal por canal
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            <span className="font-medium">Varejo</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatCurrency(summary.salesByChannel.varejo.value)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {summary.salesByChannel.varejo.count} vendas
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <span className="font-medium">Atacado</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatCurrency(summary.salesByChannel.atacado.value)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {summary.salesByChannel.atacado.count} vendas
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Handshake className="h-5 w-5 text-primary" />
                            <span className="font-medium">Consignado</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">
                              {formatCurrency(summary.salesByChannel.consignado.value)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {summary.salesByChannel.consignado.count} vendas
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="relatorios" className="space-y-4">
            {/* Controles de Relatório */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
                  Relatórios Financeiros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="reportPeriod" className="text-xs lg:text-sm">Período</Label>
                      <Select 
                        value={reportFilters.period} 
                        onValueChange={(value) => setReportFilters(prev => ({ ...prev, period: value }))}
                      >
                        <SelectTrigger id="reportPeriod" className="w-full md:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 dias</SelectItem>
                          <SelectItem value="30">30 dias</SelectItem>
                          <SelectItem value="90">90 dias</SelectItem>
                          <SelectItem value="365">1 ano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={exportToPDF} className="bg-green-600 hover:bg-green-700 w-full md:w-auto text-sm">
                    <Download className="mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    Exportar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Vendas por Período */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                  Vendas por Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80 lg:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 11 }}
                        className="text-xs"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        className="text-xs"
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Receita' : 'Vendas'
                        ]}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stackId="1" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Distribuição */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Vendas por Canal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Vendas por Canal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getChannelData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) => {
                            // Só mostra label se for maior que 5% para evitar sobreposição
                            if (percent > 0.05) {
                              return `${name} ${(percent * 100).toFixed(0)}%`;
                            }
                            return null;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getChannelData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name
                          ]}
                          labelFormatter={(label) => `Canal: ${label}`}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legenda personalizada */}
                  <div className="mt-4 space-y-2">
                    {getChannelData().map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(entry.value)}</div>
                          <div className="text-muted-foreground">{entry.count} vendas</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Status de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={getPaymentStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, value }) => {
                            // Só mostra label se for maior que 5% para evitar sobreposição
                            if (percent > 0.05) {
                              return `${name} ${(percent * 100).toFixed(0)}%`;
                            }
                            return null;
                          }}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getPaymentStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value} vendas`,
                            name
                          ]}
                          labelFormatter={(label) => `Status: ${label}`}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legenda personalizada */}
                  <div className="mt-4 space-y-2">
                    {getPaymentStatusData().map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{entry.value} vendas</div>
                          <div className="text-muted-foreground">
                            {summary.totalSales > 0 ? ((entry.value / summary.totalSales) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top 10 Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopClients(10).map((client, index) => (
                    <div key={client.name} className="flex flex-col md:flex-row md:items-center md:justify-between p-3 border rounded-lg gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm md:text-base truncate">{client.name}</div>
                          <div className="text-xs md:text-sm text-muted-foreground">
                            Última compra: {formatDate(client.lastPurchase)}
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right flex-shrink-0 pl-11 md:pl-0">
                        <div className="font-semibold text-primary text-base md:text-lg truncate">
                          {formatCurrency(client.totalValue)}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">
                          {client.totalSales} vendas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance por Vendedor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Performance por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getSalesBySeller().map((seller, index) => (
                    <div key={seller.seller} className="flex flex-col md:flex-row md:items-center md:justify-between p-3 border rounded-lg gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm md:text-base truncate">{seller.seller}</div>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">
                            Ticket médio: {formatCurrency(seller.averageTicket)}
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right flex-shrink-0 pl-11 md:pl-0">
                        <div className="font-semibold text-primary text-base md:text-lg truncate">
                          {formatCurrency(seller.totalValue)}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">
                          {seller.totalSales} vendas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resumo Estatístico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumo Estatístico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3 lg:gap-4">
                  <div className="text-center p-3 lg:p-4 border rounded-lg">
                    <div className="text-xl lg:text-2xl font-bold text-primary">
                      {summary.totalSales}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">Total de Vendas</div>
                  </div>
                  <div className="text-center p-3 lg:p-4 border rounded-lg">
                    <div className="text-xl lg:text-2xl font-bold text-green-600 truncate px-2">
                      {formatCurrency(summary.paidValue)}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">Valor Recebido</div>
                  </div>
                  <div className="text-center p-3 lg:p-4 border rounded-lg">
                    <div className="text-xl lg:text-2xl font-bold text-orange-600 truncate px-2">
                      {formatCurrency(summary.pendingValue)}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">Valor Pendente</div>
                  </div>
                  <div className="text-center p-3 lg:p-4 border rounded-lg">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600 truncate px-2">
                      {summary.totalSales > 0 ? formatCurrency(summary.totalValue / summary.totalSales) : 'R$ 0,00'}
                    </div>
                    <div className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">Ticket Médio</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
        <SaleDetailsDrawer
          saleId={selectedSaleId}
          open={detailsOpen && !isConsignacaoSale(selectedSaleId)}
          onClose={handleCloseDetails}
          onDeleted={handleSaleDeleted}
        />
        
        {/* ✅ NOVA FUNCIONALIDADE: Modal para vendas de consignação */}
        <ConsignacaoSaleDetailsModal
          saleId={selectedSaleId}
          open={detailsOpen && isConsignacaoSale(selectedSaleId)}
          onClose={handleCloseDetails}
        />
    </PageShell>
  )
}