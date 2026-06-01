import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, AlertTriangle, Package, Clock } from 'lucide-react';
import { NfeImport } from '@/hooks/useNfeImports';
import { NfeReconciliationModal } from './NfeReconciliationModal';
import { NfeValidationErrors } from './NfeValidationErrors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NfeReconciliationViewProps {
  nfe: NfeImport;
  onApplyToStock: (nfeId: string, reconciliationItems?: any[]) => Promise<void>;
  isApplying?: boolean;
}

export function NfeReconciliationView({ 
  nfe, 
  onApplyToStock, 
  isApplying = false 
}: NfeReconciliationViewProps) {
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);

  const handleReconcileClick = () => {
    setIsReconciliationModalOpen(true);
  };

  const handleApplyToStock = async (nfeId: string, reconciliationItems: any[]) => {
    await onApplyToStock(nfeId, reconciliationItems);
    setIsReconciliationModalOpen(false);
  };

  const itemsCount = nfe.xml?.parsed?.itens?.length || nfe.nfe_items?.length || 0;

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3 xl:pb-6">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div className="flex-1 min-w-0 max-w-full">
              <CardTitle className="flex items-start gap-2 text-base xl:text-lg">
                <FileText className="h-4 w-4 xl:h-5 xl:w-5 flex-shrink-0 mt-0.5" />
                <span className="break-words leading-tight">{nfe.emitente_nome || nfe.issuer_name || 'Fornecedor não identificado'}</span>
              </CardTitle>
              <div className="space-y-1 mt-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 xl:gap-x-4 text-xs xl:text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">NF-e #{nfe.numero || nfe.id.slice(-8).toUpperCase()}</span>
                  <span className="whitespace-nowrap">Série: {nfe.serie || '001'}</span>
                  {nfe.emitente_cnpj && <span className="whitespace-nowrap">CNPJ: {nfe.emitente_cnpj}</span>}
                  {nfe.data_emissao && (
                    <span className="whitespace-nowrap">
                      Emissão: {format(new Date(nfe.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  )}
                </div>
                {nfe.chave_acesso && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded inline-block break-all leading-relaxed">
                    Chave: {nfe.chave_acesso}
                  </div>
                )}
              </div>
            </div>
            <div className="text-left xl:text-right flex-shrink-0 xl:min-w-[120px]">
              <div className="font-bold text-base xl:text-lg whitespace-nowrap">
                R$ {(nfe.valor_total || (nfe.total_cents || 0) / 100).toFixed(2)}
              </div>
              <div className="text-xs xl:text-sm text-muted-foreground whitespace-nowrap">
                {itemsCount} itens
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 xl:pt-4">
          <div className="space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  Pendente
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <Package className="h-3 w-3" />
                  {itemsCount} produtos
                </Badge>
              </div>
              
              <Button 
                onClick={handleReconcileClick}
                disabled={isApplying}
                className="flex items-center gap-2 w-full xl:w-auto text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                {isApplying ? 'Processando...' : 'Reconciliar e Aplicar'}
              </Button>
            </div>
            
            {/* Exibe erros e avisos de validação */}
            <NfeValidationErrors 
              errors={nfe.errors || []}
              warnings={nfe.warnings || []}
              title="Detalhes da Validação"
            />
          </div>
        </CardContent>
      </Card>

      <NfeReconciliationModal
        isOpen={isReconciliationModalOpen}
        onOpenChange={setIsReconciliationModalOpen}
        nfe={nfe}
        onApplyToStock={handleApplyToStock}
        isApplying={isApplying}
      />
    </>
  );
}