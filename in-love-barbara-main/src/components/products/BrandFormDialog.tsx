import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useBrands, Brand } from "@/hooks/useBrands"

interface BrandFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand?: Brand
  onSuccess: (brand: Brand) => void
}

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
  onSuccess
}: BrandFormDialogProps) {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { createBrand, updateBrand } = useBrands()

  const isEditing = !!brand

  useEffect(() => {
    if (brand) {
      setName(brand.name)
    } else {
      setName("")
    }
  }, [brand])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      let result: Brand

      if (isEditing && brand?.id) {
        result = await updateBrand(brand.id, name.trim())
      } else {
        result = await createBrand(name.trim())
      }

      toast({
        title: "Sucesso",
        description: isEditing ? "Marca atualizada com sucesso" : "Marca criada com sucesso"
      })

      onSuccess(result)
      onOpenChange(false)
    } catch (error: any) {
      // Erro já tratado no hook useBrands
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Marca" : "Nova Marca"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da marca *</Label>
            <Input
              id="name"
              placeholder="Nome da marca"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              autoFocus
              disabled={isLoading}
            />
            {!name.trim() && (
              <p className="text-xs text-destructive">
                Nome é obrigatório
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1"
            >
              {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}