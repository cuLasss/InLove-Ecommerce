
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { productsApi } from "@/lib/api"
import { universalDataAdapter } from "@/lib/universal-data-adapter"
import { CategorySelect } from "./CategorySelect"
import { BrandSelect } from "./BrandSelect"
import { SupplierSelect } from "./SupplierSelect"
import { ImageUpload } from "@/components/ui/image-upload"

import { detectColorFromProductName } from "@/lib/color-utils"
import { validateUUID } from '@/lib/security'

interface ProductAddDialogProps {
  onSuccess?: () => void
}

export function ProductAddDialog({ onSuccess }: ProductAddDialogProps) {
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
      console.log('🔄 [ProductAddDialog] Modal aberto - forçando refresh dos componentes de seleção')
      setRefreshKey(prev => prev + 1)
      // Gerar ID temporário para upload de imagem
      setTempProductId(`temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`)
    }
  }, [isOpen])

  // Função para forçar refresh de todos os componentes de seleção
  const handleRefreshAll = () => {
    console.log('🔄 [ProductAddDialog] Forçando refresh de todos os componentes de seleção')
    setRefreshKey(prev => prev + 1)
  }

  const generateShortCode = async (): Promise<string> => {
    console.log('🏷️ [DIALOG] Iniciando geração de código único...')
    
    // Sistema local - usar dados locais
    
    // Função para gerar código único com logs de debug
    const generateUniqueCode = async (attempt: number = 1): Promise<string> => {
      try {
        console.log(`🔍 [DIALOG] Tentativa ${attempt} de gerar código único...`)
        
        // Buscar produtos do sistema local
        const response = await universalDataAdapter.getProducts()
        const products = response.data || []
        const error = response.error
        
        if (error) {
          console.error('❌ [DIALOG] Erro ao buscar produtos do Supabase:', error)
          throw error
        }
        
        console.log(`📦 [DIALOG] Total de produtos encontrados: ${products?.length || 0}`)
        
        const existingCodes = (products || [])
          .map((p: any) => p.short_code)
          .filter((code: string) => code && code.startsWith('IL'))
        
        console.log(`🏷️ [DIALOG] Códigos IL existentes:`, existingCodes)
        
        const existingNumbers = existingCodes
          .map((code: string) => {
            const num = parseInt(code.substring(2))
            return isNaN(num) ? 0 : num
          })
          .filter((num: number) => num > 0)
        
        console.log(`🔢 [DIALOG] Números extraídos dos códigos:`, existingNumbers)
        
        const maxCode = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
        const nextCode = maxCode + attempt
        const shortCode = `IL${nextCode.toString().padStart(5, '0')}`
        
        console.log(`🎯 [DIALOG] Código gerado: ${shortCode} (baseado no máximo ${maxCode} + ${attempt})`)
        
        // Verificar se já existe no array atual
        const codeExists = existingCodes.includes(shortCode)
        console.log(`✅ [DIALOG] Verificação de duplicata para ${shortCode}: ${codeExists ? 'JÁ EXISTE' : 'DISPONÍVEL'}`)
        
        if (codeExists) {
          console.log(`⚠️ [DIALOG] Código ${shortCode} já existe, tentando próximo...`)
          if (attempt > 10) {
            // Fallback após muitas tentativas
            const timestamp = Date.now().toString().slice(-4)
            const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
            const fallbackCode = `IL${timestamp}${random.slice(0,1)}`
            console.log(`🆘 [DIALOG] Usando código fallback após ${attempt} tentativas: ${fallbackCode}`)
            return fallbackCode
          }
          return generateUniqueCode(attempt + 1)
        }
        
        console.log(`✅ [DIALOG] Código único gerado: ${shortCode}`)
        return shortCode
        
      } catch (error) {
        console.error('❌ [DIALOG] Erro ao gerar código:', error)
        // Fallback: usar timestamp + random para garantir unicidade
        const timestamp = Date.now().toString().slice(-4)
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
        const fallbackCode = `IL${timestamp}${random.slice(0,1)}`
        console.log(`🆘 [DIALOG] Código fallback por erro: ${fallbackCode}`)
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

    if (!formData.cost_price_cents || isNaN(parseFloat(formData.cost_price_cents)) || parseFloat(formData.cost_price_cents) <= 0) {
      toast({
        title: "Erro",
        description: "Preço de custo deve ser um número maior que zero",
        variant: "destructive"
      })
      return
    }

    // Verificar se já existe produto com mesmo nome (case insensitive)
    try {
      // Sistema local - verificar produtos existentes
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
      console.log('🚀 [DIALOG] Iniciando criação de produto...')
      const shortCode = await generateShortCode()
      console.log('🏷️ [DIALOG] Código gerado para o produto:', shortCode)
      
      // Limpar e validar todos os IDs usando função auxiliar
      const categoryId = cleanFieldValue(formData.category_id)
      const brandId = cleanFieldValue(formData.brand_id)
      const supplierId = cleanFieldValue(formData.supplier_id)
      
      const productData = {
        name: formData.name.trim(),
        brand_id: brandId,
        supplier_id: supplierId,
        size: formData.size?.trim() || null,
        color: formData.color?.trim() || detectColorFromProductName(formData.name) || null,
        price_cents: Math.round(parseFloat(formData.price_cents) * 100),
        cost_price_cents: Math.round(parseFloat(formData.cost_price_cents) * 100),
        category_id: categoryId,
        description: formData.description?.trim() || null,
        stock: parseInt(formData.stock) || 0,
        stock_min: parseInt(formData.stock_min) || 0,
        stock_consigned: 0,
        short_code: shortCode,
        qr_code: `inlove_product:${shortCode}`,
        photo_url: productImageUrl || null
      }

      console.log('📦 [DIALOG] Dados do produto a ser criado:', productData)
      const createdProduct = await productsApi.create(productData)
      console.log('✅ [DIALOG] Produto criado com sucesso:', createdProduct)

      toast({
        title: "Sucesso",
        description: `Produto "${formData.name}" criado com código ${shortCode}`,
      })

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
      onSuccess?.()
      
    } catch (error: any) {
      console.error("❌ [DIALOG] Erro detalhado ao criar produto:", error)
      
      let errorMessage = "Erro ao criar produto. Tente novamente."
      
      if (error?.message?.includes('código') || error?.message?.includes('duplicate') || error?.message?.includes('short_code')) {
        errorMessage = "Código do produto já existe. Tentando gerar novo código..."
        console.log('🔄 [DIALOG] Erro de código duplicado, tentando novamente...')
        // Tentar novamente automaticamente após 1 segundo
        setTimeout(() => {
          setIsLoading(false)
          handleSubmit(e)
        }, 1000)
        return
      } else if (error?.message?.includes('uuid')) {
        errorMessage = "Erro com IDs selecionados. Verifique as seleções de categoria, marca e fornecedor."
      } else if (error?.code === '23503') {
        errorMessage = "Referência inválida. Selecione valores válidos ou deixe campos opcionais em branco."
      } else if (error?.code === '22P02') {
        errorMessage = "Erro de formato de dados. Verifique as seleções de categoria, marca e fornecedor."
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-lg max-h-[95vh] flex flex-col p-4 sm:p-6 scroll-smooth">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg break-words whitespace-normal hyphens-none">
            <Package className="h-5 w-5 flex-shrink-0" />
            Adicionar Novo Produto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto scroll-smooth pr-1 sm:pr-2 -mx-1 sm:-mx-2 px-1 sm:px-2 py-1">
            {/* Nome do Produto */}
            <div className="space-y-2 py-1">
              <Label htmlFor="name" className="text-sm">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Digite o nome do produto"
                maxLength={22}
                required
                className="text-base border-2"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 22 caracteres para etiquetas QR Code
              </p>
            </div>

            {/* Marca */}
            <div className="space-y-2 py-1">
              <Label htmlFor="brand" className="text-sm">Marca</Label>
              <BrandSelect
                key={`brand-${refreshKey}`}
                value={formData.brand_id}
                onValueChange={(value) => handleInputChange("brand_id", value)}
                showAddNew={true}
                onRefresh={handleRefreshAll}
              />
            </div>

            {/* Fornecedor */}
            <div className="space-y-2 py-1">
              <Label htmlFor="supplier" className="text-sm">Fornecedor</Label>
              <SupplierSelect
                key={`supplier-${refreshKey}`}
                value={formData.supplier_id}
                onValueChange={(value) => handleInputChange("supplier_id", value)}
                showAddNew={true}
                onRefresh={handleRefreshAll}
              />
            </div>

            {/* Tamanho */}
            <div className="space-y-2 py-1">
              <Label htmlFor="size" className="text-sm">Tamanho</Label>
              <Input
                id="size"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                placeholder="P, M, G, 38..."
                maxLength={5}
                className="text-base border-2"
              />
              <p className="text-xs text-muted-foreground">
                Máximo 5 caracteres
              </p>
            </div>

            {/* Cor */}
            <div className="space-y-2 py-1">
              <Label htmlFor="color" className="text-sm">Cor</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                placeholder="Ex: Azul-marinho, Verde-esmeralda..."
                className="text-base border-2"
              />
            </div>

            {/* Preço de Venda */}
            <div className="space-y-2 py-1">
              <Label htmlFor="price" className="text-sm">Preço de Venda (R$) *</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                value={formData.price_cents ? `R$ ${formData.price_cents.replace('.', ',')}` : ''}
                onChange={(e) => handleInputChange("price_cents", e.target.value)}
                placeholder="R$ 0,00"
                required
                className="text-base border-2"
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas números. Ex: 2590 = R$ 25,90
              </p>
            </div>

            {/* Preço de Custo */}
            <div className="space-y-2 py-1">
              <Label htmlFor="cost" className="text-sm">Preço de Custo (R$) *</Label>
              <Input
                id="cost"
                type="text"
                inputMode="numeric"
                value={formData.cost_price_cents ? `R$ ${formData.cost_price_cents.replace('.', ',')}` : ''}
                onChange={(e) => handleInputChange("cost_price_cents", e.target.value)}
                placeholder="R$ 0,00"
                required
                className="text-base border-2"
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas números. Ex: 1500 = R$ 15,00
              </p>
            </div>

            {/* Categoria */}
            <div className="space-y-2 py-1">
              <Label htmlFor="category" className="text-sm">Categoria</Label>
              <CategorySelect
                key={`category-${refreshKey}`}
                value={formData.category_id}
                onValueChange={(value) => handleInputChange("category_id", value)}
              />
            </div>

            {/* Estoque Atual */}
            <div className="space-y-2 py-1">
              <Label htmlFor="stock" className="text-sm">Estoque Atual</Label>
              <Input
                id="stock"
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange("stock", e.target.value)}
                placeholder="0"
                className="text-base border-2"
              />
            </div>

            {/* Estoque Mínimo */}
            <div className="space-y-2 py-1">
              <Label htmlFor="stock_min" className="text-sm">Estoque Mínimo</Label>
              <Input
                id="stock_min"
                type="number"
                inputMode="numeric"
                min="0"
                value={formData.stock_min}
                onChange={(e) => handleInputChange("stock_min", e.target.value)}
                placeholder="0"
                className="text-base border-2"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2 py-1">
              <Label htmlFor="description" className="text-sm">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Descrição detalhada do produto..."
                rows={3}
                className="text-base resize-none border-2"
              />
            </div>

            {/* Upload de Imagem */}
            <div className="py-1">
              <ImageUpload
                productId={tempProductId}
                onImageUploaded={setProductImageUrl}
                onImageRemoved={() => setProductImageUrl("")}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t bg-background flex-shrink-0 mt-4">
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
              {isLoading ? "Criando..." : "Criar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
