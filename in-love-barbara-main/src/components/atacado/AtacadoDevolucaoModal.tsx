import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Package, 
  DollarSign, 
  Calendar, 
  Users, 
  AlertCircle,
  CheckCircle,
  RotateCcw,
  X
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AtacadoDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AtacadoDevolucaoModal({ isOpen, onClose }: AtacadoDevolucaoModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { atacadoSales, deleteSale } = useAtacadoSales();
  const { products, forceRefresh } = useProducts();
  const { toast } = useToast();

  // Filtrar vendas que podem ser devolvidas (concluídas e pagas) - APENAS ATACADO
  const vendasDevolutiveis = useMemo(() => {
    return atacadoSales.filter(sale => {
      // Incluir vendas FECHADAS, RASCUNHO e com pagamento pendente/parcial
      // pois quando se vende um produto, ele sai do estoque de qualquer maneira
      // APENAS vendas de ATACADO
      return (sale.status === 'FECHADA' || sale.status === 'RASCUNHO') &&
             sale.channel === 'ATACADO';
    });
  }, [atacadoSales]);

  // Filtrar vendas por termo de busca
  const filteredSales = useMemo(() => {
    if (!searchTerm) return vendasDevolutiveis;
    
    return vendasDevolutiveis.filter(sale => {
      const clientName = sale.client?.name?.toLowerCase() || '';
      const saleId = sale.id.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return clientName.includes(searchLower) || saleId.includes(searchLower);
    });
  }, [vendasDevolutiveis, searchTerm]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getStatusBadge = (sale: any) => {
    switch (sale.status) {
      case 'FECHADA':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Finalizada</Badge>;
      case 'RASCUNHO':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pendente</Badge>;
      case 'CANCELADA':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{sale.status}</Badge>;
    }
  };

  const handleSelectSale = (sale: any) => {
    setSelectedSale(sale);
  };

  const handleProcessDevolucao = async () => {
    if (!selectedSale) return;

    setIsProcessing(true);
    try {
      // Verificar se todos os produtos ainda existem no sistema
      const produtosInexistentes = [];
      const produtosParaDevolver = [];

      for (const item of selectedSale.items) {
        const produto = products.find(p => p.id === item.product_id);
        if (!produto) {
          produtosInexistentes.push({
            nome: item.product?.name || 'Produto não encontrado',
            quantidade: item.qty
          });
        } else {
          produtosParaDevolver.push({
            produto,
            quantidade: item.qty
          });
        }
      }

      if (produtosInexistentes.length > 0) {
        // Se há produtos inexistentes, apenas excluir a venda
        toast({
          title: "Produtos não encontrados",
          description: `Alguns produtos não existem mais no sistema. A venda será excluída do histórico, mas os produtos não serão devolvidos ao estoque.`,
          variant: "destructive",
          duration: 5000
        });
      }

      // Devolver produtos ao estoque (apenas os que existem)
      for (const { produto, quantidade } of produtosParaDevolver) {
        try {
          const novoEstoque = (produto.stock || 0) + quantidade;
          
          // Atualizar estoque do produto
          const { universalDataAdapter } = await import('@/lib/universal-data-adapter');
          await universalDataAdapter.updateProduct(produto.id, {
            stock: novoEstoque
          });
          
          console.log(`✅ Produto ${produto.name} devolvido ao estoque: +${quantidade} unidades`);
        } catch (error) {
          console.error(`❌ Erro ao devolver produto ${produto.name}:`, error);
        }
      }

      // Excluir a venda do histórico
      await deleteSale(selectedSale.id);

      // Atualizar cache dos produtos
      forceRefresh();

      toast({
        title: "Devolução realizada com sucesso",
        description: `A venda foi excluída do histórico${produtosParaDevolver.length > 0 ? ' e os produtos foram devolvidos ao estoque' : ''}.`,
        duration: 2000
      });

      // Limpar seleção e fechar modal
      setSelectedSale(null);
      onClose();

    } catch (error: any) {
      console.error('Erro ao processar devolução:', error);
      toast({
        title: "Erro na devolução",
        description: error.message || "Não foi possível processar a devolução. Verifique sua conexão e tente novamente.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-[1024px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1024px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 atacado-devolucao-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <RotateCcw className="h-5 w-5 text-primary" />
            Devolução de Produtos
          </DialogTitle>
          <DialogDescription>
            Selecione uma venda para devolver os produtos ao estoque
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Busca */}
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

          {/* Lista de vendas */}
          <div className="space-y-3 sm:space-y-4 max-h-[55vh] overflow-y-auto devolucao-list">
            {filteredSales.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda disponível para devolução'}
                </p>
              </div>
            ) : (
              filteredSales.map((sale) => (
                <Card 
                  key={sale.id} 
                  className={`cursor-pointer transition-all ${
                    selectedSale?.id === sale.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/30'
                  }`}
                  onClick={() => handleSelectSale(sale)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 sm:mb-2 overflow-x-auto">
                          <h3 className="font-bold text-base sm:text-lg text-primary whitespace-nowrap flex-shrink-0">#{sale.id.slice(-8)}</h3>
                          <div className="flex-shrink-0">{getStatusBadge(sale)}</div>
                        </div>
                        
                        {/* Data e hora */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 sm:mb-3">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {sale.status === 'FECHADA' 
                              ? `Finalizada em ${format(new Date(sale.closed_at || sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                              : `Criada em ${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                            }
                          </span>
                        </div>

                        {/* Cliente e Vendedor */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm mb-2 sm:mb-3 overflow-x-auto">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-muted-foreground flex-shrink-0">Cliente:</span>
                            <span className="font-medium whitespace-nowrap">{sale.client?.name || 'Sem cliente'}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            <span className="text-muted-foreground flex-shrink-0">Vendedor:</span>
                            <span className="font-medium whitespace-nowrap">{sale.user?.name || 'Sem vendedor'}</span>
                          </div>
                        </div>

                        {/* Valor e produtos */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Valor:</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(sale.total_cents)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-muted-foreground">
                              {sale.items?.length || 0} produto(s)
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {selectedSale?.id === sale.id && (
                        <div className="ml-0 sm:ml-4">
                          <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Detalhes da venda selecionada */}
          {selectedSale && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Package className="h-5 w-5 text-primary" />
                  Produtos da Venda #{selectedSale.id.slice(-8)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedSale.items?.map((item: any, index: number) => {
                    const produto = products.find(p => p.id === item.product_id);
                    const produtoExiste = !!produto;
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          produtoExiste ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {produtoExiste ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">{item.product?.name || 'Produto não encontrado'}</p>
                            <p className="text-sm text-muted-foreground">
                              Quantidade: {item.qty} | Preço: {formatCurrency(item.unit_price_cents)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.unit_price_cents * item.qty)}</p>
                          {produtoExiste ? (
                            <p className="text-xs text-green-600">Será devolvido ao estoque</p>
                          ) : (
                            <p className="text-xs text-red-600">Produto não existe mais</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aviso importante */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> A devolução irá excluir a venda do histórico e devolver os produtos ao estoque. 
              Produtos que não existem mais no sistema serão apenas removidos do histórico.
            </AlertDescription>
          </Alert>

          {/* Botões de ação */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t devolucao-actions">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessDevolucao}
              disabled={!selectedSale || isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Processar Devolução
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
