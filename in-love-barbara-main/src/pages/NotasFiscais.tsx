import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Package, AlertTriangle, Download } from "lucide-react"
import { useState } from "react"
import { useNfeImportsSupabase as useNfe } from "@/hooks/useNfeImportsSupabase"
import { NfeUploadDialog } from "@/components/nfe/NfeUploadDialog"
import { NfeTabsView } from "@/components/nfe/NfeTabsView"
import { NfeExportDialog } from "@/components/nfe/NfeExportDialog"
import { NfeImportErrorModal } from "@/components/nfe/NfeImportErrorModal"
import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function NotasFiscais() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('NotasFiscais')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean
    error: any
  }>({
    isOpen: false,
    error: null
  })
  const [selectedTab, setSelectedTab] = useState('pending')
  const [selectedNfeId, setSelectedNfeId] = useState<string | null>(null)
  const { 
    nfeImports, 
    isLoading, 
    importXml, 
    applyNfeToStock, 
    exportCsv,
    exportSelectedNfes,
    deleteNfe,
    deleteMultipleNfes,
    loadNfeImports
  } = useNfe()

  const handleFilesSelected = async (files: File[]) => {
    try {
      for (const file of files) {
        await importXml(file)
      }
      // Atualizar automaticamente após importação
      await loadNfeImports()
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('Erro ao importar arquivos:', error)
      console.log('🔍 [Debug] Tipo do erro:', typeof error)
      console.log('🔍 [Debug] Erro tem type?', error?.type)
      console.log('🔍 [Debug] Erro completo:', error)
      
      // Se o erro é estruturado (do nosso hook), mostrar modal
      if (error && typeof error === 'object' && error.type) {
        console.log('🔍 [Debug] Configurando modal com erro estruturado')
        setErrorModal({
          isOpen: true,
          error: error
        })
      } else {
        // Erro genérico - mostrar modal com erro básico
        setErrorModal({
          isOpen: true,
          error: {
            type: 'processing',
            title: 'Erro ao importar NF-e',
            message: error?.message || 'Ocorreu um erro inesperado ao importar a nota fiscal.',
            details: {
              fileName: files[0]?.name
            },
            suggestions: [
              'Verifique se o arquivo está válido',
              'Tente importar novamente',
              'Entre em contato com o suporte se o problema persistir'
            ]
          }
        })
      }
    }
  }

  const handleApplyToStock = async (nfeId: string, reconciliationItems?: any[]) => {
    try {
      await applyNfeToStock(nfeId, reconciliationItems)
      // Atualizar automaticamente após aplicar ao estoque
      await loadNfeImports()
    } catch (error) {
      console.error('Erro ao aplicar NF-e ao estoque:', error)
    }
  }

  const handleViewExistingNfe = (nfeId: string) => {
    // Navegar para a aba "Importadas"
    setSelectedTab('imported')
    // Selecionar a nota específica
    setSelectedNfeId(nfeId)
  }

  // Por enquanto, todas as notas vão para "Pendentes" pois o sistema Supabase
  // ainda não implementa mudança de status
  const importedNfes = Array.isArray(nfeImports) ? nfeImports
    .filter(nfe => nfe.status === 'IMPORTED')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
  
  const pendingNfes = Array.isArray(nfeImports) ? nfeImports
    .filter(nfe => nfe.status === 'PENDING' || !nfe.status)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
  
  // Itens apenas das notas importadas
  const importedItems = importedNfes.reduce((acc, nfe) => {
    return acc + (nfe.nfe_items?.reduce((itemTotal, item) => {
      const qty = item.reconciled_qty !== null && item.reconciled_qty !== undefined 
        ? item.reconciled_qty 
        : item.qty;
      return itemTotal + qty;
    }, 0) || 0);
  }, 0);
  
  const importedThisMonth = importedNfes.filter(nfe => {
    const nfeDate = new Date(nfe.created_at)
    const now = new Date()
    return nfeDate.getMonth() === now.getMonth() && nfeDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Notas Fiscais</h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground break-words mt-1">Importar e gerenciar notas fiscais de entrada</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={() => setIsExportDialogOpen(true)}
            className="w-full sm:w-auto xl:flex-initial text-xs lg:text-sm"
          >
            <Download className="mr-2 h-3.5 w-3.5 xl:h-4 xl:w-4" />
            Exportar ZIP
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="w-full sm:w-auto xl:flex-initial text-xs lg:text-sm"
          >
            <Upload className="mr-2 h-3.5 w-3.5 xl:h-4 xl:w-4" />
            Importar XML NF-e
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="min-h-[140px] flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs lg:text-sm font-medium">NF-e Importadas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{importedNfes.length}</div>
            <p className="text-xs text-muted-foreground min-h-[32px]">{importedThisMonth} este mês</p>
          </CardContent>
        </Card>

        <Card className="min-h-[140px] flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Itens Importados</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{importedItems}</div>
            <p className="text-xs text-muted-foreground min-h-[32px]">unidades no estoque</p>
          </CardContent>
        </Card>

        <Card className="min-h-[140px] flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{pendingNfes.length}</div>
            <p className="text-xs text-muted-foreground min-h-[32px]">aguardando processamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com listas de NF-e */}
        <NfeTabsView
          nfeImports={Array.isArray(nfeImports) ? nfeImports : []}
          isLoading={isLoading}
          onApplyToStock={handleApplyToStock}
          onDeleteNfe={deleteNfe}
          onDeleteMultipleNfes={deleteMultipleNfes}
          onRefresh={loadNfeImports}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          selectedNfeId={selectedNfeId}
          onNfeSelected={setSelectedNfeId}
        />

      {/* Dialog de upload */}
      <NfeUploadDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onFilesSelected={handleFilesSelected}
        isUploading={isLoading}
      />

      {/* Dialog de exportação */}
      <NfeExportDialog
        isOpen={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        nfeImports={nfeImports}
      />

      {/* Modal de erro de importação */}
      {errorModal.error && (
        <NfeImportErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ isOpen: false, error: null })}
          onViewExistingNfe={handleViewExistingNfe}
          error={errorModal.error}
        />
      )}
    </div>
  )
}