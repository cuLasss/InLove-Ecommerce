import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { NfeImport } from '@/hooks/useNfeImports';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportNfesToZip, downloadZipFile } from '@/lib/nfe-export';
import { useToast } from '@/hooks/use-toast';

interface NfeExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nfeImports: NfeImport[];
}

export function NfeExportDialog({
  isOpen,
  onOpenChange,
  nfeImports
}: NfeExportDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const { toast } = useToast();

  // Filtrar apenas notas importadas - ordenadas por data mais recente
  const importedNfes = nfeImports
    .filter(nfe => nfe.status === 'IMPORTED')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSelectAll = () => {
    if (selectedIds.length === importedNfes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(importedNfes.map(nfe => nfe.id));
    }
  };

  // Auto-selecionar todas as notas importadas apenas na primeira abertura do dialog
  useEffect(() => {
    if (isOpen && importedNfes.length > 0 && !hasInitialized) {
      setSelectedIds(importedNfes.map(nfe => nfe.id));
      setHasInitialized(true);
    }
    
    // Reset quando o dialog fechar
    if (!isOpen) {
      setHasInitialized(false);
      setSelectedIds([]);
    }
  }, [isOpen, importedNfes.length, hasInitialized]); // Use .length instead of the array itself

  const handleSelectNfe = (nfeId: string) => {
    setSelectedIds(prev => 
      prev.includes(nfeId) 
        ? prev.filter(id => id !== nfeId)
        : [...prev, nfeId]
    );
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setIsExporting(true);
      
      // Filtra as NF-es selecionadas
      const selectedNfes = importedNfes.filter(nfe => selectedIds.includes(nfe.id));
      
      // Exporta para ZIP
      const result = await exportNfesToZip(selectedNfes, {
        includeXml: true,
        includeIndex: true,
        includeSummary: true
      });
      
      // Faz download do arquivo
      downloadZipFile(result);
      
      // Mostra mensagem de sucesso
      toast({
        title: 'Exportação concluída',
        description: `ZIP gerado com ${result.fileCount} arquivo(s) - ${(result.totalSize / 1024).toFixed(1)} KB`,
        variant: 'default'
      });
      
      setSelectedIds([]);
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Erro ao exportar NF-es:', error);
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Erro desconhecido ao gerar arquivo ZIP',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] xl:max-w-4xl max-h-[85vh] xl:max-h-[80vh] overflow-hidden flex flex-col p-4 xl:p-6">
        <DialogHeader className="pb-3 xl:pb-4">
          <DialogTitle className="flex items-center gap-2 text-base xl:text-lg">
            <Download className="h-4 w-4 xl:h-5 xl:w-5 flex-shrink-0" />
            <span className="break-words leading-tight">Exportar Notas Fiscais em ZIP</span>
          </DialogTitle>
          <p className="text-xs xl:text-sm text-muted-foreground break-words">
            Exporte todas as notas fiscais importadas em um arquivo ZIP com planilhas formatadas para o contador
          </p>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 xl:py-3 border-b">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedIds.length === importedNfes.length && importedNfes.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-xs xl:text-sm font-medium cursor-pointer break-words">
              {selectedIds.length === importedNfes.length ? 'Desmarcar todas' : 'Selecionar todas'} ({importedNfes.length} disp.)
            </label>
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap self-start sm:self-center">
            {selectedIds.length} selecionada(s)
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {importedNfes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Nenhuma nota fiscal importada
              </h3>
              <p className="text-muted-foreground text-sm">
                Apenas notas fiscais já processadas podem ser exportadas
              </p>
            </div>
          ) : (
            importedNfes.map((nfe) => (
              <Card key={nfe.id} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="p-3 xl:p-4">
                  <div className="flex items-start gap-2 xl:gap-3">
                    <Checkbox
                      id={`nfe-${nfe.id}`}
                      checked={selectedIds.includes(nfe.id)}
                      onCheckedChange={() => handleSelectNfe(nfe.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs xl:text-sm break-words leading-tight">
                            {nfe.emitente_nome || nfe.issuer_name || 'Fornecedor não identificado'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-2 xl:gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span className="whitespace-nowrap">NF-e #{nfe.numero || nfe.id.slice(-8).toUpperCase()}</span>
                            <span className="whitespace-nowrap">Série: {nfe.serie || '001'}</span>
                            {nfe.emitente_cnpj && <span className="whitespace-nowrap">CNPJ: {nfe.emitente_cnpj}</span>}
                            {nfe.data_emissao && (
                              <span className="whitespace-nowrap">
                                Emissão: {format(new Date(nfe.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-left xl:text-right flex-shrink-0">
                          <div className="font-bold text-xs xl:text-sm whitespace-nowrap">
                            R$ {(nfe.valor_total || (nfe.total_cents || 0) / 100).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {nfe.total_products || nfe.nfe_items?.length || 0} itens
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 xl:pt-4 border-t">
          <div className="text-xs xl:text-sm text-muted-foreground break-words">
            {selectedIds.length > 0 && (
              <span>{selectedIds.length} nota(s) selecionada(s) para exportação</span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="text-xs xl:text-sm"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleExport}
              disabled={selectedIds.length === 0 || isExporting}
              className="text-xs xl:text-sm"
            >
              <Download className="h-3 w-3 xl:h-4 xl:w-4 mr-2" />
              {isExporting ? 'Gerando ZIP...' : `Exportar ZIP (${selectedIds.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}