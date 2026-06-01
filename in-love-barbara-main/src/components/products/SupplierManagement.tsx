import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus, Search, Phone } from "lucide-react"
import { useSuppliers, Supplier, SupplierInput } from "@/hooks/useSuppliers"
import { SupplierFormDialog } from "./SupplierFormDialog"
import { SupplierDeleteDialog } from "./SupplierDeleteDialog"

export function SupplierManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { suppliers, isLoading, deleteSupplier, refreshSuppliers } = useSuppliers(searchTerm)

  const formatPhoneDisplay = (phone?: number) => {
    if (!phone) return null
    
    const phoneStr = phone.toString()
    if (phoneStr.length === 11) {
      // (XX) 9 XXXX-XXXX
      return `(${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 3)} ${phoneStr.slice(3, 7)}-${phoneStr.slice(7)}`
    } else if (phoneStr.length === 10) {
      // (XX) XXXX-XXXX
      return `(${phoneStr.slice(0, 2)}) ${phoneStr.slice(2, 6)}-${phoneStr.slice(6)}`
    }
    return phoneStr
  }

  const handleDelete = async (supplier: Supplier) => {
    try {
      await deleteSupplier(supplier.id)
      setDeletingSupplier(null)
    } catch (error) {
      // Erro já tratado no hook
    }
  }

  const handleCreateSuccess = async (newSupplier: Supplier) => {
    console.log('✅ Fornecedor criado no SupplierManagement:', newSupplier.name)
    // Forçar refresh da lista para garantir que o novo fornecedor apareça
    console.log('🔄 Forçando refresh da lista de fornecedores...')
    setIsRefreshing(true)
    try {
      await refreshSuppliers()
    } finally {
      setIsRefreshing(false)
    }
    // Fechar o diálogo após o refresh
    setIsCreateOpen(false)
  }

  const handleEditSuccess = async (updatedSupplier: Supplier) => {
    console.log('✅ Fornecedor editado no SupplierManagement:', updatedSupplier.name)
    // Forçar refresh da lista para garantir que as alterações apareçam
    console.log('🔄 Forçando refresh da lista de fornecedores...')
    setIsRefreshing(true)
    try {
      await refreshSuppliers()
    } finally {
      setIsRefreshing(false)
    }
    // Fechar o diálogo após o refresh
    setEditingSupplier(null)
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-2.5 xs:gap-3.5 sm:gap-4 md:gap-4 lg:gap-5 tablet:gap-6 flex-nowrap min-w-0 overflow-visible">
          <CardTitle className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 min-w-0 flex-shrink max-w-[calc(100%-110px)] xs:max-w-[calc(100%-125px)] sm:max-w-[calc(100%-160px)] md:max-w-[calc(100%-180px)] lg:max-w-none">
            <span className="whitespace-nowrap text-xs xs:text-sm sm:text-base lg:text-lg">Fornecedores</span>
            <span className="whitespace-nowrap text-xs xs:text-sm sm:text-base lg:text-lg">({suppliers.length})</span>
            {isRefreshing && <span className="ml-0.5 xs:ml-1 sm:ml-2 text-[10px] xs:text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Atualizando...</span>}
          </CardTitle>
          <Button onClick={() => setIsCreateOpen(true)} className="flex-shrink-0 whitespace-nowrap text-[9px] xs:text-xs sm:text-sm lg:text-sm px-1 xs:px-2 sm:px-3 lg:px-4 h-7 xs:h-8 sm:h-9 lg:h-10">
            <Plus className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2" />
            <span className="hidden btn:inline">Novo Fornecedor</span>
            <span className="btn:hidden text-[9px] xs:text-xs">Novo</span>
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
          <Input
            placeholder="Buscar por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Carregando fornecedores...</div>
        ) : suppliers.length > 0 ? (
          <div className="space-y-3">
            {suppliers.map((supplier) => (
              <div 
                key={supplier.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{supplier.name}</h3>
                  {supplier.whatsapp ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Phone className="h-3 w-3 mr-1" />
                        {formatPhoneDisplay(supplier.whatsapp)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSupplier(supplier)}
                    title="Editar fornecedor"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingSupplier(supplier)}
                    title="Excluir fornecedor"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <SupplierFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {editingSupplier && (
        <SupplierFormDialog
          open={!!editingSupplier}
          onOpenChange={(open) => !open && setEditingSupplier(null)}
          supplier={editingSupplier}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingSupplier && (
        <SupplierDeleteDialog
          open={!!deletingSupplier}
          onOpenChange={(open) => !open && setDeletingSupplier(null)}
          supplier={deletingSupplier}
          onSuccess={() => {
            handleDelete(deletingSupplier)
          }}
        />
      )}
    </Card>
  )
}