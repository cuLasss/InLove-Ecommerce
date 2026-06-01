import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useSuppliers, Supplier } from "@/hooks/useSuppliers"
import { SupplierFormDialog } from "./SupplierFormDialog"

interface SupplierSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  showAddNew?: boolean
  onRefresh?: () => void
}

export function SupplierSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione um fornecedor...",
  showAddNew = false,
  onRefresh
}: SupplierSelectProps) {
  const { suppliers, refreshSuppliers } = useSuppliers()
  const [showNewSupplierDialog, setShowNewSupplierDialog] = useState(false)

  const handleNewSupplierSuccess = async (newSupplier: Supplier) => {
    try {
      // Recarregar a lista de fornecedores para garantir que está atualizada
      await refreshSuppliers()
      // Notificar o componente pai sobre o refresh
      onRefresh?.()
      // Selecionar o novo fornecedor automaticamente
      onValueChange?.(newSupplier.id)
      // Fechar o diálogo
      setShowNewSupplierDialog(false)
    } catch (error) {
      console.error('Erro ao processar sucesso do fornecedor:', error)
      // Mesmo com erro, fechar o diálogo
      setShowNewSupplierDialog(false)
    }
  }

  return (
    <div className="space-y-2 relative z-0">
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="z-[110]" position="popper">
            {suppliers.length === 0 ? (
              <SelectItem value="no-suppliers" disabled>
                Nenhum fornecedor cadastrado
              </SelectItem>
            ) : (
              suppliers
                .filter((supplier) => supplier.id && supplier.id.trim() !== '')
                .map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))
            )}
          </SelectContent>
        </Select>
        
        {showAddNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowNewSupplierDialog(true)}
            title="Criar novo fornecedor"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <SupplierFormDialog
        open={showNewSupplierDialog}
        onOpenChange={setShowNewSupplierDialog}
        onSuccess={handleNewSupplierSuccess}
      />
    </div>
  )
}