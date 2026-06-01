import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useBrands, Brand } from "@/hooks/useBrands"
import { BrandFormDialog } from "./BrandFormDialog"

interface BrandSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  showAddNew?: boolean
  onRefresh?: () => void
}

export function BrandSelect({ 
  value, 
  onValueChange, 
  placeholder = "Selecione uma marca...",
  showAddNew = false,
  onRefresh
}: BrandSelectProps) {
  const { brands, refetch } = useBrands()
  const [showNewBrandDialog, setShowNewBrandDialog] = useState(false)

  const handleNewBrandSuccess = async (newBrand: Brand) => {
    // Recarregar a lista de marcas para garantir que está atualizada
    await refetch()
    // Notificar o componente pai sobre o refresh
    onRefresh?.()
    // Selecionar a nova marca automaticamente
    onValueChange?.(newBrand.id)
    setShowNewBrandDialog(false)
  }

  return (
    <div className="space-y-2 relative z-0">
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="z-[110]" position="popper">
            {brands.length === 0 ? (
              <SelectItem value="no-brands" disabled>
                Nenhuma marca cadastrada
              </SelectItem>
            ) : (
              brands
                .filter((brand) => brand.id && brand.id.trim() !== '')
                .map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
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
            onClick={() => setShowNewBrandDialog(true)}
            title="Criar nova marca"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <BrandFormDialog
        open={showNewBrandDialog}
        onOpenChange={setShowNewBrandDialog}
        onSuccess={handleNewBrandSuccess}
      />
    </div>
  )
}