import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { productsApi } from "@/lib/api"
import { CategorySelect } from "./CategorySelect"
import { BrandSelect } from "./BrandSelect"
import { SupplierSelect } from "./SupplierSelect"
import { Edit } from "lucide-react"

interface Product {
  id: string
  name: string
  brand?: string
  brand_id?: string
  supplier_id?: string
  size?: string
  color?: string
  category_id?: string
  price_cents: number
  cost_price_cents?: number
  stock: number
  stock_min: number
  short_code: string
  description?: string
}

interface ProductEditDialogProps {
  product: Product
  onSuccess: () => void
}

export function ProductEditDialog({ product, onSuccess }: ProductEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: product.name || '',
    brand_id: product.brand_id || '',
    supplier_id: product.supplier_id || '',
    size: product.size || '',
    color: product.color || '',
    category_id: product.category_id || '',
    price: (product.price_cents ? product.price_cents / 100 : 0).toString(),
    cost_price: product.cost_price_cents ? (product.cost_price_cents / 100).toString() : '',
    stock: (product.stock || 0).toString(),
    stock_min: (product.stock_min || 0).toString(),
    description: product.description || ''
  })
  const { toast } = useToast()

  // Reset form when product ID changes (not when product object reference changes)
  useEffect(() => {
    setFormData({
      name: product.name || '',
      brand_id: product.brand_id || '',
      supplier_id: product.supplier_id || '',
      size: product.size || '',
      color: product.color || '',
      category_id: product.category_id || '',
      price: (product.price_cents ? product.price_cents / 100 : 0).toString(),
      cost_price: product.cost_price_cents ? (product.cost_price_cents / 100).toString() : '',
      stock: (product.stock || 0).toString(),
      stock_min: (product.stock_min || 0).toString(),
      description: product.description || ''
    })
  }, [product.id]) // Só resetar quando o ID mudar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔄 [ProductEditDialog] Iniciando submissão do formulário:', {
      productId: product.id,
      formData: formData
    });
    
    // Validações básicas
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive"
      })
      return
    }

    // Validação de limites para etiquetas QR Code
    if (formData.name.length > 22) {
      toast({
        title: "Erro",
        description: "Nome do produto deve ter no máximo 22 caracteres para etiquetas QR Code",
        variant: "destructive"
      })
      return
    }

    if (formData.size && formData.size.length > 5) {
      toast({
        title: "Erro",
        description: "Tamanho deve ter no máximo 5 caracteres",
        variant: "destructive"
      })
      return
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({
        title: "Erro", 
        description: "Preço de venda deve ser maior que zero",
        variant: "destructive"
      })
      return
    }

    // Validação do limite de preço para etiquetas QR Code (R$ 9.999,99)
    if (parseFloat(formData.price) > 9999.99) {
      toast({
        title: "Erro",
        description: "Preço máximo permitido é R$ 9.999,99 para etiquetas QR Code",
        variant: "destructive"
      })
      return
    }

    if (formData.cost_price && parseFloat(formData.cost_price) <= 0) {
      toast({
        title: "Erro",
        description: "Preço de custo deve ser maior que zero", 
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const stockValue = parseInt(formData.stock) || 0;
      const stockMinValue = parseInt(formData.stock_min) || 0;
      
      const updateData = {
        name: formData.name.trim(),
        brand_id: formData.brand_id || null,
        supplier_id: formData.supplier_id || null,
        size: formData.size.trim() || null,
        color: formData.color.trim() || null,
        category_id: formData.category_id || null,
        price_cents: Math.round(parseFloat(formData.price) * 100),
        cost_price_cents: formData.cost_price ? Math.round(parseFloat(formData.cost_price) * 100) : null,
        stock: stockValue,
        stock_quantity: stockValue, // Garantir compatibilidade
        stock_min: stockMinValue,
        min_stock: stockMinValue, // Garantir compatibilidade
        description: formData.description.trim() || null
      }

      console.log('🔄 [ProductEditDialog] Dados enviados para atualização:', updateData);
      console.log('🔄 [ProductEditDialog] ID do produto:', product.id);
      
      const result = await productsApi.update(product.id, updateData)
      console.log('✅ [ProductEditDialog] Resultado da atualização:', result);
      
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso",
      })

      console.log('🔄 [ProductEditDialog] Fechando modal e chamando onSuccess...');
      setIsOpen(false)
      onSuccess()
      console.log('✅ [ProductEditDialog] Modal fechado e onSuccess chamado');
    } catch (error) {
      console.error("Erro ao atualizar produto:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        title="Editar produto"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-[90vw] lg:w-auto p-4 sm:p-5 lg:p-6 flex flex-col">
          <DialogHeader className="min-w-0 pr-2 sm:pr-4 pb-3 sm:pb-4 flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg tablet:text-xl desktop:text-xl break-words whitespace-normal hyphens-none leading-tight sm:leading-normal w-full min-w-0">Editar Produto</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 -mx-4 sm:-mx-5 lg:-mx-6 px-4 sm:px-5 lg:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nome do produto"
                  maxLength={22}
                  required
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Máximo 22 caracteres para etiquetas QR Code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand" className="text-xs sm:text-sm">Marca</Label>
                <BrandSelect
                  value={formData.brand_id}
                  onValueChange={(value) => handleInputChange('brand_id', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-xs sm:text-sm">Fornecedor</Label>
                <SupplierSelect
                  value={formData.supplier_id}
                  onValueChange={(value) => handleInputChange('supplier_id', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs sm:text-sm">Categoria</Label>
                <CategorySelect
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange('category_id', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="size" className="text-xs sm:text-sm">Tamanho</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  placeholder="P, M, G, etc."
                  maxLength={5}
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Máximo 5 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="text-xs sm:text-sm">Cor</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="Ex: Azul-marinho, Verde-esmeralda..."
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs sm:text-sm">Preço de Venda * (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0,00"
                  required
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Valor atual: {formData.price ? `R$ ${parseFloat(formData.price).toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_price" className="text-xs sm:text-sm">Preço de Custo (R$)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  placeholder="0,00"
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Valor atual: {formData.cost_price ? `R$ ${parseFloat(formData.cost_price).toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-xs sm:text-sm">Estoque Atual</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', e.target.value)}
                  placeholder="0"
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_min" className="text-xs sm:text-sm">Estoque Mínimo</Label>
                <Input
                  id="stock_min"
                  type="number"
                  min="0"
                  value={formData.stock_min}
                  onChange={(e) => handleInputChange('stock_min', e.target.value)}
                  placeholder="0"
                  className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs sm:text-sm">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição detalhada do produto"
                rows={3}
                className="text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
              />
            </div>

            <div className="flex gap-2 sm:gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
              >
                {isLoading ? "Atualizando..." : "Atualizar Produto"}
              </Button>
            </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}