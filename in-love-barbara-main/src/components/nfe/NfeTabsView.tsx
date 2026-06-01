import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NfeImport } from '@/hooks/useNfeImports';
import { NfeList } from './NfeList';
import { NfeReconciliationView } from './NfeReconciliationView';
import { NfeViewDialog } from './NfeViewDialog';
import { NfeBulkDeleteDialog } from './NfeBulkDeleteDialog';
import type { ReconciliationItem } from '@/hooks/useProductReconciliation';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface NfeTabsViewProps {
  nfeImports: NfeImport[];
  isLoading: boolean;
  onApplyToStock: (nfeId: string, reconciliationItems?: ReconciliationItem[]) => Promise<void>;
  onExportCsv: (nfeId: string) => void;
  onDeleteNfe?: (nfeId: string) => Promise<void>;
  onDeleteMultipleNfes?: (ids: string[]) => Promise<void>;
  onRefresh?: () => void;
  selectedTab?: string;
  onTabChange?: (tab: string) => void;
  selectedNfeId?: string | null;
  onNfeSelected?: (nfeId: string | null) => void;
}

export function NfeTabsView({ 
  nfeImports, 
  isLoading, 
  onApplyToStock, 
  onExportCsv,
  onDeleteNfe,
  onDeleteMultipleNfes,
  onRefresh,
  selectedTab: externalSelectedTab,
  onTabChange,
  selectedNfeId,
  onNfeSelected
}: NfeTabsViewProps) {
  const [selectedNfe, setSelectedNfe] = useState<NfeImport | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(externalSelectedTab || 'pending');
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Usar o tab externo se fornecido
  const activeTab = externalSelectedTab || currentTab;

  // Lidar com seleção de NF-e quando ID é fornecido
  useEffect(() => {
    if (selectedNfeId && nfeImports.length > 0) {
      const nfe = nfeImports.find(n => n.id === selectedNfeId);
      if (nfe) {
        setSelectedNfe(nfe);
        setIsViewDialogOpen(true);
        // Limpar seleção após abrir
        if (onNfeSelected) {
          onNfeSelected(null);
        }
      }
    }
  }, [selectedNfeId, nfeImports, onNfeSelected]);

  const handleViewNfe = (nfe: NfeImport) => {
    setSelectedNfe(nfe);
    setIsViewDialogOpen(true);
  };

  const handleBulkDelete = async (selectedIds: string[]) => {
    if (onDeleteMultipleNfes) {
      await onDeleteMultipleNfes(selectedIds);
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Por enquanto, todas as notas vão para "Pendentes" pois o sistema Supabase
  // ainda não implementa mudança de status
  const pendingNfes = nfeImports
    .filter(nfe => nfe.status === 'PENDING' || !nfe.status)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const importedNfes = nfeImports
    .filter(nfe => nfe.status === 'IMPORTED')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  

  return (
    <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
      <div className="w-full overflow-x-hidden">
        <TabsList className="grid w-full grid-cols-2 !h-auto min-h-[2.75rem] sm:min-h-[2.5rem] gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-md bg-muted">
          <TabsTrigger 
            value="pending" 
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
          >
            <span className="truncate">Pendentes</span>
          {pendingNfes.length > 0 && (
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] flex-shrink-0 h-4 sm:h-5 px-1 sm:px-1.5 min-w-[1.25rem] sm:min-w-[1.5rem] flex items-center justify-center">
              {pendingNfes.length}
            </Badge>
          )}
        </TabsTrigger>
          <TabsTrigger 
            value="imported" 
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
          >
            <span className="truncate">Importadas</span>
          {importedNfes.length > 0 && (
              <Badge variant="default" className="text-[9px] sm:text-[10px] flex-shrink-0 h-4 sm:h-5 px-1 sm:px-1.5 min-w-[1.25rem] sm:min-w-[1.5rem] flex items-center justify-center">
              {importedNfes.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="pending" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
        <div className="bg-card border rounded-lg">
          <div className="p-4 xl:p-6 border-b">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex-1 min-w-0 max-w-full">
                <h3 className="text-base xl:text-lg font-semibold break-words">Notas Fiscais Pendentes ({pendingNfes.length})</h3>
                <p className="text-xs xl:text-sm text-muted-foreground mt-1 break-words">Aguardando reconciliação e aplicação ao estoque</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                {pendingNfes.length > 0 && onDeleteMultipleNfes && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                    className="text-xs xl:text-sm w-full sm:w-auto"
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
                    className="text-xs xl:text-sm w-full sm:w-auto"
                  >
                    Atualizar
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 xl:p-6">
            {pendingNfes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma nota fiscal pendente
              </div>
            ) : (
              <div className="space-y-3 xl:space-y-4">
                {pendingNfes.map((nfe) => (
                  <NfeReconciliationView 
                    key={nfe.id}
                    nfe={nfe}
                    onApplyToStock={onApplyToStock}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="imported" className="mt-3 sm:mt-4">
        <NfeList
          title="Notas Fiscais Importadas"
          description="Já aplicadas ao estoque"
          nfeImports={importedNfes}
          isLoading={isLoading}
          onDeleteNfe={onDeleteNfe}
          onDeleteMultipleNfes={onDeleteMultipleNfes}
          onViewNfe={handleViewNfe}
          onRefresh={onRefresh}
          showActions={false}
          showDelete={true}
        />
      </TabsContent>


      <NfeViewDialog 
        nfe={selectedNfe}
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      <NfeBulkDeleteDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        nfeImports={pendingNfes}
        onDeleteSelected={handleBulkDelete}
        isDeleting={false}
      />
    </Tabs>
  );
}