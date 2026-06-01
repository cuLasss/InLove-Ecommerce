import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { categoriesApi } from "@/lib/api"
import { useMockData, setGlobalMockDataContext } from "@/contexts/MockDataContext"

export function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [categoryName, setCategoryName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const mockDataContext = useMockData()

  // Configurar contexto global para API
  useEffect(() => {
    setGlobalMockDataContext(mockDataContext)
  }, [mockDataContext])

  // Carregar categorias prioritariamente do Supabase
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 Carregando categorias...')
      const data = await categoriesApi.getAll()
      console.log('📊 Dados recebidos:', data)
      setCategories(data)
    } catch (error) {
      console.error("❌ Erro ao carregar categorias, usando mock:", error)
      // Fallback para mock data apenas se Supabase falhar
      setCategories(mockDataContext.categories)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      if (editingCategory) {
        console.log('🔄 Atualizando categoria:', editingCategory.id, categoryName)
        await categoriesApi.update(editingCategory.id, categoryName.trim())
        toast({
          title: "Sucesso",
          description: `Categoria "${categoryName}" atualizada com sucesso`,
        })
      } else {
        console.log('🔄 Criando nova categoria:', categoryName)
        await categoriesApi.create(categoryName.trim())
        toast({
          title: "Sucesso",
          description: `Categoria "${categoryName}" criada com sucesso`,
        })
      }

      // Recarregar lista de categorias para sincronizar
      await loadCategories()
      
      setCategoryName("")
      setEditingCategory(null)
      setIsDialogOpen(false)

    } catch (error) {
      console.error("❌ Erro ao salvar categoria:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar categoria. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditCategory = (category: any) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setIsDialogOpen(true)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      console.log('🗑️ Removendo categoria:', categoryId)
      await categoriesApi.delete(categoryId)
      
      // Recarregar lista para sincronizar
      await loadCategories()
      
      toast({
        title: "Sucesso",
        description: "Categoria removida com sucesso",
      })
    } catch (error) {
      console.error("❌ Erro ao remover categoria:", error)
      toast({
        title: "Erro",
        description: "Erro ao remover categoria. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const openNewCategoryDialog = () => {
    setEditingCategory(null)
    setCategoryName("")
    setIsDialogOpen(true)
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col btn:flex-row items-start btn:items-center justify-between gap-3 btn:gap-4">
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Categorias
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewCategoryDialog} size="sm" className="w-full btn:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
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
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingCategory(null)
                    setCategoryName("")
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? "Salvando..." : editingCategory ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Carregando categorias...</div>
        ) : categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{category.name}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCategory(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              Nenhuma categoria cadastrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece criando sua primeira categoria
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}