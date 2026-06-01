import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle, AlertTriangle, Clock, Eye, Trash2 } from 'lucide-react';
import { NfeImport } from '@/hooks/useNfeImports';
import { NfeDeleteDialog } from './NfeDeleteDialog';
import { NfeBulkDeleteDialog } from './NfeBulkDeleteDialog';
import { NfeValidationErrors } from './NfeValidationErrors';

interface NfeListProps {
  title: string;
  description: string;
  nfeImports: NfeImport[];
  isLoading: boolean;
  onApplyToStock?: (nfeId: string) => void;
  onDeleteNfe?: (nfeId: string) => Promise<void>;
  onDeleteMultipleNfes?: (ids: string[]) => Promise<void>;
  onViewNfe?: (nfe: NfeImport) => void;
  onRefresh?: () => void;
  showActions?: boolean;
  showErrors?: boolean;
  showDelete?: boolean;
}

export function NfeList({ 
  title, 
  description, 
  nfeImports, 
  isLoading,
  onApplyToStock,
  onDeleteNfe,
  onDeleteMultipleNfes,
  onViewNfe,
  onRefresh,
  showActions = false,
  showErrors = false,
  showDelete = false
}: NfeListProps) {
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const handleBulkDelete = async (selectedIds: string[]) => {
    if (onDeleteMultipleNfes) {
      await onDeleteMultipleNfes(selectedIds);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'IMPORTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'INVALID':
      case 'DUPLICATE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 xl:p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base xl:text-lg break-words leading-tight">
              {title} ({nfeImports.length})
            </CardTitle>
            <p className="text-xs xl:text-sm text-muted-foreground mt-1 break-words">{description}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
            {nfeImports.length > 0 && onDeleteMultipleNfes && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                className="text-xs xl:text-sm"
              >
                <Trash2 className="h-3 w-3 xl:h-4 xl:w-4 mr-2" />
                Excluir em Massa
              </Button>
            )}
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="text-xs xl:text-sm"
              >
                Atualizar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {nfeImports.length > 0 ? (
          <div className="space-y-4">
            {nfeImports.map((nfe) => (
              <div key={nfe.id} className="border rounded-lg p-3 xl:p-4">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                  <div className="flex items-start gap-2 xl:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(nfe.status)}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 xl:gap-3">
                        <span className="font-semibold text-xs xl:text-sm whitespace-nowrap">
                          #{nfe.id.slice(-8).toUpperCase()}
                        </span>
                        <Badge variant={getStatusVariant(nfe.status)} className="text-xs whitespace-nowrap">
                          {getStatusLabel(nfe.status)}
                        </Badge>
                      </div>
                      
                      <div className="text-xs xl:text-sm text-muted-foreground space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium whitespace-nowrap">NF-e #{nfe.numero || nfe.id.slice(-8).toUpperCase()}</span>
                          <span className="whitespace-nowrap">Série: {nfe.serie || '001'}</span>
                        </div>
                        
                        {(nfe.emitente_cnpj || nfe.issuer_cnpj) && (
                          <div className="break-words">CNPJ: {nfe.emitente_cnpj || nfe.issuer_cnpj}</div>
                        )}
                        {(nfe.emitente_nome || nfe.issuer_name) && (
                          <div className="break-words">Emitente: {nfe.emitente_nome || nfe.issuer_name}</div>
                        )}
                        
                        <div className="break-words">
                          {(() => {
                            const qtyXml = (nfe.nfe_items ?? []).reduce((a, i) => a + (i.qty || 0), 0);
                            const qtyApplied = (nfe.nfe_items ?? []).reduce((a, i) => a + ((i.reconciled_qty ?? i.qty) || 0), 0);
                            return nfe.status === 'IMPORTED' 
                              ? `Unidades: ${qtyApplied} (NFe: ${qtyXml})`
                              : `${qtyXml} unidades`;
                          })()} em {nfe.total_products || nfe.nfe_items?.length || 0} produtos • 
                          Importado: {new Date(nfe.created_at).toLocaleDateString('pt-BR')}
                        </div>
                        
                        {(nfe.data_emissao || nfe.issued_at) && (
                          <div className="whitespace-nowrap">
                            Emissão: {new Date(nfe.data_emissao || nfe.issued_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        
                        {nfe.valor_total && (
                          <div className="font-medium text-green-600 whitespace-nowrap">
                            Valor: R$ {nfe.valor_total.toFixed(2)}
                          </div>
                        )}
                        
                        {/* Exibe erros e avisos de validação */}
                        {(nfe.errors && nfe.errors.length > 0) || (nfe.warnings && nfe.warnings.length > 0) ? (
                          <div className="mt-3">
                            <NfeValidationErrors 
                              errors={nfe.errors || []}
                              warnings={nfe.warnings || []}
                              title="Detalhes da Validação"
                            />
                          </div>
                        ) : null}
                        
                        {showErrors && nfe.error_message && (
                          <div className="text-red-600 bg-red-50 p-2 rounded text-xs">
                            <div className="font-medium">Erro: {nfe.error_code || 'ERRO_DESCONHECIDO'}</div>
                            <div>{nfe.error_message}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col xl:items-end gap-2 flex-shrink-0">
                    <div className="text-left xl:text-right">
                      <div className="text-base xl:text-lg font-bold text-primary whitespace-nowrap">
                        R$ {(nfe.valor_total || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 xl:gap-2">
                      {onViewNfe && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewNfe(nfe)}
                          className="text-xs whitespace-nowrap"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      )}
                      
                      {showActions && onApplyToStock && nfe.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => onApplyToStock(nfe.id)}
                          className="text-xs whitespace-nowrap"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aplicar
                        </Button>
                      )}
                      

                      {showDelete && onDeleteNfe && (
                        <NfeDeleteDialog 
                          onConfirm={() => onDeleteNfe(nfe.id)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              Nenhuma nota fiscal encontrada
            </h3>
            <p className="text-muted-foreground text-sm">
              {showActions 
                ? "Importe arquivos XML para começar" 
                : "Nenhum registro nesta categoria"}
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Diálogo de exclusão em massa */}
      <NfeBulkDeleteDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        nfeImports={nfeImports}
        onDeleteSelected={handleBulkDelete}
        isDeleting={false}
      />
    </Card>
  );
}