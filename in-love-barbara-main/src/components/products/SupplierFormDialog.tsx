import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useSuppliers, Supplier, SupplierInput } from "@/hooks/useSuppliers"

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier
  onSuccess: (supplier: Supplier) => void
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess
}: SupplierFormDialogProps) {
  const [name, setName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { createSupplier, updateSupplier } = useSuppliers()

  const isEditing = !!supplier

  useEffect(() => {
    if (supplier) {
      setName(supplier.name)
      setWhatsapp(supplier.whatsapp ? supplier.whatsapp.toString() : "")
    } else {
      setName("")
      setWhatsapp("")
    }
  }, [supplier])

  // Limpar formulário quando o diálogo abre para criar novo fornecedor
  useEffect(() => {
    if (open && !supplier) {
      setName("")
      setWhatsapp("")
    }
  }, [open, supplier])

  const formatWhatsAppInput = (value: string) => {
    // Remove todos os caracteres não numéricos
    const digits = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limitedDigits = digits.slice(0, 11)
    
    // Aplica a máscara baseado no comprimento
    if (limitedDigits.length <= 2) {
      return limitedDigits
    } else if (limitedDigits.length <= 3) {
      return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2)}`
    } else if (limitedDigits.length <= 7) {
      return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 3)} ${limitedDigits.slice(3)}`
    } else {
      return `(${limitedDigits.slice(0, 2)}) ${limitedDigits.slice(2, 3)} ${limitedDigits.slice(3, 7)}-${limitedDigits.slice(7)}`
    }
  }

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsAppInput(e.target.value)
    setWhatsapp(formatted)
  }

  const getDigitsOnly = (value: string | null | undefined) => {
    if (!value || typeof value !== 'string') return ''
    return value.replace(/\D/g, '')
  }

  const validateWhatsApp = (value: string | null | undefined) => {
    if (!value || typeof value !== 'string') return true // WhatsApp é opcional
    
    const digits = getDigitsOnly(value)
    return digits.length === 10 || digits.length === 11
  }

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

    // Validação de limite para etiquetas QR Code 
    if (name.length > 13) {
      toast({
        title: "Erro",
        description: "Nome do fornecedor deve ter no máximo 13 caracteres para etiquetas QR Code",
        variant: "destructive"
      })
      return
    }

    if (whatsapp && !validateWhatsApp(whatsapp)) {
      toast({
        title: "Erro",
        description: "WhatsApp deve ter 10 ou 11 dígitos",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const supplierData: SupplierInput = {
        name: name.trim(),
        whatsapp: whatsapp ? getDigitsOnly(whatsapp) : undefined
      }

      let result: Supplier

      if (isEditing && supplier?.id) {
        result = await updateSupplier(supplier.id, supplierData)
      } else {
        result = await createSupplier(supplierData)
      }

      onSuccess(result)
    } catch (error: any) {
      // Erro já tratado no hook useSuppliers
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Limpar formulário ao fechar
      setName("")
      setWhatsapp("")
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              placeholder="Nome do fornecedor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={13}
              required
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Máximo 13 caracteres para etiquetas QR Code
            </p>
            {!name.trim() && (
              <p className="text-xs text-destructive">
                Nome é obrigatório
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              placeholder="(31) 9 1234-5678"
              value={whatsapp}
              onChange={handleWhatsAppChange}
              maxLength={16} // Para comportar a máscara formatada
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Apenas números serão exibidos.
            </p>
            {whatsapp && !validateWhatsApp(whatsapp) && (
              <p className="text-xs text-destructive">
                WhatsApp deve ter 10 ou 11 dígitos
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
              disabled={isLoading || !name.trim() || (whatsapp && !validateWhatsApp(whatsapp))}
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