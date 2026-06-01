import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { productsApi } from "@/lib/api"
import { Trash2 } from "lucide-react"

interface Product {
  id: string
  name: string
  short_code: string
}

interface ProductDeleteDialogProps {
  product: Product
  onSuccess: () => void
}

export function ProductDeleteDialog({ product, onSuccess }: ProductDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showCascadeDialog, setShowCascadeDialog] = useState(false)
  const [dependencies, setDependencies] = useState<{ saleItemsCount: number; consignationsCount: number; productsOnSheetCount: number } | null>(null)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      await productsApi.delete(product.id)
      
      toast({
        title: "Sucesso",
        description: `Produto "${product.name}" excluído com sucesso`,
      })

      onSuccess()
    } catch (error) {
      console.error("Erro ao excluir produto:", error)
      
      // Verificar se o erro indica que há dependências
      if (error instanceof Error && (error as any).hasDependencies) {
        setDependencies((error as any).dependencies)
        setShowCascadeDialog(true)
        setIsLoading(false)
        return
      }
      
      // Extrair mensagem de erro mais específica
      let errorMessage = "Erro ao excluir produto. Tente novamente."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      toast({
        title: "Não é possível excluir o produto",
        description: errorMessage,
        variant: "destructive",
        duration: 6000, // Mostrar por mais tempo para mensagens longas
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCascadeDelete = async () => {
    setIsLoading(true)
    setShowCascadeDialog(false)

    try {
      await productsApi.deleteCascade(product.id)
      
      toast({
        title: "Sucesso",
        description: `Produto "${product.name}" marcado como excluído. O produto foi desativado e os itens nas vendas serão exibidos como "(excluído)".`,
      })

      onSuccess()
    } catch (error) {
      console.error("Erro ao excluir produto em cascata:", error)
      
      let errorMessage = "Erro ao excluir produto em cascata. Tente novamente."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
      
      toast({
        title: "Erro ao excluir produto",
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const totalDependencies = dependencies 
    ? (dependencies.saleItemsCount + dependencies.consignationsCount + dependencies.productsOnSheetCount)
    : 0

  return (
    <>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Excluir produto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o produto <strong>"{product.name}"</strong> 
            (código: {product.short_code})?
            <br /><br />
            Esta ação não pode ser desfeita e o produto será removido permanentemente 
            do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
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

      {/* Modal de exclusão em cascata */}
      <AlertDialog open={showCascadeDialog} onOpenChange={setShowCascadeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produto em uso - Exclusão em Cascata</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                O produto <strong>"{product.name}"</strong> está sendo usado em:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {dependencies?.saleItemsCount > 0 && (
                  <li>{dependencies.saleItemsCount} venda(s)</li>
                )}
                {dependencies?.consignationsCount > 0 && (
                  <li>{dependencies.consignationsCount} consignação(ões)</li>
                )}
                {dependencies?.productsOnSheetCount > 0 && (
                  <li>{dependencies.productsOnSheetCount} folha(s) de consignação</li>
                )}
              </ul>
              <p className="pt-2">
                Deseja excluir o produto em <strong>cascata</strong>? Isso irá:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Marcar o produto como inativo (não aparecerá nas listagens)</li>
                <li>Manter as vendas e consignações intactas</li>
                <li>Exibir os itens nas vendas como <strong>"{product.name} (excluído)"</strong></li>
                <li>O produto permanecerá no banco para manter o histórico das vendas</li>
              </ul>
              <p className="pt-2 text-destructive font-medium">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCascadeDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCascadeDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Excluindo em cascata..." : "Excluir em Cascata"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}