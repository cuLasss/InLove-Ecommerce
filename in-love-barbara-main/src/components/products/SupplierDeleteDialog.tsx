import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
// Sistema local - não precisa de Supabase
interface Supplier {
  id: string
  name: string
}

interface SupplierDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier
  onSuccess: () => void
}

export function SupplierDeleteDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess
}: SupplierDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      // Sistema local - verificar produtos vinculados no localStorage
      const productsData = JSON.parse(localStorage.getItem('products') || '[]')
      const linkedProducts = productsData.filter((p: any) => p.supplier_id === supplier.id)

      if (linkedProducts.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: `Existem ${linkedProducts.length} produto(s) vinculado(s) a este fornecedor. Remova a vinculação antes de excluir.`,
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Chamar o callback onSuccess que vai executar a exclusão via hook
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao verificar fornecedor:', error)
      toast({
        title: "Erro",
        description: "Erro ao verificar fornecedor. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir fornecedor</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o fornecedor <strong>"{supplier.name}"</strong>?
            <br />
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}