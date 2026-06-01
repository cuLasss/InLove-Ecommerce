import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  RotateCcw, 
  Search, 
  Package, 
  Calendar, 
  User, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSalesOptimized } from '@/hooks/useSalesOptimized';
import { useProducts } from '@/hooks/useProducts';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { useToast } from '@/hooks/use-toast';

interface VarejoDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VarejoDevolucaoModal({ isOpen, onClose }: VarejoDevolucaoModalProps) {
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ OTIMIZAÇÃO: Só carregar dados quando o modal estiver aberto
  const { sales, deleteSale } = useSalesOptimized();
  const { forceRefresh } = useProducts();
  const { toast } = useToast();

  // Filtrar vendas elegíveis para devolução (FECHADA ou RASCUNHO) - APENAS VAREJO
  const eligibleSales = useMemo(() => {
    // ✅ OTIMIZAÇÃO: Só processar quando modal estiver aberto
    if (!isOpen) return [];
    
    // ✅ OTIMIZAÇÃO: Log apenas uma vez quando abrir
    if (sales.length > 0 && selectedSale === null) {
      console.log('🔍 [VarejoDevolucaoModal] Vendas carregadas:', sales.length);
    }
    
    const filtered = sales.filter(sale => 
      (sale.status === 'FECHADA' || sale.status === 'RASCUNHO') &&
      sale.channel === 'VAREJO'
    );
    
    // ✅ OTIMIZAÇÃO: Log apenas uma vez
    if (filtered.length > 0 && selectedSale === null) {
      console.log('🔍 [VarejoDevolucaoModal] Vendas elegíveis para devolução:', filtered.length);
    }
    
    // ✅ OTIMIZAÇÃO: Remover logs detalhados que causam spam
    
    return filtered;
  }, [sales, isOpen, selectedSale]);

  // Filtrar vendas por termo de busca
  const filteredSales = useMemo(() => {
    if (!searchTerm) return eligibleSales.slice(0, 20);
    
    return eligibleSales.filter(sale => {
      const clientName = sale.client?.name?.toLowerCase() || '';
      const saleId = sale.id.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return clientName.includes(searchLower) || saleId.includes(searchLower);
    });
  }, [eligibleSales, searchTerm]);

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

  const handleProcessDevolucao = async () => {
    if (!selectedSale) return;

    setIsProcessing(true);
    
    try {
      console.log('🔄 [VarejoDevolucaoModal] Iniciando devolução da venda:', selectedSale.id);
      console.log('🔍 [VarejoDevolucaoModal] Dados completos da venda selecionada:', selectedSale);
      
      // ✅ NOVA LÓGICA: Usar função específica para devolução que retorna estoque
      console.log('📦 [VarejoDevolucaoModal] Processando devolução completa com retorno de estoque...');
      
      // Log dos produtos que terão estoque devolvido
      if (selectedSale.items && selectedSale.items.length > 0) {
        for (const item of selectedSale.items) {
          console.log(`📦 [VarejoDevolucaoModal] Produto ${item.product_id}: ${item.qty} unidades serão devolvidas`);
        }
      }

      // Processar devolução completa usando função específica do banco
      console.log('🔄 [VarejoDevolucaoModal] Chamando função de devolução completa...');
      const result = await universalDataAdapter.processarDevolucaoCompleta(selectedSale.id, 'Devolução completa da venda');
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      console.log('✅ [VarejoDevolucaoModal] Devolução processada com sucesso:', result.data);

      const produtosDevolvidos = selectedSale.items || [];
      const produtosInexistentes: any[] = [];

      // Atualizar cache de produtos
      console.log('🔄 [VarejoDevolucaoModal] Atualizando cache de produtos...');
      await forceRefresh();
      console.log('✅ [VarejoDevolucaoModal] Cache atualizado');

      // Notificar sucesso (mensagem rápida)
      toast({
        title: "✅ Devolução realizada com sucesso",
        description: `Venda #${selectedSale.id.slice(-8)} foi excluída do histórico. ${produtosDevolvidos.length} produto(s) devolvido(s) ao estoque.`,
        duration: 1500,
      });

      // Se houver produtos inexistentes, notificar
      if (produtosInexistentes.length > 0) {
        toast({
          title: "⚠️ Produtos inexistentes",
          description: `${produtosInexistentes.length} produto(s) não existem mais no sistema. Apenas o registro da venda foi removido.`,
          variant: "destructive",
          duration: 3000,
        });
      }

      // Limpar seleção e fechar modal
      setSelectedSale(null);
      onClose();

      // Simular clique no botão atualizar para verificar se a venda foi removida
      setTimeout(() => {
        const refreshButton = document.querySelector('[data-refresh-button="varejo"]') as HTMLButtonElement;
        if (refreshButton && !refreshButton.disabled) {
          console.log('🔄 [VarejoDevolucaoModal] Simulando clique no botão atualizar...');
          refreshButton.click();
        } else {
          console.log('⚠️ [VarejoDevolucaoModal] Botão atualizar não encontrado ou desabilitado');
        }
      }, 500); // Delay para garantir que o modal feche primeiro

    } catch (error: any) {
      console.error('❌ [VarejoDevolucaoModal] Erro ao processar devolução:', error);
      toast({
        title: "Erro na devolução",
        description: error.message || "Não foi possível processar a devolução. Tente novamente.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-[1024px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1024px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 varejo-devolucao-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <RotateCcw className="h-5 w-5 text-red-600" />
            Devolução de Produtos - Varejo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Instruções */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Como funciona a devolução:</h3>
                  <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                    <li>• Selecione uma venda do histórico para devolver</li>
                    <li>• Os produtos serão devolvidos ao estoque automaticamente</li>
                    <li>• A venda será removida do histórico</li>
                    <li>• Produtos que não existem mais serão apenas removidos do histórico</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

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

          {/* Lista de Vendas */}
          <div className="space-y-3 sm:space-y-4 max-h-[55vh] overflow-y-auto devolucao-list">
              {filteredSales.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-sm sm:text-base">
                    {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda elegível para devolução'}
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
                      onClick={() => setSelectedSale(sale)}
                    >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 sm:mb-2 overflow-x-auto">
                          <h3 className="font-bold text-base sm:text-lg text-primary whitespace-nowrap flex-shrink-0">#{sale.id.slice(-8)}</h3>
                          <div className="flex-shrink-0">{getStatusBadge(sale.status)}</div>
                        </div>
                        
                        {/* Data e hora */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 sm:mb-3">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {sale.status === 'FECHADA' 
                              ? `Finalizada em ${format(new Date((sale as any).closed_at || sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                              : `Criada em ${format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
                            }
                          </span>
                        </div>

                        {/* Cliente e Vendedor */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm mb-2 sm:mb-3 overflow-x-auto">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-muted-foreground flex-shrink-0">Cliente:</span>
                            <span className="font-medium whitespace-nowrap">{sale.client?.name || 'Sem cliente'}</span>
                          </div>
                          {sale.user && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <User className="h-4 w-4 text-purple-600 flex-shrink-0" />
                              <span className="text-muted-foreground flex-shrink-0">Vendedor:</span>
                              <span className="font-medium whitespace-nowrap">{sale.user.name || 'Sem vendedor'}</span>
                                </div>
                              )}
                              </div>

                        {/* Valor e produtos */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Valor:</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(sale.total_cents || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-muted-foreground">
                              {(sale as any).items?.length || 0} produto(s)
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
                    const produtoExiste = true; // Varejo sempre devolve, então sempre existe
                    
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
                            <p className="font-medium text-sm sm:text-base">{item.product?.name || 'Produto não encontrado'}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Quantidade: {item.qty} | Preço: {formatCurrency(item.unit_price_cents || 0)}
                            </p>
                    </div>
                  </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm sm:text-base">{formatCurrency((item.unit_price_cents || 0) * item.qty)}</p>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-red-700">
                <strong>Atenção:</strong> A devolução irá excluir a venda do histórico e devolver os produtos ao estoque. 
                Produtos que não existem mais no sistema serão apenas removidos do histórico.
                    </div>
                  </div>
                </div>

                {/* Botões de ação */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t devolucao-actions">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
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
