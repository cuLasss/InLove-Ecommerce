
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { categoriesApi } from "@/lib/api"
import { useMockData, setGlobalMockDataContext } from "@/contexts/MockDataContext"

interface CategorySelectProps {
  value: string
  onValueChange: (value: string) => void
}

export function CategorySelect({ value, onValueChange }: CategorySelectProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const mockDataContext = useMockData()

  // Configurar contexto global para API
  useEffect(() => {
    setGlobalMockDataContext(mockDataContext)
  }, [mockDataContext])

  // Carregar categorias do Supabase em tempo real
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await categoriesApi.getAll()
      setCategories(data)
    } catch (error) {
      console.error("Erro ao carregar categorias, usando mock:", error)
      // Fallback para mock apenas se necessário
      setCategories(mockDataContext.categories)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      const newCategory = await categoriesApi.create(newCategoryName.trim())
      
      toast({
        title: "Sucesso",
        description: `Categoria "${newCategoryName}" criada com sucesso`,
      })

      // Recarregar categorias para sincronizar
      await loadCategories()
      
      // Selecionar a nova categoria
      if (newCategory && newCategory.id) {
        onValueChange(newCategory.id)
      }
      
      setNewCategoryName("")
      setIsDialogOpen(false)

    } catch (error) {
      console.error("Erro ao criar categoria:", error)
      toast({
        title: "Erro",
        description: "Erro ao criar categoria. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex gap-2 relative z-0">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Selecione uma categoria" />
        </SelectTrigger>
        <SelectContent className="z-[110]" position="popper">
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory()
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
