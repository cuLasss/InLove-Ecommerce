import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Package, CheckCircle, Plus, X, Trash2, Search } from 'lucide-react';
import { NfeImport } from '@/hooks/useNfeImports';
import { ReconciliationItem, useSimilarProductsOptimized, Product, TempProduct, useProductReconciliation } from '@/hooks/useProductReconciliation';
import { TempProductDialog } from './TempProductDialog';
import { TempProductEditDialog } from './TempProductEditDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { productsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface NfeReconciliationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nfe: NfeImport | null;
  onApplyToStock: (nfeId: string, reconciliationItems: ReconciliationItem[]) => Promise<void>;
  isApplying?: boolean;
}

export function NfeReconciliationModal({
  isOpen,
  onOpenChange,
  nfe,
  onApplyToStock,
  isApplying = false
}: NfeReconciliationModalProps) {
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingTempProducts, setIsCreatingTempProducts] = useState(false);
  const [tempProducts, setTempProducts] = useState<TempProduct[]>([]);
  
  // Estados para criação sequencial de produtos
  const [isCreatingProducts, setIsCreatingProducts] = useState(false);
  const [creationProgress, setCreationProgress] = useState({ current: 0, total: 0, currentProduct: '' });
  
  // Estados para busca e seleção de itens
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const { createTempProductsSequentially } = useProductReconciliation();
  const { toast } = useToast();

  // Busca todos os produtos uma única vez para otimizar performance
  const searchTerms = reconciliationItems.map(item => 
    item.nfeItem.descricao || item.nfeItem.nome || ''
  ).filter(term => term.trim().length >= 2);
  
  const { data: allProducts, isLoading: isLoadingProducts } = useSimilarProductsOptimized(searchTerms);

  useEffect(() => {
    if (nfe && isOpen) {
      const items = (nfe.xml?.parsed?.itens || nfe.nfe_items || []).map((item: any, index: number) => ({
        id: `item-${index}`,
        nfeItem: item,
        selectedProductId: null,
        selectedProduct: null,
        isReconciled: false,
        action: 'match' as const,
        newProductName: item.descricao || item.nome || 'Produto não identificado',
        newProductSku: item.codigo || item.sku || ''
      }));
      
      setReconciliationItems(items);
      setTempProducts([]);
    }
  }, [nfe, isOpen]);

  const reconciledCount = reconciliationItems.filter(item => item.isReconciled).length;
  const allReconciled = reconciledCount === reconciliationItems.length;

  // Filtrar itens baseado na busca
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return reconciliationItems;
    
    const term = searchTerm.toLowerCase();
    return reconciliationItems.filter(item => {
      const descricao = (item.nfeItem.descricao || item.nfeItem.nome || '').toLowerCase();
      const codigo = (item.nfeItem.codigo || item.nfeItem.sku || '').toLowerCase();
      return descricao.includes(term) || codigo.includes(term);
    });
  }, [reconciliationItems, searchTerm]);

  const handleProductSelect = (itemId: string, product: Product | TempProduct | null) => {
    setReconciliationItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          // Se for um produto temporário, adicionar a quantidade da NFe
          let updatedProduct = product;
          if (product && (product as any)?.isTemp) {
            const nfeQty = item.nfeItem.quantidade || item.nfeItem.qtd || 0;
            updatedProduct = {
              ...product,
              nfeQuantity: nfeQty
            } as TempProduct;
          }
          
          return {
            ...item,
            selectedProduct: updatedProduct,
            selectedProductId: updatedProduct?.id || null,
            isReconciled: !!updatedProduct,
            action: updatedProduct ? 'match' : 'create',
            tempProduct: (updatedProduct as any)?.isTemp ? updatedProduct as TempProduct : undefined
          } as ReconciliationItem;
        }
        return item;
      })
    );
  };

  const handleProductCreated = async (productData: any) => {
    console.log('🎯 [Reconciliation] Dados de produto temporário recebidos:', productData);
    
    setIsCreatingTempProducts(true);
    
    try {
      // Busca informações das relações para mapear nomes corretos
      let categoryName = '';
      let brandName = '';
      let supplierName = '';
      
      try {
        console.log('🔍 [Reconciliation] Buscando relações para produto:', productData);
        
        const [categoriesRes, brandsRes, suppliersRes] = await Promise.all([
          universalDataAdapter.getCategories(),
          universalDataAdapter.getBrands(),
          universalDataAdapter.getSuppliers()
        ]);
        
        console.log('📊 [Reconciliation] Respostas das APIs:', {
          categories: categoriesRes,
          brands: brandsRes,
          suppliers: suppliersRes
        });
        
        // Mapeia categoria
        if (productData.category_id && categoriesRes.data) {
          const category = categoriesRes.data.find(c => c.id === productData.category_id);
          categoryName = category?.name || '';
          console.log('🏷️ [Reconciliation] Categoria encontrada:', { 
            id: productData.category_id, 
            name: categoryName,
            category 
          });
        } else {
          console.warn('⚠️ [Reconciliation] Categoria não encontrada:', { 
            category_id: productData.category_id,
            categories_data: categoriesRes.data 
          });
        }
        
        // Mapeia marca
        if (productData.brand_id && brandsRes.data) {
          const brand = brandsRes.data.find(b => b.id === productData.brand_id);
          brandName = brand?.name || '';
          console.log('🏷️ [Reconciliation] Marca encontrada:', { 
            id: productData.brand_id, 
            name: brandName,
            brand 
          });
        } else {
          console.warn('⚠️ [Reconciliation] Marca não encontrada:', { 
            brand_id: productData.brand_id,
            brands_data: brandsRes.data 
          });
        }
        
        // Mapeia fornecedor
        if (productData.supplier_id && suppliersRes.data) {
          const supplier = suppliersRes.data.find(s => s.id === productData.supplier_id);
          supplierName = supplier?.name || '';
          console.log('🏷️ [Reconciliation] Fornecedor encontrado:', { 
            id: productData.supplier_id, 
            name: supplierName,
            supplier 
          });
        } else {
          console.warn('⚠️ [Reconciliation] Fornecedor não encontrado:', { 
            supplier_id: productData.supplier_id,
            suppliers_data: suppliersRes.data 
          });
        }
      } catch (error) {
        console.warn('⚠️ [Reconciliation] Erro ao buscar relações, usando valores padrão:', error);
      }

      const tempProduct: TempProduct = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: productData.name || 'Produto sem nome',
        short_code: productData.short_code || '',
        category: categoryName,
        price: productData.price_cents ? productData.price_cents / 100 : 0,
        stock: productData.stock || 0,
        qr_code: '',
        brand: brandName,
        supplier: supplierName,
        size: productData.size || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        categories: null,
        brands: null,
        suppliers: null,
        brand_id: productData.brand_id,
        supplier_id: productData.supplier_id,
        category_id: productData.category_id,
        price_cents: productData.price_cents,
        cost_price_cents: productData.cost_price_cents,
        stock_min: productData.stock_min,
        color: productData.color,
        description: productData.description,
        photo_url: productData.photo_url, // ✅ Adicionar photo_url
        isTemp: true,
        nfeQuantity: 0,
        tempData: productData
      };

      console.log('📦 [Reconciliation] Produto temporário mapeado:', tempProduct);
      
      // Apenas adiciona o produto temporário à lista, sem selecionar automaticamente
      setTempProducts(prev => [...prev, tempProduct]);
      
      console.log('✅ [Reconciliation] Produto temporário adicionado à lista de opções');
      
    } catch (error) {
      console.error('❌ [Reconciliation] Erro ao criar produto temporário:', error);
    } finally {
      setIsCreatingTempProducts(false);
    }
  };

  const handleRemoveTempProduct = (itemId: string) => {
    setReconciliationItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, selectedProduct: null, selectedProductId: null, isReconciled: false }
          : item
      )
    );
  };

  const handleEditTempProduct = (itemId: string, updatedProduct: TempProduct) => {
    setReconciliationItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          // Manter a quantidade da NFe ao editar
          const nfeQty = item.nfeItem.quantidade || item.nfeItem.qtd || 0;
          const productWithNfeQty = {
            ...updatedProduct,
            nfeQuantity: nfeQty
          };
          
          return {
            ...item,
            selectedProduct: productWithNfeQty,
            tempProduct: productWithNfeQty
          };
        }
        return item;
      })
    );

    setTempProducts(prev =>
      prev.map(temp =>
        temp.id === updatedProduct.id ? updatedProduct : temp
      )
    );
  };

  const handleDeleteTempProduct = (tempProductId: string) => {
    // Remove o produto temporário da lista
    setTempProducts(prev => prev.filter(temp => temp.id !== tempProductId));
    
    // Remove a seleção de qualquer item que estava usando este produto temporário
    setReconciliationItems(prev =>
      prev.map(item => {
        if (item.selectedProduct?.id === tempProductId) {
          return {
            ...item,
            selectedProduct: null,
            selectedProductId: null,
            isReconciled: false,
            tempProduct: undefined
          };
        }
        return item;
      })
    );
    
    toast({
      title: "Produto removido",
      description: "Produto temporário excluído com sucesso",
    });
  };

  const handleApplyToStock = async () => {
    if (!nfe) return;

    setIsProcessing(true);
    setIsCreatingProducts(true);
    
    try {
      console.log('🚀 [Reconciliation] Iniciando aplicação ao estoque...');
      
      // 1. Identifica produtos temporários que precisam ser criados
      const tempProductsToCreate = reconciliationItems
        .filter(item => item.tempProduct && item.isReconciled)
        .map(item => item.tempProduct!);
      
      console.log('📦 [Reconciliation] Produtos temporários para criar:', tempProductsToCreate.length);
      console.log('🔍 [Reconciliation] Itens reconciliados:', reconciliationItems.filter(item => item.isReconciled));
      console.log('🔍 [Reconciliation] Itens com produtos temporários:', reconciliationItems.filter(item => item.tempProduct));
      
      // 2. Configura progresso inicial
      setCreationProgress({
        current: 0,
        total: tempProductsToCreate.length,
        currentProduct: ''
      });
      
      // 3. Cria produtos sequencialmente
      const createdProducts = [];
      for (let i = 0; i < tempProductsToCreate.length; i++) {
        const tempProduct = tempProductsToCreate[i];
        
        // Atualiza progresso
        setCreationProgress({
          current: i + 1,
          total: tempProductsToCreate.length,
          currentProduct: tempProduct.name
        });
        
        console.log(`🔄 [Reconciliation] Criando produto ${i + 1}/${tempProductsToCreate.length}: ${tempProduct.name}`);
        
        try {
          // Cria o produto real no sistema usando productsApi
          const productData = {
            name: tempProduct.name,
            short_code: tempProduct.short_code,
            brand_id: tempProduct.brand_id || null,
            supplier_id: tempProduct.supplier_id || null,
            size: tempProduct.size || null,
            color: tempProduct.color || null,
            price_cents: tempProduct.price_cents || 0,
            cost_price_cents: tempProduct.cost_price_cents || 0,
            category_id: tempProduct.category_id || null,
            description: tempProduct.description || null,
            stock: tempProduct.stock || 0,
            stock_min: tempProduct.stock_min || 0,
            stock_consigned: 0,
            qr_code: `inlove_product:${tempProduct.short_code}`,
            photo_url: tempProduct.photo_url || null
          };
          
          const createdProduct = await productsApi.create(productData);
          
          createdProducts.push({
            ...createdProduct,
            originalTempProduct: tempProduct
          });
          
          console.log(`✅ [Reconciliation] Produto criado com sucesso: ${tempProduct.name}`);
          
          // Delay entre criações para melhor UX
          if (i < tempProductsToCreate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (error) {
          console.error(`❌ [Reconciliation] Erro ao criar produto ${tempProduct.name}:`, error);
          throw error;
        }
      }
      
      console.log('✅ [Reconciliation] Todos os produtos criados:', createdProducts.length);
      
      // 4. Atualiza itens de reconciliação com produtos criados
      const updatedItems = reconciliationItems.map(item => {
        if (item.tempProduct && item.isReconciled) {
          const createdProduct = createdProducts.find(p => 
            p.originalTempProduct.name === item.tempProduct!.name
          );
          
          if (createdProduct) {
            return {
              ...item,
              selectedProduct: createdProduct,
              selectedProductId: createdProduct.id,
              tempProduct: undefined // Remove produto temporário
            };
          }
        }
        return item;
      });
      
      // 5. Aplica ao estoque
      console.log('📋 [Reconciliation] Aplicando ao estoque...');
      await onApplyToStock(nfe.id, updatedItems);
      
      console.log('🎉 [Reconciliation] Reconciliação concluída com sucesso!');
      onOpenChange(false);
      
    } catch (error) {
      console.error('❌ [Reconciliation] Erro ao aplicar ao estoque:', error);
      toast({
        title: "Erro",
        description: "Erro ao aplicar produtos ao estoque. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsCreatingProducts(false);
      setCreationProgress({ current: 0, total: 0, currentProduct: '' });
    }
  };

  if (!nfe) return null;

  // Tela de loading para criação de produtos
  if (isCreatingProducts) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Criando Novos Produtos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            {/* Progresso */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {creationProgress.current} / {creationProgress.total}
              </div>
              <div className="text-sm text-muted-foreground">
                Produtos criados
              </div>
            </div>
            
            {/* Barra de progresso */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${creationProgress.total > 0 ? (creationProgress.current / creationProgress.total) * 100 : 0}%` 
                }}
              ></div>
            </div>
            
            {/* Produto atual */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-sm font-medium">Criando produto...</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {creationProgress.currentProduct}
              </div>
            </div>
            
            {/* Informações adicionais */}
            <div className="text-center text-xs text-muted-foreground">
              Os produtos serão adicionados ao estoque automaticamente após a criação.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] w-full max-h-[95vh] h-full flex flex-col p-4 xl:p-6">
        {/* Cabeçalho compacto */}
        <DialogHeader className="pb-2 xl:pb-3 pr-8 xl:pr-10">
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-base xl:text-lg break-words leading-tight">
              Reconciliação - NF #{nfe.numero}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs xl:text-sm text-muted-foreground">
              <span className="whitespace-nowrap">{nfe.data_emissao ? format(new Date(nfe.data_emissao), 'dd/MM/yyyy') : 'Data N/A'}</span>
              <span className="whitespace-nowrap">{nfe.total_products} produtos</span>
              <span className="font-medium text-foreground whitespace-nowrap">R$ {nfe.valor_total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de busca e status */}
        <div className="py-2 xl:py-3 border-b space-y-2 xl:space-y-3">
          {/* Busca */}
          <div className="relative">
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 text-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs xl:text-sm">
            <div>
              <span className="font-bold text-green-600">{reconciledCount}</span> de <span className="font-bold">{reconciliationItems.length}</span> reconciliados
            </div>
            {searchTerm && (
              <div className="text-xs text-muted-foreground">
                {filteredItems.length} de {reconciliationItems.length} itens
              </div>
            )}
          </div>
        </div>

        {/* Lista compacta de itens */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="divide-y">
            {filteredItems.map((item, index) => {
              const isSelected = selectedItemId === item.id;
              const isReconciled = item.isReconciled;
              
              return (
                <div 
                  key={item.id} 
                  className={`p-3 transition-colors ${
                    isSelected ? 'bg-blue-50' : isReconciled ? 'bg-green-50' : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Visualização compacta */}
                  {!isSelected ? (
                    <div 
                      className="flex items-center justify-between cursor-pointer gap-2"
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div className="flex items-center gap-2 xl:gap-3 flex-1 min-w-0 max-w-full">
                        <div className="flex-shrink-0 w-7 h-7 xl:w-8 xl:h-8 bg-muted rounded-full flex items-center justify-center text-xs xl:text-sm font-medium">
                          {reconciliationItems.indexOf(item) + 1}
                        </div>
                        <div className="flex-1 min-w-0 max-w-full">
                          <div className="font-medium text-xs xl:text-sm break-words leading-tight">
                            {item.nfeItem.descricao || item.nfeItem.nome}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-1">
                            {item.nfeItem.codigo && <span className="whitespace-nowrap">Cód: {item.nfeItem.codigo}</span>}
                            {item.nfeItem.codigo && <span>•</span>}
                            <span className="whitespace-nowrap">Qtd: {item.nfeItem.quantidade || item.nfeItem.qtd}</span>
                            <span>•</span>
                            <span className="whitespace-nowrap">R$ {(item.nfeItem.valorUnitario || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 xl:gap-2 flex-shrink-0">
                        {isReconciled ? (
                          <>
                            <CheckCircle className="h-4 w-4 xl:h-5 xl:w-5 text-green-500" />
                            <span className="text-xs xl:text-sm text-green-600 font-medium hidden sm:inline">Reconciliado</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-xs xl:text-sm text-amber-600 hidden sm:inline">Pendente</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Visualização expandida para reconciliação */
                    <div className="space-y-2 xl:space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 xl:gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-7 h-7 xl:w-8 xl:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs xl:text-sm font-medium">
                            {reconciliationItems.indexOf(item) + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm xl:text-base break-words leading-tight">
                              {item.nfeItem.descricao || item.nfeItem.nome}
                            </div>
                            <div className="text-xs xl:text-sm text-muted-foreground flex flex-wrap gap-x-1">
                              <span className="whitespace-nowrap">Código: {item.nfeItem.codigo || 'N/A'}</span>
                              <span>•</span>
                              <span className="whitespace-nowrap">Qtd: {item.nfeItem.quantidade || item.nfeItem.qtd}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItemId(null)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <ReconciliationItemCard
                        item={item}
                        onProductSelect={(product) => handleProductSelect(item.id, product)}
                        onProductCreated={handleProductCreated}
                        onRemoveTempProduct={() => handleRemoveTempProduct(item.id)}
                        onEditTempProduct={(updatedProduct) => handleEditTempProduct(item.id, updatedProduct)}
                        onDeleteTempProduct={handleDeleteTempProduct}
                        tempProducts={tempProducts}
                        isCreatingTempProducts={isCreatingTempProducts}
                        allProducts={allProducts || []}
                        isLoadingProducts={isLoadingProducts}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé compacto */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 xl:pt-3 border-t">
          <div className="text-xs text-muted-foreground break-words">
            {!allReconciled && "Reconcilie todos os produtos para continuar"}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing || isApplying}
              className="text-xs xl:text-sm"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyToStock}
              disabled={!allReconciled || isProcessing || isApplying}
              className="min-w-[160px] text-xs xl:text-sm"
            >
              <CheckCircle className="h-3 w-3 xl:h-4 xl:w-4 mr-2" />
              {isProcessing || isApplying ? 'Aplicando...' : 'Aplicar ao Estoque'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente para cada item de reconciliação
function ReconciliationItemCard({
  item,
  onProductSelect,
  onProductCreated,
  onRemoveTempProduct,
  onEditTempProduct,
  onDeleteTempProduct,
  tempProducts,
  isCreatingTempProducts,
  allProducts,
  isLoadingProducts
}: {
  item: ReconciliationItem;
  onProductSelect: (product: Product | TempProduct | null) => void;
  onProductCreated: (product: any) => void;
  onRemoveTempProduct: () => void;
  onEditTempProduct: (updatedProduct: TempProduct) => void;
  onDeleteTempProduct: (tempProductId: string) => void;
  tempProducts: TempProduct[];
  isCreatingTempProducts: boolean;
  allProducts: Product[];
  isLoadingProducts: boolean;
}) {
  const searchTerm = item.nfeItem.descricao || item.nfeItem.nome || '';
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // Debug: Log dos dados do item para verificar estrutura
  console.log('🔍 [Reconciliation] Dados do item NF-e:', {
    item: item.nfeItem,
    campos_disponiveis: Object.keys(item.nfeItem),
    valor_unitario: item.nfeItem.valorUnitario,
    valor_total: item.nfeItem.valorTotal,
    quantidade: item.nfeItem.quantidade
  });

  // Função melhorada para calcular similaridade entre strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
    // Algoritmo de similaridade baseado em múltiplos fatores
    const words1 = s1.split(/\s+/).filter(w => w.length > 2); // Palavras com mais de 2 caracteres
    const words2 = s2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // 1. Similaridade por palavras exatas
    let exactMatches = 0;
    for (const word1 of words1) {
      if (words2.includes(word1)) {
        exactMatches++;
      }
    }
    const exactSimilarity = exactMatches / Math.max(words1.length, words2.length);
    
    // 2. Similaridade por palavras parciais (substrings)
    let partialMatches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          partialMatches++;
          break;
        }
      }
    }
    const partialSimilarity = partialMatches / Math.max(words1.length, words2.length);
    
    // 3. Similaridade por caracteres comuns (Levenshtein simplificado)
    const maxLen = Math.max(s1.length, s2.length);
    const minLen = Math.min(s1.length, s2.length);
    let commonChars = 0;
    
    for (let i = 0; i < minLen; i++) {
      if (s1[i] === s2[i]) {
        commonChars++;
      }
    }
    const charSimilarity = commonChars / maxLen;
    
    // 4. Similaridade por palavras-chave importantes (primeiras palavras têm mais peso)
    let keywordSimilarity = 0;
    const importantWords1 = words1.slice(0, 3); // Primeiras 3 palavras
    const importantWords2 = words2.slice(0, 3);
    
    for (const word1 of importantWords1) {
      for (const word2 of importantWords2) {
        if (word1 === word2) {
          keywordSimilarity += 0.3; // Peso maior para palavras-chave
        } else if (word1.includes(word2) || word2.includes(word1)) {
          keywordSimilarity += 0.15;
        }
      }
    }
    
    // Combinação ponderada dos diferentes tipos de similaridade
    const finalSimilarity = (
      exactSimilarity * 0.4 +      // 40% para palavras exatas
      partialSimilarity * 0.3 +    // 30% para palavras parciais
      charSimilarity * 0.2 +       // 20% para caracteres comuns
      Math.min(keywordSimilarity, 1) * 0.1 // 10% para palavras-chave
    );
    
    return Math.min(finalSimilarity, 1.0);
  };

  // Calcula produtos similares localmente usando os produtos já carregados
  const similarProducts = useMemo(() => {
    if (!allProducts.length || !searchTerm.trim()) return [];
    
    return allProducts
      .map(product => ({
        ...product,
        similarity: calculateSimilarity(product.name, searchTerm)
      }))
      .filter(product => product.similarity > 0.15) // Mínimo 15% de similaridade
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Máximo 5 produtos similares
  }, [allProducts, searchTerm]);

  // Combina produtos similares com produtos temporários
  const allAvailableProducts = useMemo(() => {
    const regularProducts = similarProducts || [];
    
    // Adiciona produtos temporários com similaridade calculada
    // Produtos temporários sempre aparecem, independente da similaridade
    const tempProductsWithSimilarity = tempProducts.map(tempProduct => ({
      ...tempProduct,
      similarity: Math.max(0.8, calculateSimilarity(tempProduct.name, searchTerm)) // Garante alta prioridade
    }));

    // Combina produtos: temporários sempre aparecem primeiro
    const combined = [
      ...tempProductsWithSimilarity, // Produtos temporários primeiro
      ...regularProducts.filter(product => product.similarity > 0.15) // Produtos regulares com filtro
    ]
      .sort((a, b) => {
        // Produtos temporários sempre no topo
        const aIsTemp = (a as any).isTemp;
        const bIsTemp = (b as any).isTemp;
        if (aIsTemp && !bIsTemp) return -1;
        if (!aIsTemp && bIsTemp) return 1;
        // Depois ordena por similaridade
        return b.similarity - a.similarity;
      })
      .slice(0, 10); // Máximo 10 produtos

    console.log('🔍 [ReconciliationItemCard] Produtos disponíveis:', {
      tempCount: tempProductsWithSimilarity.length,
      regularCount: regularProducts.length,
      combinedCount: combined.length,
      tempProducts: tempProductsWithSimilarity.map(p => ({ name: p.name, similarity: p.similarity })),
      combined: combined.map(p => ({ name: p.name, similarity: p.similarity, isTemp: (p as any).isTemp }))
    });

    return combined;
  }, [similarProducts, tempProducts, searchTerm]);

  const handleRemoveSelection = () => {
    onProductSelect(null);
    onRemoveTempProduct();
  };

  return (
    <>
      <Card className="border rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 xl:pb-4 p-3 xl:p-6">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div className="flex-1 min-w-0 max-w-full">
              <CardTitle className="text-sm xl:text-lg font-semibold text-gray-900 mb-2 break-words leading-tight">
                {item.nfeItem.descricao || item.nfeItem.nome}
              </CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 xl:gap-4 text-xs xl:text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">
                    <span className="font-medium">SKU:</span> <span className="break-words">{item.nfeItem.codigo || 'N/A'}</span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium">Qtd:</span> {item.nfeItem.quantidade || item.nfeItem.qtd}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">
                    <span className="font-medium">Preço:</span> <span className="whitespace-nowrap">R$ {(item.nfeItem.valorUnitario || item.nfeItem.valor_unitario || item.nfeItem.preco || item.nfeItem.unit_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium">Total:</span> <span className="whitespace-nowrap">R$ {(item.nfeItem.valorTotal || item.nfeItem.valor_total || item.nfeItem.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            {item.isReconciled && (
              <div className="flex items-center gap-2 bg-green-50 px-2 xl:px-3 py-1.5 xl:py-2 rounded-lg flex-shrink-0">
                <CheckCircle className="h-4 w-4 xl:h-5 xl:w-5 text-green-500" />
                <span className="text-xs xl:text-sm text-green-600 font-medium">Reconciliado</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 p-3 xl:p-6">
          {!item.isReconciled ? (
            <div className="space-y-4 xl:space-y-6">
              {/* Produtos similares */}
              <div>
                <Label className="text-xs xl:text-sm font-semibold text-gray-700 mb-2 xl:mb-3 block">Produtos similares encontrados:</Label>
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-6 xl:py-8">
                    <div className="animate-spin rounded-full h-5 w-5 xl:h-6 xl:w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 xl:ml-3 text-xs xl:text-sm text-muted-foreground">Buscando...</span>
                  </div>
                ) : allAvailableProducts && allAvailableProducts.length > 0 ? (
                  <div className="space-y-2 xl:space-y-3 max-h-[300px] xl:max-h-80 overflow-y-auto">
                    {allAvailableProducts.map((product) => {
                      const isSelected = item.selectedProduct?.id === product.id;
                      return (
                        <div
                          key={product.id}
                          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 xl:gap-3 p-3 xl:p-4 border rounded-lg transition-all group ${
                            isSelected
                              ? 'bg-green-50 border-green-300 ring-2 ring-green-200'
                              : (product as any).isTemp 
                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300' 
                                : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                          }`}
                        >
                          <div 
                            className="flex-1 cursor-pointer min-w-0"
                            onClick={() => onProductSelect(product)}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              <div className={`font-medium text-xs xl:text-sm break-words leading-tight flex-1 ${
                                isSelected 
                                  ? 'text-green-800' 
                                  : 'text-gray-900 group-hover:text-blue-900'
                              }`}>
                                {product.name}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {(product as any).isTemp && (
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded whitespace-nowrap">
                                    Novo
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded whitespace-nowrap">
                                    Selecionado
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`text-xs xl:text-sm mt-1 break-words ${
                              isSelected ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              SKU: {product.short_code} • Cat: {product.category || 'Sem categoria'}
                            </div>
                            <div className={`text-xs mt-1 flex flex-wrap gap-x-1 ${
                              isSelected ? 'text-green-500' : 'text-gray-500'
                            }`}>
                              <span className="whitespace-nowrap">Estoque: {product.stock || 0} un.</span>
                              {(() => {
                                const nfeQty = item.nfeItem.quantidade || item.nfeItem.qtd || 0;
                                const currentStock = product.stock || 0;
                                const newStock = currentStock + nfeQty;
                                const isLowStock = newStock < 5;
                                const isHighIncrease = nfeQty > currentStock * 2;
                                
                                if (isLowStock) {
                                  return (
                                    <span className="text-orange-600 font-medium whitespace-nowrap">
                                      ⚠️ Baixo estoque
                                    </span>
                                  );
                                } else if (isHighIncrease) {
                                  return (
                                    <span className="text-blue-600 font-medium whitespace-nowrap">
                                      📈 Grande aumento
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0 self-end xl:self-center">
                            <div className={`text-xs xl:text-sm font-semibold px-2 py-1 rounded whitespace-nowrap ${
                              isSelected
                                ? 'text-green-600 bg-green-100'
                                : (() => {
                                    const similarity = product.similarity || 0;
                                    if (similarity >= 0.8) return 'text-green-600 bg-green-100';
                                    if (similarity >= 0.6) return 'text-blue-600 bg-blue-100';
                                    if (similarity >= 0.4) return 'text-yellow-600 bg-yellow-100';
                                    return 'text-orange-600 bg-orange-100';
                                  })()
                            }`}>
                              {Math.round((product.similarity || 0) * 100)}%
                            </div>
                            
                            {/* Botão de excluir apenas para produtos temporários */}
                            {(product as any).isTemp && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 xl:h-8 xl:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProductToDelete({ id: product.id, name: product.name });
                                  setDeleteDialogOpen(true);
                                }}
                                title="Excluir produto temporário"
                              >
                                <Trash2 className="h-3 w-3 xl:h-4 xl:w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs xl:text-sm text-gray-500 py-4 xl:py-6 text-center bg-gray-50 rounded-lg">
                    Nenhum produto similar encontrado
                  </div>
                )}
              </div>

              {/* Opção de criar novo produto */}
              <div className="pt-3 xl:pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 xl:gap-3 mb-3 xl:mb-4">
                  <Label className="text-xs xl:text-sm font-semibold text-gray-700">Ou criar um novo produto:</Label>
                  <TempProductDialog 
                    onProductCreated={onProductCreated} 
                    disabled={isCreatingTempProducts}
                    loading={isCreatingTempProducts}
                    tempProducts={tempProducts}
                  />
                </div>
                <div className="text-xs xl:text-sm text-gray-600 bg-blue-50 p-2 xl:p-3 rounded-lg">
                  {isCreatingTempProducts 
                    ? "⏳ Criando produto temporário..." 
                    : "Produto será adicionado à lista de opções para seleção"
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 p-4 xl:p-5 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3 xl:gap-4 flex-1 min-w-0">
                <CheckCircle className="h-5 w-5 xl:h-6 xl:w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-green-800 text-sm xl:text-base break-words leading-tight">
                    {item.action === 'match' && item.selectedProduct 
                      ? `Reconciliado com: ${item.selectedProduct.name}`
                      : `Novo produto criado: ${item.newProductName}`
                    }
                  </div>
                  <div className="text-xs xl:text-sm text-green-600 mt-1 break-words">
                    {item.action === 'match' && item.selectedProduct 
                      ? `SKU: ${item.selectedProduct.short_code}`
                      : `SKU: ${item.newProductSku}`
                    }
                  </div>
                  {item.action === 'match' && item.selectedProduct && (
                    <div className="text-xs text-green-500 mt-2 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium whitespace-nowrap">NF-e:</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 xl:py-1 rounded whitespace-nowrap">
                          {item.nfeItem.quantidade || item.nfeItem.qtd || 0} un.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium whitespace-nowrap">Estoque atual:</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 xl:py-1 rounded whitespace-nowrap">
                          {item.selectedProduct.stock || 0} un.
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium whitespace-nowrap">Após:</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 xl:py-1 rounded font-semibold whitespace-nowrap">
                          {(item.selectedProduct.stock || 0) + (item.nfeItem.quantidade || item.nfeItem.qtd || 0)} un.
                        </span>
                      </div>
                    </div>
                  )}
                  {item.selectedProduct && tempProducts.some(p => p.id === item.selectedProduct?.id) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300 whitespace-nowrap">
                        Produto Temporário
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 xl:h-7 px-2 xl:px-3 text-xs hover:bg-blue-100"
                        onClick={() => setIsEditDialogOpen(true)}
                      >
                        <Package className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveSelection}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar produto temporário */}
      <TempProductEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        tempProduct={item.selectedProduct as TempProduct}
        onSave={onEditTempProduct}
      />

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Excluir Produto Temporário
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja excluir o produto temporário?
              </p>
              {productToDelete && (
                <div className="bg-muted p-3 rounded-lg mt-2">
                  <p className="font-medium text-foreground">{productToDelete.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) {
                  onDeleteTempProduct(productToDelete.id);
                  setProductToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}