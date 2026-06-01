import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  User,
  Package,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { AtacadoSaleDetailsModal } from './AtacadoSaleDetailsModal';
import { AtacadoNfeGenerationModal } from './AtacadoNfeGenerationModal';
import { AtacadoAddPaymentModal } from './AtacadoAddPaymentModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AtacadoSalesHistory() {
  const { atacadoSales, isLoading } = useAtacadoSales();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<any>(null);
  const [nfeModalOpen, setNfeModalOpen] = useState(false);
  const [selectedSaleForNfe, setSelectedSaleForNfe] = useState<any>(null);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);

  // Filtrar vendas
  const filteredSales = useMemo(() => {
    let filtered = atacadoSales;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(sale => 
        sale.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.items.some(item => 
          item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    // Filtro por data
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(sale => {
        // Usar closed_at se disponível, senão created_at (mesma lógica da ordenação)
        const saleDate = new Date(sale.closed_at || sale.created_at);
        
        switch (dateFilter) {
          case 'today':
            return saleDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return saleDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return saleDate >= monthAgo;
          default:
            return true;
        }
      });

      // Debug: log do filtro de data
      console.log(`📅 [AtacadoSalesHistory] Filtro "${dateFilter}" aplicado:`, {
        total: filtered.length,
        dateRange: dateFilter === 'week' ? {
          from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          to: today.toLocaleDateString('pt-BR')
        } : null
      });
    }

    // Ordenar por data: mais recente primeiro (descendente)
    const sorted = filtered.sort((a, b) => {
      // Usar closed_at se disponível, senão created_at
      const dateA = new Date(a.closed_at || a.created_at).getTime();
      const dateB = new Date(b.closed_at || b.created_at).getTime();
      return dateB - dateA; // Mais recente primeiro (dateB maior que dateA)
    });

    // Debug: log das primeiras 3 vendas para verificar ordenação
    if (sorted.length > 0) {
      console.log('📅 [AtacadoSalesHistory] Ordenação das vendas:', 
        sorted.slice(0, 3).map(sale => ({
          id: sale.id.slice(-8),
          created_at: sale.created_at,
          closed_at: sale.closed_at,
          used_date: sale.closed_at || sale.created_at,
          formatted: new Date(sale.closed_at || sale.created_at).toLocaleString('pt-BR')
        }))
      );
    }

    return sorted;
  }, [atacadoSales, searchTerm, statusFilter, dateFilter]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FECHADA':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Finalizada</Badge>;
      case 'RASCUNHO':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Rascunho</Badge>;
      case 'CANCELADA':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateSaleProfit = (sale: any) => {
    return sale.items.reduce((sum: number, item: any) => {
      const profitPerUnit = item.profit_per_unit_cents || 0;
      return sum + (profitPerUnit * item.qty);
    }, 0);
  };


  // Calcular total de produtos vendidos
  const calculateTotalProductsSold = (sale: any) => {
    return sale.items.reduce((sum: number, item: any) => sum + item.qty, 0);
  };

  // Calcular status de pagamento
  const getPaymentStatus = (sale: any) => {
    const total = sale.total_cents || 0;
    const paid = sale.payments?.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0;
    
    if (total === 0) {
      return { status: 'SEM_VALOR', color: 'text-gray-600', label: 'Sem valor', icon: '❓' };
    } else if (paid >= total) {
      return { status: 'PAGO', color: 'text-green-600', label: 'Pago', icon: '✅' };
    } else if (paid > 0 && paid < total) {
      return { status: 'PARCIAL', color: 'text-blue-600', label: 'Parcial', icon: '🔄' };
    } else {
      return { status: 'PENDENTE', color: 'text-orange-600', label: 'Pagamento Pendente', icon: '⏰' };
    }
  };

  // Funções de seleção
  const handleSelectSale = (saleId: string) => {
    setSelectedSales(prev => 
      prev.includes(saleId) 
        ? prev.filter(id => id !== saleId)
        : [...prev, saleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSales.length === filteredSales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(filteredSales.map(sale => sale.id));
    }
  };

  // Funções de exclusão
  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    console.log('🗑️ [AtacadoSalesHistory] Tentando excluir venda:', saleId);
    setIsDeleting(true);
    
    try {
      const response = await universalDataAdapter.deleteSale(saleId);
      console.log('🗑️ [AtacadoSalesHistory] Resposta da exclusão:', response);
      
      if (response.error) {
        console.error('❌ [AtacadoSalesHistory] Erro na exclusão:', response.error);
        throw new Error(response.error.message);
      }

      toast({
        title: "Sucesso",
        description: "Venda excluída com sucesso"
      });

      // Remover da seleção se estava selecionada
      setSelectedSales(prev => prev.filter(id => id !== saleId));
      
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
      
      console.log('✅ [AtacadoSalesHistory] Venda excluída com sucesso');
    } catch (error: any) {
      console.error('❌ [AtacadoSalesHistory] Erro ao excluir venda:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir venda",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSales.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedSales.length} venda(s)?`)) return;

    setIsDeleting(true);
    try {
      const response = await universalDataAdapter.deleteSales(selectedSales);
      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Sucesso",
        description: `${response.data?.deleted || selectedSales.length} venda(s) excluída(s) com sucesso`
      });

      setSelectedSales([]);
      
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir vendas",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Funções para modal de detalhes
  const handleViewDetails = (sale: any) => {
    setSelectedSaleForDetails(sale);
    setDetailsModalOpen(true);
  };

  const handleGenerateNfe = (sale: any) => {
    console.log('🚀 Clicou no botão NF-e para venda:', sale.id);
    alert('Botão NF-e clicado! Venda: ' + sale.id.slice(-8));
    setSelectedSaleForNfe(sale);
    setNfeModalOpen(true);
  };

  const handleAddPayment = (sale: any) => {
    setSelectedSaleForPayment(sale);
    setAddPaymentModalOpen(true);
  };

  const handlePaymentAdded = () => {
    // Invalidar cache para atualizar a lista
    queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
              <Input
                placeholder="Buscar por cliente, ID ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="FECHADA">Finalizadas</SelectItem>
                <SelectItem value="RASCUNHO">Rascunhos</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Último Mês</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Ordenado por data (mais recente primeiro)</span>
            </div>

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controles de Seleção Múltipla */}
      {filteredSales.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedSales.length === filteredSales.length && filteredSales.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Selecionar todas ({selectedSales.length}/{filteredSales.length})
                  </span>
                </div>
                
                {selectedSales.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir Selecionadas ({selectedSales.length})
                  </Button>
                )}
              </div>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Vendas */}
      <div className="space-y-4">
        {filteredSales.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhuma venda encontrada
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Tente ajustar os filtros para encontrar vendas.'
                  : 'Comece criando sua primeira venda de atacado.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="shadow-card hover:shadow-soft transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Checkbox de Seleção */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedSales.includes(sale.id)}
                      onCheckedChange={() => handleSelectSale(sale.id)}
                    />
                  </div>

                  {/* Informações Principais */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{sale.id.slice(-8)}
                      </Badge>
                      {getStatusBadge(sale.status)}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {sale.client && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{sale.client.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{calculateTotalProductsSold(sale)} produtos</span>
                      </div>
                    </div>

                    {/* Status de Pagamento */}
                    <div className="flex items-center justify-between">
                      {(() => {
                        const paymentStatus = getPaymentStatus(sale);
                        return (
                          <div className={`flex items-center gap-1 text-sm ${paymentStatus.color}`}>
                            <span>{paymentStatus.icon}</span>
                            <span className="font-medium">{paymentStatus.label}</span>
                          </div>
                        );
                      })()}
                      
                      {/* Botão para adicionar pagamento se pendente */}
                      {(() => {
                        const paymentStatus = getPaymentStatus(sale);
                        if (paymentStatus.status === 'PENDENTE' || paymentStatus.status === 'PARCIAL') {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddPayment(sale)}
                              className="text-xs"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Adicionar Pagamento
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Lista de Produtos */}
                    <div className="space-y-2">
                      {sale.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="bg-muted/30 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.product?.name || 'Produto não encontrado'}</div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {item.product?.short_code || 'N/A'} • 
                                Preço: {formatCurrency(item.unit_price_cents)} • 
                                Qtd: {item.qty}x
                              </div>
                              {item.discount_percent > 0 && (
                                <div className="text-xs text-red-600 mt-1">
                                  Desconto: {item.discount_percent}%
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">
                                {formatCurrency(item.unit_price_cents * item.qty)}
                              </div>
                              {item.product && (
                                <div className="text-xs text-green-600">
                                  +{formatCurrency(((item.unit_price_cents - (item.product.cost_price_cents || item.product.cost_cents || 0)) * item.qty))} lucro
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {sale.items.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center py-2 bg-muted/20 rounded">
                          <Package className="h-3 w-3 inline mr-1" />
                          +{sale.items.length - 3} produtos adicionais
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="lg:w-64 space-y-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(sale.total_cents || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Valor Total
                      </div>
                    </div>
                    

                    {sale.status === 'FECHADA' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Lucro:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(calculateSaleProfit(sale))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewDetails(sale)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteSale(sale.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resumo dos Filtros */}
      {filteredSales.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {filteredSales.length} de {atacadoSales.length} vendas
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>
                    Produtos: {filteredSales.reduce((sum, sale) => sum + calculateTotalProductsSold(sale), 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    Total: {formatCurrency(
                      filteredSales.reduce((sum, sale) => sum + (sale.total_cents || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Lucro: {formatCurrency(
                      filteredSales.reduce((sum, sale) => sum + calculateSaleProfit(sale), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo de Produtos Vendidos */}
      {filteredSales.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Resumo de Produtos Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Produtos mais vendidos */}
              <div>
                <h4 className="font-medium text-sm mb-2">Produtos Mais Vendidos</h4>
                <div className="space-y-2">
                  {(() => {
                    // Agrupar produtos por nome e somar quantidades
                    const productMap = new Map();
                    filteredSales.forEach(sale => {
                      sale.items.forEach(item => {
                        const productName = item.product?.name || 'Produto não encontrado';
                        const existing = productMap.get(productName) || { qty: 0, revenue: 0 };
                        productMap.set(productName, {
                          qty: existing.qty + item.qty,
                          revenue: existing.revenue + (item.unit_price_cents * item.qty),
                          sku: item.product?.short_code || 'N/A'
                        });
                      });
                    });
                    
                    // Converter para array e ordenar por quantidade
                    const sortedProducts = Array.from(productMap.entries())
                      .map(([name, data]) => ({ name, ...data }))
                      .sort((a, b) => b.qty - a.qty)
                      .slice(0, 5); // Top 5
                    
                    return sortedProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {product.sku} • {product.qty} unidades
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {formatCurrency(product.revenue)}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Modal de Detalhes */}
      <AtacadoSaleDetailsModal
        sale={selectedSaleForDetails}
        isOpen={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        onPaymentAdded={handlePaymentAdded}
      />

      {/* Modal de Geração de NF-e */}
      <AtacadoNfeGenerationModal
        sale={selectedSaleForNfe}
        isOpen={nfeModalOpen}
        onClose={() => setNfeModalOpen(false)}
      />

      {/* Modal de Adicionar Pagamento */}
      <AtacadoAddPaymentModal
        sale={selectedSaleForPayment}
        isOpen={addPaymentModalOpen}
        onOpenChange={setAddPaymentModalOpen}
        onPaymentAdded={handlePaymentAdded}
      />
    </div>
  );
}
