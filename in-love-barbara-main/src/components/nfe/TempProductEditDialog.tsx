import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TempProduct } from '@/hooks/useProductReconciliation';
import { CategorySelect } from '../products/CategorySelect';
import { BrandSelect } from '../products/BrandSelect';
import { SupplierSelect } from '../products/SupplierSelect';
import { ImageUpload } from '@/components/ui/image-upload';
import { Package } from 'lucide-react';
import { detectColorFromProductName } from '@/lib/color-utils';
import { useToast } from '@/hooks/use-toast';

interface TempProductEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tempProduct: TempProduct | null;
  onSave: (updatedProduct: TempProduct) => void;
}

export function TempProductEditDialog({
  isOpen,
  onOpenChange,
  tempProduct,
  onSave
}: TempProductEditDialogProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    price_cents: '',
    cost_price_cents: '',
    stock: '',
    stock_min: '',
    brand_id: '',
    supplier_id: '',
    category_id: '',
    size: '',
    color: '',
    description: ''
  });
  
  const [productImageUrl, setProductImageUrl] = useState<string>('');

  useEffect(() => {
    if (tempProduct && isOpen) {
      // Converter preços de centavos para reais com formatação
      const priceInReais = tempProduct.price_cents ? (tempProduct.price_cents / 100).toFixed(2) : '';
      const costPriceInReais = tempProduct.cost_price_cents ? (tempProduct.cost_price_cents / 100).toFixed(2) : '';
      
      setFormData({
        name: tempProduct.name || '',
        short_code: tempProduct.short_code || '',
        price_cents: priceInReais,
        cost_price_cents: costPriceInReais,
        stock: tempProduct.stock?.toString() || '',
        stock_min: tempProduct.stock_min?.toString() || '0',
        brand_id: tempProduct.brand_id || '',
        supplier_id: tempProduct.supplier_id || '',
        category_id: tempProduct.category_id || '',
        size: tempProduct.size || '',
        color: tempProduct.color || '',
        description: tempProduct.description || ''
      });
      
      setProductImageUrl(tempProduct.photo_url || '');
      setRefreshKey(prev => prev + 1);
    }
  }, [tempProduct, isOpen]);

  // Função para formatar preço conforme o usuário digita
  const formatCurrencyInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const cents = parseInt(numbers);
    const reais = cents / 100;
    return reais.toFixed(2);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'price_cents' || field === 'cost_price_cents') {
      const formattedValue = formatCurrencyInput(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSave = () => {
    if (!tempProduct) return;

    // Validações
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do produto é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (formData.name.length > 22) {
      toast({
        title: "Erro",
        description: "Nome do produto deve ter no máximo 22 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.size && formData.size.length > 5) {
      toast({
        title: "Erro",
        description: "Tamanho deve ter no máximo 5 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (!formData.price_cents || isNaN(parseFloat(formData.price_cents)) || parseFloat(formData.price_cents) <= 0) {
      toast({
        title: "Erro",
        description: "Preço de venda deve ser um número maior que zero",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(formData.price_cents) > 9999.99) {
      toast({
        title: "Erro",
        description: "Preço máximo permitido é R$ 9.999,99",
        variant: "destructive"
      });
      return;
    }

    const updatedProduct: TempProduct = {
      ...tempProduct,
      name: formData.name.trim(),
      short_code: formData.short_code.trim(),
      price: parseFloat(formData.price_cents) || 0,
      price_cents: Math.round(parseFloat(formData.price_cents) * 100),
      cost_price_cents: formData.cost_price_cents ? Math.round(parseFloat(formData.cost_price_cents) * 100) : null,
      stock: parseInt(formData.stock) || 0,
      stock_min: parseInt(formData.stock_min) || 0,
      brand_id: formData.brand_id || '',
      supplier_id: formData.supplier_id || '',
      category_id: formData.category_id || '',
      size: formData.size?.trim() || '',
      color: formData.color?.trim() || detectColorFromProductName(formData.name) || '',
      description: formData.description?.trim() || '',
      photo_url: productImageUrl || '',
      updated_at: new Date().toISOString()
    };

    onSave(updatedProduct);
    onOpenChange(false);
  };

  if (!tempProduct) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[95vh] overflow-y-auto p-4 sm:p-6 scroll-smooth">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Editar Produto Temporário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pb-4">
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

            {/* Código */}
            <div>
              <Label htmlFor="short_code">Código do Produto</Label>
              <Input
                id="short_code"
                value={formData.short_code}
                onChange={(e) => handleInputChange("short_code", e.target.value)}
                placeholder="Código do produto"
                disabled
                className="text-base bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O código não pode ser alterado
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
                Digite apenas números. Ex: 1500 = R$ 15,00
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
                key={`image-${tempProduct.id}-${productImageUrl}`}
                productId={tempProduct.id}
                currentImageUrl={productImageUrl}
                onImageUploaded={setProductImageUrl}
                onImageRemoved={() => setProductImageUrl("")}
                disabled={false}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Informações da NF-e</h4>
            <p className="text-sm text-blue-700">
              Quantidade na NF-e: <strong>{tempProduct.nfeQuantity || 0}</strong> unidades
            </p>
            <p className="text-sm text-blue-700">
              Estoque final após aplicação: <strong>{(parseInt(formData.stock) || 0) + (tempProduct.nfeQuantity || 0)}</strong> unidades
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t bg-background sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-12 text-base"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="w-full h-12 text-base"
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
