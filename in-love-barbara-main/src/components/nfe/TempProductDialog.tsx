import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { universalDataAdapter } from "@/lib/universal-data-adapter"
import { productsApi } from "@/lib/api"
import { CategorySelect } from "../products/CategorySelect"
import { BrandSelect } from "../products/BrandSelect"
import { SupplierSelect } from "../products/SupplierSelect"
import { detectColorFromProductName } from "@/lib/color-utils"
import { TempProduct } from "@/hooks/useProductReconciliation"
import { ImageUpload } from "@/components/ui/image-upload"
import { validateUUID } from '@/lib/security'

interface TempProductData {
  name: string
  brand_id: string
  supplier_id: string
  size: string
  color: string
  price_cents: number
  cost_price_cents: number
  category_id: string
  description: string
  stock: number
  stock_min: number
  short_code: string
  photo_url?: string
}

interface TempProductDialogProps {
  onProductCreated: (productData: TempProductData) => void;
  disabled?: boolean;
  loading?: boolean;
  tempProducts?: TempProduct[]; // Adiciona produtos temporários para evitar códigos duplicados
}

export function TempProductDialog({ onProductCreated, disabled, loading, tempProducts = [] }: TempProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    brand_id: "",
    supplier_id: "",
    size: "",
    color: "",
    price_cents: "",
    cost_price_cents: "",
    category_id: "",
    description: "",
    stock: "",
    stock_min: ""
  })
  const [productImageUrl, setProductImageUrl] = useState<string>("")
  const [tempProductId, setTempProductId] = useState<string>("")

  // Forçar refresh dos componentes de seleção quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [TempProductDialog] Modal aberto - forçando refresh dos componentes de seleção')
      setRefreshKey(prev => prev + 1)
      // Gerar ID temporário para upload de imagem
      setTempProductId(`temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`)
    }
  }, [isOpen])

  // Função para forçar refresh de todos os componentes de seleção
  const handleRefreshAll = () => {
    console.log('🔄 [TempProductDialog] Forçando refresh de todos os componentes de seleção')
    setRefreshKey(prev => prev + 1)
  }

  const generateShortCode = async (): Promise<string> => {
    console.log('🏷️ [TEMP-DIALOG] Iniciando geração de código único...')
    
    // Função para gerar código único com logs de debug
    const generateUniqueCode = async (attempt: number = 1): Promise<string> => {
      try {
        console.log(`🔍 [TEMP-DIALOG] Tentativa ${attempt} de gerar código único...`)
        
        // Buscar produtos do sistema
        const response = await universalDataAdapter.getProducts()
        const products = response.data || []
        const error = response.error
        
        if (error) {
          console.error('❌ [TEMP-DIALOG] Erro ao buscar produtos:', error)
          throw error
        }
        
        console.log(`📦 [TEMP-DIALOG] Total de produtos encontrados: ${products?.length || 0}`)
        
        const existingCodes = [
          ...(products || [])
            .map((p: any) => p.short_code)
            .filter((code: string) => code && code.startsWith('IL')),
          ...tempProducts
            .map(p => p.short_code)
            .filter(code => code && code.startsWith('IL'))
        ]
        
        console.log(`🏷️ [TEMP-DIALOG] Códigos IL existentes (incluindo temporários):`, existingCodes)
        
        const existingNumbers = existingCodes
          .map((code: string) => {
            const num = parseInt(code.substring(2))
            return isNaN(num) ? 0 : num
          })
          .filter((num: number) => num > 0)
        
        console.log(`🔢 [TEMP-DIALOG] Números extraídos dos códigos:`, existingNumbers)
        
        const maxCode = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
        const nextCode = maxCode + attempt
        const shortCode = `IL${nextCode.toString().padStart(5, '0')}`
        
        console.log(`🎯 [TEMP-DIALOG] Código gerado: ${shortCode} (baseado no máximo ${maxCode} + ${attempt})`)
        
        // Verificar se já existe no array atual
        const codeExists = existingCodes.includes(shortCode)
        console.log(`✅ [TEMP-DIALOG] Verificação de duplicata para ${shortCode}: ${codeExists ? 'JÁ EXISTE' : 'DISPONÍVEL'}`)
        
        if (codeExists) {
          console.log(`⚠️ [TEMP-DIALOG] Código ${shortCode} já existe, tentando próximo...`)
          if (attempt > 10) {
            // Fallback após muitas tentativas
            const timestamp = Date.now().toString().slice(-4)
            const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
            const fallbackCode = `IL${timestamp}${random.slice(0,1)}`
            console.log(`🆘 [TEMP-DIALOG] Usando código fallback após ${attempt} tentativas: ${fallbackCode}`)
            return fallbackCode
          }
          return generateUniqueCode(attempt + 1)
        }
        
        console.log(`✅ [TEMP-DIALOG] Código único gerado: ${shortCode}`)
        return shortCode
        
      } catch (error) {
        console.error('❌ [TEMP-DIALOG] Erro ao gerar código:', error)
        // Fallback: usar timestamp + random para garantir unicidade
        const timestamp = Date.now().toString().slice(-4)
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
        const fallbackCode = `IL${timestamp}${random.slice(0,1)}`
        console.log(`🆘 [TEMP-DIALOG] Código fallback por erro: ${fallbackCode}`)
        return fallbackCode
      }
    }
    
    return generateUniqueCode()
  }

  // Função para validar se um valor é um UUID válido
  const isValidUUID = (value: string): boolean => {
    if (!value || value.trim() === '') return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }

  // Função para limpar valores mock ou inválidos
  const cleanFieldValue = (value: string | undefined): string | null => {
    if (!value || value.trim() === '') return null
    if (value.startsWith('mock-')) return null
    if (value === 'no-brands' || value === 'no-suppliers') return null
    if (!validateUUID(value).isValid) return null
    return value.trim()
  }

  // Função para formatar preço conforme o usuário digita
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    if (!numbers) return ''
    
    // Converte para centavos (cada dígito é um centavo)
    const cents = parseInt(numbers)
    const reais = cents / 100
    
    return reais.toFixed(2)
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'price_cents' || field === 'cost_price_cents') {
      const formattedValue = formatCurrencyInput(value)
      setFormData(prev => ({ ...prev, [field]: formattedValue }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações mais robustas
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

    if (!formData.price_cents || isNaN(parseFloat(formData.price_cents)) || parseFloat(formData.price_cents) <= 0) {
      toast({
        title: "Erro",
        description: "Preço de venda deve ser um número maior que zero",
        variant: "destructive"
      })
      return
    }

    // Validação do limite de preço para etiquetas QR Code (R$ 9.999,99)
    if (parseFloat(formData.price_cents) > 9999.99) {
      toast({
        title: "Erro",
        description: "Preço máximo permitido é R$ 9.999,99 para etiquetas QR Code",
        variant: "destructive"
      })
      return
    }

    // Preço de custo é opcional - só valida se foi preenchido
    if (formData.cost_price_cents && (isNaN(parseFloat(formData.cost_price_cents)) || parseFloat(formData.cost_price_cents) < 0)) {
      toast({
        title: "Erro",
        description: "Preço de custo deve ser um número válido (deixe vazio se não souber)",
        variant: "destructive"
      })
      return
    }

    // Verificar se já existe produto com mesmo nome (case insensitive)
    try {
      const response = await universalDataAdapter.getProducts()
      const allProducts = response.data || []
      const existingProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(formData.name.trim().toLowerCase())
      )
      const error = response.error

      if (error) {
        console.error('Erro ao verificar produto existente:', error)
      } else if (existingProducts && existingProducts.length > 0) {
        toast({
          title: "Erro",
          description: `Já existe um produto com o nome "${formData.name}"`,
          variant: "destructive",
        })
        return
      }
    } catch (error) {
      console.error('Erro ao verificar duplicata:', error)
    }

    setIsLoading(true)

    try {
      console.log('🚀 [TEMP-DIALOG] Iniciando criação de produto temporário...')
      const shortCode = await generateShortCode()
      console.log('🏷️ [TEMP-DIALOG] Código gerado para o produto:', shortCode)
      
      // Limpar e validar todos os IDs usando função auxiliar
      const categoryId = cleanFieldValue(formData.category_id)
      const brandId = cleanFieldValue(formData.brand_id)
      const supplierId = cleanFieldValue(formData.supplier_id)
      
      // Prepara dados do produto temporário
      const productData: TempProductData = {
        name: formData.name.trim(),
        brand_id: brandId || "",
        supplier_id: supplierId || "",
        size: formData.size?.trim() || "",
        color: formData.color?.trim() || detectColorFromProductName(formData.name) || "",
        price_cents: Math.round(parseFloat(formData.price_cents) * 100),
        cost_price_cents: formData.cost_price_cents ? Math.round(parseFloat(formData.cost_price_cents) * 100) : null,
        category_id: categoryId || "",
        description: formData.description?.trim() || "",
        stock: parseInt(formData.stock) || 0,
        stock_min: parseInt(formData.stock_min) || 0,
        short_code: shortCode,
        photo_url: productImageUrl || undefined
      }
      
      console.log('📦 [TEMP-DIALOG] Dados do produto temporário:', productData)
      
      // Chama callback com os dados (não cria o produto ainda)
      onProductCreated(productData)
      
      toast({
        title: "Sucesso",
        description: "Produto temporário criado! Agora você pode selecioná-lo na lista de produtos similares.",
      })
      
      // Limpa formulário e fecha dialog
      setFormData({
        name: "",
        brand_id: "",
        supplier_id: "",
        size: "",
        color: "",
        price_cents: "",
        cost_price_cents: "",
        category_id: "",
        description: "",
        stock: "",
        stock_min: ""
      })
      setProductImageUrl("")
      setTempProductId("")
      setIsOpen(false)
      
    } catch (error) {
      console.error('❌ [TEMP-DIALOG] Erro ao criar produto temporário:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar produto temporário. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          disabled={disabled || loading}
          className="h-8 px-3 text-xs"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
              Criando...
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 mr-1" />
              Novo Produto
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[95vw] max-w-lg max-h-[95vh] overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Criar Produto Temporário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pb-4">
          <div className="grid grid-cols-1 gap-3 max-h-[70vh] overflow-y-auto scroll-smooth px-1">
            {/* Nome do Produto */}
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Digite o nome do produto"
                maxLength={22}
                required
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo 22 caracteres para etiquetas QR Code
              </p>
            </div>

            {/* Marca */}
            <div>
              <Label htmlFor="brand">Marca</Label>
              <BrandSelect
                key={`brand-${refreshKey}`}
                value={formData.brand_id}
                onValueChange={(value) => handleInputChange("brand_id", value)}
                showAddNew={true}
                onRefresh={handleRefreshAll}
              />
            </div>

            {/* Fornecedor */}
            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <SupplierSelect
                key={`supplier-${refreshKey}`}
                value={formData.supplier_id}
                onValueChange={(value) => handleInputChange("supplier_id", value)}
                showAddNew={true}
                onRefresh={handleRefreshAll}
              />
            </div>

            {/* Tamanho */}
            <div>
              <Label htmlFor="size">Tamanho</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                placeholder="P, M, G, 38..."
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo 5 caracteres
              </p>
            </div>

            {/* Cor */}
            <div>
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                placeholder="Ex: Azul-marinho, Verde-esmeralda..."
              />
            </div>

            {/* Preço de Venda */}
            <div>
              <Label htmlFor="price">Preço de Venda (R$) *</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                value={formData.price_cents ? `R$ ${formData.price_cents.replace('.', ',')}` : ''}
                onChange={(e) => handleInputChange("price_cents", e.target.value)}
                placeholder="R$ 0,00"
                required
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite apenas números. Ex: 2590 = R$ 25,90
              </p>
            </div>

            {/* Preço de Custo */}
            <div>
              <Label htmlFor="cost">Preço de Custo (R$) - Opcional</Label>
              <Input
                id="cost"
                type="text"
                inputMode="numeric"
                value={formData.cost_price_cents ? `R$ ${formData.cost_price_cents.replace('.', ',')}` : ''}
                onChange={(e) => handleInputChange("cost_price_cents", e.target.value)}
                placeholder="R$ 0,00 (deixe vazio se não souber)"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite apenas números. Ex: 1500 = R$ 15,00. Deixe vazio se não souber o preço de custo.
              </p>
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">Categoria</Label>
              <CategorySelect
                key={`category-${refreshKey}`}
                value={formData.category_id}
                onValueChange={(value) => handleInputChange("category_id", value)}
              />
            </div>

            {/* Estoque Atual */}
            <div>
              <Label htmlFor="stock">Estoque Atual</Label>
              <Input
                id="stock"
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange("stock", e.target.value)}
                placeholder="0"
                className="text-base"
              />
            </div>

            {/* Estoque Mínimo */}
            <div>
              <Label htmlFor="stock_min">Estoque Mínimo</Label>
              <Input
                id="stock_min"
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.stock_min}
                onChange={(e) => handleInputChange("stock_min", e.target.value)}
                placeholder="0"
                className="text-base"
              />
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Descrição detalhada do produto..."
                rows={3}
                className="text-base resize-none"
              />
            </div>

            {/* Upload de Imagem */}
            <div>
              <ImageUpload
                productId={tempProductId}
                onImageUploaded={setProductImageUrl}
                onImageRemoved={() => setProductImageUrl("")}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Informação</h4>
            <p className="text-sm text-blue-700">
              Este produto será criado temporariamente e aparecerá na lista de produtos similares para você selecionar durante a reconciliação.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t bg-background sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full h-12 text-base"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base"
            >
              {isLoading ? "Criando..." : "Criar Produto Temporário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
