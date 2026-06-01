import { useState, useEffect, useMemo } from 'react';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  Calendar,
  Plus,
  History,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Trash2,
  Search,
  Filter,
  Download,
  RefreshCw,
  Target,
  Zap,
  Star,
  Award,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  FileText,
  RotateCcw,
  Shield
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';
import { AtacadoNewSaleDialog } from '@/components/atacado/AtacadoNewSaleDialog';
import { AtacadoSaleDetailsModal } from '@/components/atacado/AtacadoSaleDetailsModal';
import { AtacadoAddPaymentModal } from '@/components/atacado/AtacadoAddPaymentModal';
import { AtacadoNfeSelectionModal } from '@/components/atacado/AtacadoNfeSelectionModal';
import { AtacadoNfeGenerationModal } from '@/components/atacado/AtacadoNfeGenerationModal';
import { AtacadoDevolucaoModal } from '@/components/atacado/AtacadoDevolucaoModal';
import { BlacklistAtacadoManagement } from '@/components/atacado/BlacklistAtacadoManagement';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

// Constantes para métodos de pagamento
type DbPaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO'

const PAYMENT_LABEL: Record<DbPaymentMethod, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
}

import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function Atacado() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Atacado')
  
  // Componente Atacado - Sistema de vendas em lote
  const [activeTab, setActiveTab] = useState('sales');
  const [isNewSaleDialogOpen, setIsNewSaleDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [nfeSelectionModalOpen, setNfeSelectionModalOpen] = useState(false);
  const [nfeGenerationModalOpen, setNfeGenerationModalOpen] = useState(false);
  const [selectedSaleForNfe, setSelectedSaleForNfe] = useState<any>(null);
  const [devolucaoModalOpen, setDevolucaoModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  
  // Estados para confirmação de exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBulkConfirmOpen, setDeleteBulkConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { 
    atacadoSales, 
    isLoading, 
    refreshSales,
    calculateAtacadoMetrics,
    deleteSale,
    deleteSales
  } = useAtacadoSales();

  // Debug: verificar dados das vendas
  console.log('🔍 [Atacado] Vendas carregadas:', atacadoSales);
  console.log('🔍 [Atacado] Primeira venda:', atacadoSales[0]);

  const metrics = calculateAtacadoMetrics();

  // Função para calcular status de pagamento
  const getPaymentStatus = (sale: any) => {
    const totalAmount = sale.total_cents || 0;
    const paidAmount = sale.payments?.reduce((sum: number, payment: any) => sum + (payment.amount_cents || 0), 0) || 0;
    
    console.log(`🔍 [getPaymentStatus] Venda ${sale.id}:`, {
      totalAmount,
      paidAmount,
      payments: sale.payments,
      status: sale.status
    });
    
    if (totalAmount === 0) {
      return { status: 'SEM_VALOR', label: 'Sem valor', color: 'text-gray-600' };
    } else if (paidAmount >= totalAmount) {
      return { status: 'PAGO', label: 'Pago', color: 'text-green-600' };
    } else if (paidAmount > 0 && paidAmount < totalAmount) {
      return { status: 'PARCIAL', label: 'Parcial', color: 'text-blue-600' };
    } else {
      return { status: 'PENDENTE', label: 'Pendente', color: 'text-orange-600' };
    }
  };

  // Calcular estatísticas rápidas
  const quickStats = useMemo(() => {
    const today = new Date();
    const todaySales = atacadoSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate.toDateString() === today.toDateString() && sale.status === 'FECHADA';
    });

    const thisMonthSales = atacadoSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      return saleDate.getMonth() === currentMonth && 
             saleDate.getFullYear() === currentYear && 
             sale.status === 'FECHADA';
    });

    const pendingSales = atacadoSales.filter(sale => sale.status === 'RASCUNHO');

    return {
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0),
      monthSales: thisMonthSales.length,
      monthRevenue: thisMonthSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0),
      pendingSales: pendingSales.length
    };
  }, [atacadoSales]);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    let filtered = atacadoSales;

    // Filtro por status
    if (statusFilter !== 'all') {
      if (statusFilter === 'RASCUNHO') {
        // Para vendas pendentes, incluir também vendas com pagamento parcial
        filtered = filtered.filter(sale => {
          const paymentStatus = getPaymentStatus(sale);
          return sale.status === 'RASCUNHO' || 
                 (sale.status === 'FECHADA' && (paymentStatus.status === 'PENDENTE' || paymentStatus.status === 'PARCIAL'));
        });
      } else {
        filtered = filtered.filter(sale => sale.status === statusFilter);
      }
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(sale => {
        const clientName = sale.client?.name?.toLowerCase() || '';
        const saleId = sale.id.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return clientName.includes(searchLower) || saleId.includes(searchLower);
      });
    }

    // Ordenar por data (mais recente primeiro)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.closed_at || a.created_at).getTime();
      const dateB = new Date(b.closed_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [atacadoSales, statusFilter, searchTerm]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getStatusBadge = (sale: any) => {
    const paymentStatus = getPaymentStatus(sale);
    
    // Se a venda está FECHADA mas tem pagamento parcial ou pendente, mostrar como Pendente
    if (sale.status === 'FECHADA' && (paymentStatus.status === 'PARCIAL' || paymentStatus.status === 'PENDENTE')) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
    
    // Caso contrário, usar o status original da venda
    switch (sale.status) {
      case 'FECHADA':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Finalizada</Badge>;
      case 'RASCUNHO':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'CANCELADA':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="outline">{sale.status}</Badge>;
    }
  };

  const handleViewSale = (sale: any) => {
    console.log('🔍 [Atacado] Abrindo detalhes da venda:', {
      saleId: sale.id.slice(-8),
      itemsCount: sale.items?.length || 0,
      items: sale.items,
      status: sale.status
    });
    
    // Atualizar dados antes de abrir o modal
    refreshSales();
    
    setSelectedSale(sale);
    setDetailsModalOpen(true);
  };

  const handleAddPayment = (sale: any) => {
    setSelectedSale(sale);
    setPaymentModalOpen(true);
  };

  const handleDeleteSale = (saleId: string) => {
    setSaleToDelete(saleId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    try {
      await deleteSale(saleToDelete);
      toast({
        title: "Venda excluída",
        description: "A venda foi excluída com sucesso.",
        duration: 2000, // Sucesso rápido
      });
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a venda.",
        variant: "destructive",
        duration: 5000, // Erro tempo normal
      });
    } finally {
      setDeleteConfirmOpen(false);
      setSaleToDelete(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSales.length === 0) return;
    setDeleteBulkConfirmOpen(true);
  };

  const confirmDeleteSelected = async () => {
    if (selectedSales.length === 0) return;
    
    try {
      await deleteSales(selectedSales);
      setSelectedSales([]);
      toast({
        title: "Vendas excluídas",
        description: `${selectedSales.length} vendas foram excluídas com sucesso.`,
        duration: 2000, // Sucesso rápido
      });
    } catch (error) {
      console.error('Erro ao excluir vendas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as vendas.",
        variant: "destructive",
        duration: 5000, // Erro tempo normal
      });
    } finally {
      setDeleteBulkConfirmOpen(false);
    }
  };

  const toggleSaleSelection = (saleId: string) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    );
  };

  const selectAllSales = () => {
    setSelectedSales(filteredSales.map(sale => sale.id));
  };

  const clearSelection = () => {
    setSelectedSales([]);
  };

  const handleSelectSaleForNfe = (sale: any) => {
    setSelectedSaleForNfe(sale);
    setNfeSelectionModalOpen(false);
    setNfeGenerationModalOpen(true);
  };

  const handleCloseNfeGeneration = () => {
    setNfeGenerationModalOpen(false);
    setSelectedSaleForNfe(null);
  };

  return (
    <PageShell>
        <PageHeader 
        title="Atacado"
        description="Sistema de vendas em lote"
          actions={
            <div className="flex flex-col btn:flex-row gap-2 w-full btn:w-auto">
              <Button 
                onClick={() => setIsNewSaleDialogOpen(true)}
                className="gradient-gold text-white hover:opacity-90 shadow-soft w-full btn:w-auto text-xs lg:text-sm"
              >
                <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                <span className="hidden tablet:inline">Nova Venda</span>
                <span className="tablet:hidden">Nova</span>
              </Button>
              <Button 
                onClick={() => setNfeSelectionModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full btn:w-auto text-xs lg:text-sm"
              >
                <FileText className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2 flex-shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap">Gerar Nota Fiscal</span>
                <span className="xl:hidden whitespace-nowrap">NF-e</span>
              </Button>
              <Button 
                onClick={() => setDevolucaoModalOpen(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full btn:w-auto text-xs lg:text-sm"
              >
                <RotateCcw className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                <span className="hidden tablet:inline">Devolução</span>
                <span className="tablet:hidden">Devol.</span>
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-gray-300 w-full btn:w-auto text-xs lg:text-sm"
                title="Atualizar página"
              >
                <RefreshCw className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                <span className="hidden tablet:inline">Atualizar</span>
                <span className="tablet:hidden">Atual.</span>
              </Button>
            </div>
          }
        />

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="border-l-4 border-l-green-500 shadow-card hover:shadow-soft transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Vendas Hoje
            </CardTitle>
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 sm:hidden icon:flex" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {quickStats.todaySales}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words leading-tight">
              {formatCurrency(quickStats.todayRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-card hover:shadow-soft transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Este Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 sm:hidden icon:flex" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {quickStats.monthSales}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words leading-tight">
              {formatCurrency(quickStats.monthRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-card hover:shadow-soft transition-shadow sm:col-span-2 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0 sm:hidden icon:flex" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              {quickStats.pendingSales}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 break-words leading-tight">
              Aguardando finalização
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-hidden">
          <TabsList className="grid w-full grid-cols-3 !h-auto min-h-[2.75rem] sm:min-h-[2.5rem] gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-md bg-muted/50">
            <TabsTrigger 
              value="sales" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Vendas</span>
          </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Pendentes</span>
          </TabsTrigger>
            <TabsTrigger 
              value="blacklist" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
            >
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Blacklist</span>
          </TabsTrigger>
        </TabsList>
        </div>


        {/* Vendas */}
        <TabsContent value="sales" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4 atacado-sales-history">
          {/* Filtros */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
            <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
              <Input
                      placeholder="Buscar por cliente ou ID da venda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      style={{ paddingLeft: '2.75rem' }}
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="FECHADA">Finalizadas</SelectItem>
                    <SelectItem value="RASCUNHO">Pendentes</SelectItem>
                    <SelectItem value="CANCELADA">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>

          {/* Lista de Vendas */}
        <Card className="shadow-card">
          <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span>Histórico de Vendas</span>
                  <Badge variant="outline" className="ml-2 text-xs whitespace-nowrap">
                    {filteredSales.length}
                  </Badge>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedSales.length === 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllSales}
                      className="text-xs sm:text-sm w-full sm:w-auto"
                    >
                      Selecionar Todas
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="text-xs sm:text-sm w-full sm:w-auto"
                      >
                        Limpar Seleção
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="text-xs sm:text-sm w-full sm:w-auto"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Excluir ({selectedSales.length})
                      </Button>
                    </>
                  )}
                </div>
              </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
              {filteredSales.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma venda encontrada</p>
                </div>
              ) : (
              <div className="space-y-3 sm:space-y-4">
                  {/* Cabeçalho da lista com checkbox "Selecionar Todas" */}
                  {filteredSales.length > 0 && (
                    <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-muted/30 rounded-lg border">
                      <input
                        type="checkbox"
                        checked={selectedSales.length === filteredSales.length && filteredSales.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllSales();
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                            {selectedSales.length === filteredSales.length && filteredSales.length > 0
                              ? 'Desmarcar Todas'
                              : 'Selecionar Todas'
                            }
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                            ({selectedSales.length} de {filteredSales.length} selecionadas)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                {filteredSales.map((sale) => (
                    <div key={sale.id} className="border rounded-lg p-3 sm:p-4 md:p-6 hover:bg-muted/30 transition-colors history-item">
                      {/* Cabeçalho da venda */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 history-header-row">
                        <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedSales.includes(sale.id)}
                            onChange={() => toggleSaleSelection(sale.id)}
                            className="rounded mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                              <h3 className="font-bold text-base sm:text-lg md:text-xl text-primary break-words">#{sale.id.slice(-8)}</h3>
                              {getStatusBadge(sale)}
                            </div>
                            
                            {/* Data e hora */}
                            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                              <span className="font-medium break-words leading-tight">
                                {sale.status === 'FECHADA' 
                                  ? `Finalizada em ${format(new Date(sale.closed_at || sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                                  : `Criada em ${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0 history-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSale(sale)}
                            className="text-xs sm:text-sm flex-1 sm:flex-initial min-w-0"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="hidden sm:inline">Ver Detalhes</span>
                            <span className="sm:hidden">Detalhes</span>
                          </Button>
                          
                          {sale.status === 'RASCUNHO' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddPayment(sale)}
                              className="text-xs sm:text-sm flex-1 sm:flex-initial min-w-0"
                            >
                              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                              <span className="hidden sm:inline">Pagamento</span>
                              <span className="sm:hidden">Pagar</span>
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSale(sale.id)}
                            className="text-xs sm:text-sm flex-shrink-0"
                            title="Excluir venda"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Informações essenciais */}
                      <div className="space-y-2 sm:space-y-3">
                        {/* Cliente e Vendedor */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm history-client-seller-row">
                          <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1 history-client">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <span className="text-muted-foreground whitespace-nowrap">Cliente:</span>
                            <span className="font-medium break-words leading-tight">{sale.client?.name || 'Sem cliente'}</span>
                          </div>
                          <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1 history-seller">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <span className="text-muted-foreground whitespace-nowrap">Vendedor:</span>
                            <span className="font-medium break-words leading-tight">{sale.user?.name || 'Sem vendedor'}</span>
                          </div>
                        </div>

                        {/* Valor e Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 history-value-status-row">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Valor Total:</span>
                            <span className="font-bold text-green-600 text-sm sm:text-base md:text-lg break-words">
                              {formatCurrency(sale.total_cents)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 history-payment-status">
                            {getPaymentStatus(sale).status === 'PAGO' ? (
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-green-600 font-medium whitespace-nowrap">
                                  Pago
                                </span>
                              </div>
                            ) : getPaymentStatus(sale).status === 'PARCIAL' ? (
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-orange-600 font-medium whitespace-nowrap">
                                  Parcial
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground break-words leading-tight">
                                  (Restante: {formatCurrency((sale.total_cents || 0) - (sale.payments?.reduce((sum: number, payment: any) => sum + (payment.amount_cents || 0), 0) || 0))})
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-orange-600 font-medium whitespace-nowrap">
                                  Pagamento Pendente
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Resumo de produtos */}
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="break-words leading-tight">
                            {sale.items?.length || 0} produto(s) vendido(s)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pendentes */}
        <TabsContent value="pending" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4 atacado-pending">
          <Card className="shadow-card">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-3">
                <CardTitle className="flex items-center gap-1.5 xs:gap-2 text-base sm:text-lg md:text-xl">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                  <span className="break-words leading-tight">Vendas Pendentes</span>
                  <Badge variant="outline" className="ml-1 xs:ml-2 text-xs whitespace-nowrap">
                    {atacadoSales.filter(sale => {
                      const paymentStatus = getPaymentStatus(sale);
                      return sale.status === 'RASCUNHO' || 
                             (sale.status === 'FECHADA' && (paymentStatus.status === 'PENDENTE' || paymentStatus.status === 'PARCIAL'));
                    }).length}
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              {atacadoSales.filter(sale => {
                const paymentStatus = getPaymentStatus(sale);
                return sale.status === 'RASCUNHO' || 
                       (sale.status === 'FECHADA' && (paymentStatus.status === 'PENDENTE' || paymentStatus.status === 'PARCIAL'));
              }).length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mx-auto mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-muted-foreground break-words leading-tight">Nenhuma venda pendente</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {atacadoSales
                    .filter(sale => {
                      const paymentStatus = getPaymentStatus(sale);
                      return sale.status === 'RASCUNHO' || 
                             (sale.status === 'FECHADA' && (paymentStatus.status === 'PENDENTE' || paymentStatus.status === 'PARCIAL'));
                    })
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((sale) => (
                      <div key={sale.id} className="border border-orange-200 rounded-lg p-2 xs:p-3 sm:p-4 bg-orange-50 overflow-hidden pending-card-item">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pending-card-row">
                          {/* Informações principais */}
                          <div className="flex-1 min-w-0 space-y-1 xs:space-y-1.5 sm:space-y-2 pending-main-info">
                            <div className="flex flex-wrap items-center gap-1.5 xs:gap-2">
                              <p className="font-medium text-xs sm:text-sm break-words leading-tight">#{sale.id.slice(-8)}</p>
                              <div className="flex-shrink-0">{getStatusBadge(sale)}</div>
                            </div>
                            <p className="text-[11px] xs:text-xs sm:text-sm text-muted-foreground break-words leading-tight">
                              {sale.client?.name || 'Cliente não informado'}
                            </p>
                            <p className="text-[10px] xs:text-xs text-muted-foreground break-words leading-tight">
                              Criada em {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                          
                          {/* Valor e ações */}
                          <div className="flex flex-col-reverse xs:flex-row xs:items-center gap-2 xs:gap-3 sm:gap-4 flex-shrink-0 pending-card-aside">
                          <div className="text-left xs:text-right pending-price">
                              <p className="font-semibold text-sm sm:text-base break-words leading-tight">{formatCurrency(sale.total_cents || 0)}</p>
                              <p className="text-[11px] xs:text-xs sm:text-sm text-muted-foreground break-words leading-tight pending-mini-count">
                                {sale.items?.length || 0} produto(s)
                              </p>
                            </div>
                            
                            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 xs:gap-2 pending-actions">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSale(sale)}
                                className="text-xs h-8 px-2 flex-1 xs:flex-initial whitespace-nowrap"
                              >
                                <Eye className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 xs:mr-1" />
                                <span className="hidden xs:inline">Ver</span>
                              </Button>
                              
                              <Button
                                size="sm"
                                onClick={() => handleAddPayment(sale)}
                                className="gradient-gold text-white hover:opacity-90 text-xs h-8 px-2 flex-1 xs:flex-initial whitespace-nowrap"
                              >
                                <CreditCard className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 mr-1.5 xs:mr-2 flex-shrink-0" />
                                <span className="hidden xs:inline">Finalizar</span>
                                <span className="xs:hidden">Pagar</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Resumo de produtos */}
                        <div className="mt-2 xs:mt-2.5 sm:mt-3 flex items-center gap-1.5 xs:gap-2 text-[11px] xs:text-xs sm:text-sm text-orange-700">
                          <Package className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="break-words leading-tight">
                            {sale.items?.length || 0} produto(s) na venda
                          </span>
                        </div>
                      </div>
                    ))}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>


        {/* Blacklist */}
        <TabsContent value="blacklist" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
          <BlacklistAtacadoManagement />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <AtacadoNewSaleDialog 
        isOpen={isNewSaleDialogOpen} 
        onOpenChange={setIsNewSaleDialogOpen} 
      />
      
      <AtacadoSaleDetailsModal
        isOpen={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        sale={selectedSale}
        onPaymentAdded={() => {
          // Atualizar dados após pagamento
          refreshSales();
        }}
        onSaleDeleted={() => {
          // Atualizar dados após cancelamento
          refreshSales();
        }}
      />
      
      <AtacadoAddPaymentModal
        isOpen={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        sale={selectedSale}
        onPaymentAdded={() => {
          // Atualizar dados após pagamento
          refreshSales();
        }}
        />

      <AtacadoNfeSelectionModal
        isOpen={nfeSelectionModalOpen}
        onClose={() => setNfeSelectionModalOpen(false)}
        onSelectSale={handleSelectSaleForNfe}
        sales={atacadoSales as any}
      />

      <AtacadoNfeGenerationModal
        isOpen={nfeGenerationModalOpen}
        onClose={() => setNfeGenerationModalOpen(false)}
        sale={selectedSaleForNfe}
      />

      <AtacadoDevolucaoModal
        isOpen={devolucaoModalOpen}
        onClose={() => setDevolucaoModalOpen(false)}
      />

      {/* Modais de Confirmação de Exclusão */}
      
      {/* Confirmação de Exclusão Individual */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSale}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão em Massa */}
      <AlertDialog open={deleteBulkConfirmOpen} onOpenChange={setDeleteBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedSales.length} venda(s) selecionada(s)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSelected}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir {selectedSales.length} Venda(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </PageShell>
  );
}