import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Package, Calendar, Building2, Search, X } from 'lucide-react';
import { NfeImport } from '@/hooks/useNfeImports';
import { useState, useMemo } from 'react';

interface NfeViewDialogProps {
  nfe: NfeImport | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NfeViewDialog({ nfe, isOpen, onOpenChange }: NfeViewDialogProps) {
  // ✅ Hooks SEMPRE devem vir ANTES de qualquer return condicional
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar itens baseado na busca
  const filteredItems = useMemo(() => {
    if (!nfe?.nfe_items) return [];
    
    if (!searchTerm.trim()) return nfe.nfe_items;
    
    const term = searchTerm.toLowerCase();
    return nfe.nfe_items.filter(item => 
      (item.description || '').toLowerCase().includes(term) ||
      (item.product_code || '').toLowerCase().includes(term)
    );
  }, [nfe?.nfe_items, searchTerm]);

  // ✅ Early return DEPOIS de todos os hooks
  if (!nfe) return null;

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'IMPORTED':
        return 'default';
      case 'INVALID':
      case 'DUPLICATE':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'IMPORTED':
        return 'Importada';
      case 'INVALID':
        return 'Inválida';
      case 'DUPLICATE':
        return 'Duplicada';
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl xl:max-w-4xl h-auto max-h-[90vh] overflow-y-auto p-3 sm:p-4 xl:p-6">
        <DialogHeader className="pb-2 sm:pb-3 xl:pb-4">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pr-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-sm sm:text-base xl:text-lg break-words leading-tight">
                NF-e #{nfe.id.slice(-8).toUpperCase()}
              </span>
            </div>
            <Badge variant={getStatusVariant(nfe.status)} className="text-xs whitespace-nowrap w-fit">
              {getStatusLabel(nfe.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 xl:space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Emitente</p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words leading-tight">{nfe.issuer_name || 'N/A'}</p>
                </div>
              </div>
              
              <div className="pl-5 sm:pl-0">
                <p className="text-xs sm:text-sm font-medium">CNPJ</p>
                <p className="text-xs sm:text-sm text-muted-foreground break-all">{nfe.emitente_cnpj || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium">Data de Emissão</p>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                    {nfe.data_emissao ? new Date(nfe.data_emissao).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="pl-5 sm:pl-0">
                <p className="text-xs sm:text-sm font-medium">Data de Importação</p>
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(nfe.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Chave de Acesso */}
          {nfe.chave_acesso && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 xl:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-xs sm:text-sm font-medium text-blue-900 mb-1">Chave de Acesso da NF-e</p>
                  <p className="text-[10px] sm:text-xs xl:text-sm font-mono text-blue-700 break-all leading-relaxed">
                    {nfe.chave_acesso}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Totais */}
          <div className="bg-muted/50 rounded-lg p-2 sm:p-3 xl:p-4">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">Resumo Financeiro</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Valor Total</p>
                <p className="text-base sm:text-lg xl:text-xl font-bold text-primary whitespace-nowrap">
                  R$ {(nfe.valor_total || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground break-words leading-tight">
                  {nfe.status === 'IMPORTED' ? 'Unidades Aplicadas' : 'Total de Itens'}
                </p>
                <p className="text-base sm:text-lg xl:text-xl font-bold break-words">
                  {(() => {
                    const qtyApplied = (nfe.nfe_items ?? []).reduce((a, i) => a + ((i.reconciled_qty ?? i.qty) || 0), 0);
                    if (nfe.status === 'IMPORTED') {
                      const qtyXml = (nfe.nfe_items ?? []).reduce((a, i) => a + (i.qty || 0), 0);
                      return `${qtyApplied} (NFe: ${qtyXml})`;
                    }
                    return qtyApplied;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(nfe.status)} className="mt-1 text-xs whitespace-nowrap">
                  {getStatusLabel(nfe.status)}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lista de Produtos */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2 flex-shrink-0">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Produtos ({nfe.nfe_items?.length || 0})</span>
              </h3>
              
              {/* Barra de busca */}
              <div className="relative w-full sm:w-64 xl:w-80">
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-8 text-[11px] sm:text-sm h-8 sm:h-9"
                  style={{ paddingLeft: '3rem' }}
                />
                <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {nfe.nfe_items && nfe.nfe_items.length > 0 ? (
              <div className="space-y-2">
                {/* Lista de produtos */}
                <div className="max-h-72 sm:max-h-80 xl:max-h-96 overflow-y-auto border rounded-lg">
                  {filteredItems.map((item, index) => {
                    const qtdNfe = item.qty || 0;
                    // Try different property names for unit and total values
                    const valorUnitario = (item as any).valorUnitario || (item as any).unit_price || 0;
                    const valorTotal = (item as any).valorTotal || (valorUnitario * qtdNfe);
                    
                    return (
                      <div
                        key={item.id || index} 
                        className="flex items-start sm:items-center p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Informações do produto */}
                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                          <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 xl:w-8 xl:h-8 bg-muted rounded-full flex items-center justify-center text-[10px] sm:text-xs xl:text-sm font-medium">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="font-medium text-xs sm:text-sm break-words leading-tight mb-1">
                              {item.description || 'Produto sem descrição'}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                              <div className="flex flex-wrap gap-x-1 leading-snug">
                                {item.product_code && (
                                  <>
                                    <span className="break-all">Cód: {item.product_code}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span className="whitespace-nowrap">Qtd: {qtdNfe}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-1 mt-0.5 leading-snug">
                                <span className="whitespace-nowrap">Unit: R$ {valorUnitario.toFixed(2)}</span>
                                <span>•</span>
                                <span className="whitespace-nowrap font-medium">Total: R$ {valorTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Resumo da busca */}
                {searchTerm && (
                  <div className="flex items-center justify-center sm:justify-end p-2 sm:p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                      Mostrando {filteredItems.length} de {nfe.nfe_items.length} produtos
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 xl:h-12 xl:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-xs sm:text-sm">Nenhum produto encontrado nesta nota fiscal</p>
              </div>
            )}
          </div>

          {/* Erro se houver */}
          {nfe.error_message && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 sm:p-3 xl:p-4">
              <h4 className="text-xs sm:text-sm font-semibold text-destructive mb-1 sm:mb-2">Erro de Processamento</h4>
              <p className="text-xs sm:text-sm text-destructive/80 break-words leading-snug">{nfe.error_message}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}