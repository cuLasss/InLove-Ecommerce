import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { productsApi } from "@/lib/api"
import { CategorySelect } from "../products/CategorySelect"
import { BrandSelect } from "../products/BrandSelect"
import { SupplierSelect } from "../products/SupplierSelect"
import { detectColorFromProductName } from "@/lib/color-utils"

interface ProductCreateDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onProductPrepared: (productData: any) => void
  initialData?: {
    name?: string
    brand_id?: string
    supplier_id?: string
    size?: string
    color?: string
    price_cents?: number
    cost_price_cents?: number
    category_id?: string
    description?: string
    stock?: number
    stock_min?: number
  }
}

export function ProductCreateDialog({ 
  isOpen, 
  onOpenChange, 
  onProductPrepared,
  initialData 
}: ProductCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    brand_id: initialData?.brand_id || "",
    supplier_id: initialData?.supplier_id || "",
    size: initialData?.size || "",
    color: initialData?.color || "",
    price_cents: initialData?.price_cents ? (initialData.price_cents / 100).toFixed(2) : "",
    cost_price_cents: initialData?.cost_price_cents ? (initialData.cost_price_cents / 100).toFixed(2) : "",
    category_id: initialData?.category_id || "",
    description: initialData?.description || "",
    stock: initialData?.stock ? initialData.stock.toString() : "",
    stock_min: initialData?.stock_min ? initialData.stock_min.toString() : ""
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Estado para controlar o checkbox "Produto novo"
  const [isNewProduct, setIsNewProduct] = useState(false)

  // Atualizar form quando dialog abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || "",
        brand_id: initialData?.brand_id || "",
        supplier_id: initialData?.supplier_id || "",
        size: initialData?.size || "",
        color: initialData?.color || "",
        price_cents: initialData?.price_cents ? (initialData.price_cents / 100).toFixed(2) : "",
        cost_price_cents: initialData?.cost_price_cents ? (initialData.cost_price_cents / 100).toFixed(2) : "",
        category_id: initialData?.category_id || "",
        description: initialData?.description || "",
        stock: initialData?.stock ? initialData.stock.toString() : "",
        stock_min: initialData?.stock_min ? initialData.stock_min.toString() : ""
      })
      
      // Só resetar o checkbox quando o dialog abrir (não quando initialData mudar)
      // Se o estoque é 0, significa que foi marcado como produto novo anteriormente
      if (initialData?.stock === 0) {
        setIsNewProduct(true)
      } else {
        setIsNewProduct(false)
      }
    }
  }, [isOpen]) // Removido initialData das dependências

  const generateShortCode = async (): Promise<string> => {
    // Sistema local - usar dados locais
    
    const generateUniqueCode = async (attempt: number = 1): Promise<string> => {
      try {
        // Buscar códigos existentes
        const { data: products, error } = await Promise.resolve({ data: [], error: null }); // Sistema local
        
        const existingCodes = (products || [])
          .map((p: any) => p.short_code)
          .filter((code: string) => code && code.startsWith('IL'));
        
        // Gerar código baseado no próximo número disponível
        const existingNumbers = existingCodes
          .map((code: string) => {
            const num = parseInt(code.substring(2));
            return isNaN(num) ? 0 : num;
          })
          .filter((num: number) => num > 0);
        
        const maxCode = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        let nextCode = maxCode + attempt;
        let shortCode = `IL${nextCode.toString().padStart(5, '0')}`;
        
        // Verificar se já existe
        while (existingCodes.includes(shortCode)) {
          nextCode++;
          shortCode = `IL${nextCode.toString().padStart(5, '0')}`;
          
          // Evitar loop infinito
          if (nextCode > maxCode + 100) {
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
            shortCode = `IL${timestamp}${random}`.slice(0, 8);
            break;
          }
        }
        
        return shortCode;
        
      } catch (error) {
        console.error('Erro na geração de código:', error);
        // Fallback robusto
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        return `IL${timestamp}${random}`.slice(0, 8);
      }
    };
    
    return generateUniqueCode();
  };

  const isValidUUID = (value: string): boolean => {
    if (!value || value.trim() === '') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  const cleanFieldValue = (value: string | undefined): string | null => {
    if (!value || value.trim() === '') return null
    if (value.startsWith('mock-')) return null
    if (value === 'no-brands' || value === 'no-suppliers') return null
    if (!isValidUUID(value)) return null
    return value.trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive",
      })
      return
    }

    // Verificar se já existe produto com mesmo nome (case insensitive)
    try {
      // Sistema local - usar dados locais
      const { data: existingProducts, error } = await Promise.resolve({ data: [], error: null }); // Sistema local
      
      if (error) {
        console.error('Erro ao verificar produtos existentes:', error);
      }

      const duplicateProduct = existingProducts?.find(
        (product: any) => product.name.toLowerCase() === formData.name.trim().toLowerCase()
      );

      if (duplicateProduct) {
        toast({
          title: "Produto já existe",
          description: `Já existe um produto com o nome "${formData.name}". Escolha outro nome.`,
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
    }

    // Preparar dados do produto
    setIsLoading(true);
    
    try {
      const shortCode = await generateShortCode();
      
      const productData = {
        name: formData.name.trim(),
        short_code: shortCode,
        brand_id: cleanFieldValue(formData.brand_id),
        supplier_id: cleanFieldValue(formData.supplier_id),
        category_id: cleanFieldValue(formData.category_id),
        size: formData.size?.trim() || null,
        color: formData.color?.trim() || null,
        price_cents: Math.round((parseFloat(formData.price_cents) || 0) * 100),
        cost_price_cents: formData.cost_price_cents ? Math.round(parseFloat(formData.cost_price_cents) * 100) : null,
        description: formData.description?.trim() || null,
        stock_quantity: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.stock_min) || 0,
        is_new_product: isNewProduct
      };

      onProductPrepared(productData);
      onOpenChange(false);
      
      toast({
        title: "Produto preparado",
        description: `Produto "${productData.name}" preparado com sucesso!`,
      });
      
    } catch (error) {
      console.error('Erro ao preparar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao preparar produto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Preparar Produto para NFe
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nome do Produto */}
            <div className="col-span-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nome do produto..."
                required
              />
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">Categoria</Label>
              <CategorySelect
                value={formData.category_id}
                onValueChange={(value) => handleInputChange("category_id", value)}
              />
            </div>

            {/* Marca */}
            <div>
              <Label htmlFor="brand">Marca</Label>
              <BrandSelect
                value={formData.brand_id}
                onValueChange={(value) => handleInputChange("brand_id", value)}
                placeholder="Selecione uma marca"
              />
            </div>

            {/* Fornecedor */}
            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <SupplierSelect
                value={formData.supplier_id}
                onValueChange={(value) => handleInputChange("supplier_id", value)}
                placeholder="Selecione um fornecedor"
              />
            </div>

            {/* Tamanho */}
            <div>
              <Label htmlFor="size">Tamanho</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                placeholder="P, M, G, 38, 40..."
              />
            </div>

            {/* Cor */}
            <div>
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                placeholder="Azul, Vermelho, Preto..."
              />
            </div>

            {/* Preço de Venda */}
            <div>
              <Label htmlFor="price">Preço de Venda (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_cents}
                onChange={(e) => handleInputChange("price_cents", e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Preço de Custo */}
            <div>
              <Label htmlFor="cost_price">Preço de Custo (R$) - Opcional</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price_cents}
                onChange={(e) => handleInputChange("cost_price_cents", e.target.value)}
                placeholder="0.00 (deixe vazio se não souber)"
              />
            </div>

            {/* Estoque Atual */}
            <div>
              <Label htmlFor="stock">Estoque Atual</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange("stock", value);
                  
                  // Lógica inteligente para o checkbox:
                  // Se digitar 0 ou vazio, manter/ativar checkbox
                  // Se digitar > 0, desmarcar checkbox automaticamente
                  if (value === "0" || value === "") {
                    setIsNewProduct(true);
                  } else if (parseInt(value) > 0) {
                    setIsNewProduct(false);
                  }
                }}
                placeholder="0"
              />
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="new-product"
                  checked={isNewProduct}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsNewProduct(checked);
                    if (checked) {
                      // Quando marcar como produto novo, definir estoque como 0
                      handleInputChange("stock", "0");
                    }
                    // Quando desmarcar, não alterar o valor do estoque
                    // O usuário pode definir o valor que quiser
                  }}
                />
                <Label htmlFor="new-product" className="text-sm">
                  Produto novo (primeira vez)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quantidade já existente. A quantidade da NFe será somada a este valor.
              </p>
            </div>

            {/* Estoque Mínimo */}
            <div>
              <Label htmlFor="stock_min">Estoque Mínimo</Label>
              <Input
                id="stock_min"
                type="number"
                min="0"
                value={formData.stock_min}
                onChange={(e) => handleInputChange("stock_min", e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Descrição */}
            <div className="col-span-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Descrição detalhada do produto..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Preparando...' : 'Preparar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};