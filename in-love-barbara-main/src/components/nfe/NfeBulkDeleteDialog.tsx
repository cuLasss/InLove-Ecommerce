import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, AlertTriangle } from 'lucide-react';
import { NfeImport } from '@/hooks/useNfeImports';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NfeBulkDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nfeImports: NfeImport[];
  onDeleteSelected: (selectedIds: string[]) => Promise<void>;
  isDeleting?: boolean;
}

export function NfeBulkDeleteDialog({
  isOpen,
  onOpenChange,
  nfeImports,
  onDeleteSelected,
  isDeleting = false
}: NfeBulkDeleteDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const handleSelectAll = () => {
    if (selectedIds.length === nfeImports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(nfeImports.map(nfe => nfe.id));
    }
  };

  // Auto-selecionar todas as notas apenas na primeira abertura do dialog
  useEffect(() => {
    if (isOpen && nfeImports.length > 0 && !hasInitialized) {
      setSelectedIds(nfeImports.map(nfe => nfe.id));
      setHasInitialized(true);
    }
    
    // Reset quando o dialog fechar
    if (!isOpen) {
      setHasInitialized(false);
      setSelectedIds([]);
    }
  }, [isOpen, nfeImports.length, hasInitialized]);

  const handleSelectNfe = (nfeId: string) => {
    setSelectedIds(prev => 
      prev.includes(nfeId) 
        ? prev.filter(id => id !== nfeId)
        : [...prev, nfeId]
    );
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      await onDeleteSelected(selectedIds);
      setSelectedIds([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao excluir NF-es:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'IMPORTED':
        return <Badge variant="default">Importada</Badge>;
      case 'INVALID':
        return <Badge variant="destructive">Inválida</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] xl:max-w-4xl h-auto max-h-[85vh] xl:max-h-[80vh] overflow-hidden flex flex-col p-3 sm:p-4 xl:p-6">
        <DialogHeader className="pb-2 sm:pb-3 xl:pb-4 space-y-2">
          <DialogTitle className="flex items-start sm:items-center gap-2 text-destructive text-sm sm:text-base xl:text-lg pr-8">
            <Trash2 className="h-4 w-4 sm:h-4 sm:w-4 xl:h-5 xl:w-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-words leading-tight">Excluir Notas Fiscais em Massa</span>
          </DialogTitle>
          <div className="flex items-start gap-2 text-xs sm:text-xs xl:text-sm text-muted-foreground">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0 mt-0.5" />
            <span className="break-words leading-snug">Esta ação não pode ser desfeita. As notas fiscais selecionadas serão permanentemente removidas.</span>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2 sm:py-2 xl:py-3 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedIds.length === nfeImports.length && nfeImports.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-xs sm:text-xs xl:text-sm font-medium cursor-pointer break-words leading-tight flex-1">
              {selectedIds.length === nfeImports.length ? 'Desmarcar todas' : 'Selecionar todas'} ({nfeImports.length} disp.)
            </label>
          </div>
          <Badge variant="destructive" className="text-xs whitespace-nowrap self-start w-fit">
            {selectedIds.length} selecionada(s)
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {nfeImports.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Nenhuma nota fiscal encontrada
              </h3>
              <p className="text-muted-foreground text-sm">
                Não há notas fiscais para excluir nesta categoria
              </p>
            </div>
          ) : (
            nfeImports.map((nfe) => (
              <Card key={nfe.id} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="p-2 sm:p-3 xl:p-4">
                  <div className="flex items-start gap-2 sm:gap-2 xl:gap-3">
                    <Checkbox
                      id={`nfe-${nfe.id}`}
                      checked={selectedIds.includes(nfe.id)}
                      onCheckedChange={() => handleSelectNfe(nfe.id)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-xs xl:text-sm break-words leading-tight">
                            {nfe.emitente_nome || nfe.issuer_name || 'Fornecedor não identificado'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-xs text-muted-foreground mt-1">
                            <span className="whitespace-nowrap">NF-e #{nfe.numero || nfe.id.slice(-8).toUpperCase()}</span>
                            <span className="whitespace-nowrap">Série: {nfe.serie || '001'}</span>
                            {nfe.emitente_cnpj && <span className="break-all sm:whitespace-nowrap text-[9px] sm:text-xs">CNPJ: {nfe.emitente_cnpj}</span>}
                            {nfe.data_emissao && (
                              <span className="whitespace-nowrap">
                                {format(new Date(nfe.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {getStatusBadge(nfe.status)}
                            {nfe.error_message && (
                              <span className="text-[10px] sm:text-xs text-destructive break-words line-clamp-1">
                                {nfe.error_code}: {nfe.error_message}
                              </span>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-xs sm:text-xs xl:text-sm whitespace-nowrap">
                              R$ {(nfe.valor_total || (nfe.total_cents || 0) / 100).toFixed(2)}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                              {nfe.total_products || nfe.nfe_items?.length || 0} itens
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:pt-3 xl:pt-4 border-t">
          <div className="text-[11px] sm:text-xs xl:text-sm text-muted-foreground break-words leading-tight">
            {selectedIds.length > 0 && (
              <span className="text-destructive font-medium">
                {selectedIds.length} nota(s) será(ão) excluída(s) permanentemente
              </span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-xs xl:text-sm w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={selectedIds.length === 0 || isDeleting}
              className="text-xs sm:text-xs xl:text-sm w-full sm:w-auto order-1 sm:order-2"
            >
              <Trash2 className="h-3 w-3 sm:h-3 sm:w-3 xl:h-4 xl:w-4 mr-2" />
              {isDeleting ? 'Excluindo...' : `Excluir ${selectedIds.length} nota(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
