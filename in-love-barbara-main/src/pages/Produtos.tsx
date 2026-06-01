
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, QrCode, AlertTriangle, Package2, Tag, Award, Palette, Truck, Ruler, Droplet, FileText, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ArrowUp } from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { useProducts, type Product } from "@/hooks/useProducts"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { ProductAddDialog } from "@/components/products/ProductAddDialog"
import { ProductEditDialog } from "@/components/products/ProductEditDialog"
import { ProductDeleteDialog } from "@/components/products/ProductDeleteDialog"
import { ProductLabelPrint } from "@/components/products/ProductLabelPrint"
import { CategoryManagement } from "@/components/products/CategoryManagement"
import { BrandManagement } from "@/components/products/BrandManagement"
import { SupplierManagement } from "@/components/products/SupplierManagement"
import { ProductStats } from "@/components/products/ProductStats"
import { ProductFilters, ProductFilters as ProductFiltersType } from "@/components/products/ProductFilters"
import { InfoChip } from "@/components/ui/info-chip"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { useProductReservas } from '@/hooks/useConsignadoReservas'
import { ReservedUnitsModal } from '@/components/products/ReservedUnitsModal'
import { ConsignadoStockOverview } from '@/components/consignado/ConsignadoStockOverview'
import { universalDataAdapter } from '@/lib/universal-data-adapter'
import { usePerformanceLogger } from '@/hooks/usePerformanceLogger'

const Produtos = () => {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Produtos')
  
  const pageStartTime = useRef<number>(Date.now())
  const renderCount = useRef<number>(0)
  renderCount.current += 1
  
  // ✅ OTIMIZAÇÃO: Log apenas na primeira renderização para evitar spam
  if (renderCount.current === 1) {
    console.log('🚀 [Produtos] Componente iniciando renderização...')
  }
  
  const { products, isLoading, error, forceRefresh } = useProducts()
  
  useEffect(() => {
    if (!isLoading && products.length > 0) {
      const loadTime = Date.now() - pageStartTime.current
      // ✅ OTIMIZAÇÃO: Log apenas uma vez quando carregar
      if (renderCount.current <= 2) {
        console.log(`✅ [Produtos] Produtos carregados:`, {
          count: products.length,
          loadTime: `${loadTime}ms`,
          source: loadTime < 500 ? 'cache' : 'network',
          renders: renderCount.current
        })
      }
    }
  }, [isLoading, products.length])
  const [searchTerm, setSearchTerm] = useState("")
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ProductFiltersType>({
    sizes: [],
    brands: [],
    categories: [],
    suppliers: [],
    colors: []
  })
  const [stockFilter, setStockFilter] = useState<'low_stock' | 'no_stock' | 'in_stock' | 'consigned' | null>(null)
  const [consignedProductIds, setConsignedProductIds] = useState<Set<string>>(new Set())
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [currentTab, setCurrentTab] = useState("produtos")
  const [isFirstMount, setIsFirstMount] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const PRODUCTS_PER_PAGE = 30 // Mostrar 30 produtos por vez
  const { toast } = useToast()
  
  // Efeito para simular loading ao trocar de aba para produtos
  useEffect(() => {
    // Não ativar loading na primeira montagem (já tem o isLoading do hook)
    if (isFirstMount) {
      setIsFirstMount(false)
      return
    }
    
    if (currentTab === "produtos") {
      setIsLoadingProducts(true)
      
      // Tempo mínimo de loading - reduzido devido à paginação (apenas 30 produtos por vez)
      const timer = setTimeout(() => {
        setIsLoadingProducts(false)
      }, 400) // 400ms de loading - suficiente com paginação
      
      return () => clearTimeout(timer)
    } else {
      setIsLoadingProducts(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab])

  // Função para recarregar produtos
  const refreshProducts = () => {
    console.log('🔄 [Produtos Page] Forcing products refresh...');
    forceRefresh(); // Usa a função do hook useProducts
    toast({
      title: "Atualizando",
      description: "Recarregando produtos do banco de dados...",
    });
  }

  
  // Mostra erro se houver
  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos",
        variant: "destructive"
      })
    }
  }, [error, toast])

  // ✅ OTIMIZAÇÃO: Usar React Query para cachear produtos consignados
  // Só buscar quando estiver na aba de produtos (não em outras abas)
  const consignedQueryStartTime = useRef<number>(Date.now())
  const consignedQueryLogged = useRef<boolean>(false)
  const { data: consignedProductsData, isLoading: isLoadingConsigned } = useQuery({
    queryKey: ['consigned-products'],
    queryFn: async () => {
      // ✅ OTIMIZAÇÃO: Log apenas uma vez
      if (!consignedQueryLogged.current) {
        console.log('🔍 [Produtos] Buscando produtos consignados...')
        consignedQueryLogged.current = true
      }
      const startTime = Date.now()
        const response = await universalDataAdapter.getConsignedProducts();
      const queryTime = Date.now() - startTime
      console.log(`✅ [Produtos] Produtos consignados carregados em ${queryTime}ms:`, response.data?.length || 0)
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 30 * 60 * 1000,
    enabled: products.length > 0 && currentTab === 'produtos' // ✅ OTIMIZAÇÃO: Só buscar na aba de produtos
  })
  
  useEffect(() => {
    if (!isLoadingConsigned && consignedProductsData && renderCount.current <= 3) {
      const totalTime = Date.now() - consignedQueryStartTime.current
      console.log(`✅ [Produtos] Query de produtos consignados concluída:`, {
        count: consignedProductsData.length,
        totalTime: `${totalTime}ms`
      })
    }
  }, [isLoadingConsigned, consignedProductsData])

  // Atualizar IDs de produtos em consignação quando os dados mudarem
  useEffect(() => {
    if (consignedProductsData) {
      const consignedIds = new Set(consignedProductsData.map((product: any) => product.id));
          setConsignedProductIds(consignedIds);
        } else {
          setConsignedProductIds(new Set());
        }
  }, [consignedProductsData]);

  // Filtrar produtos baseado no termo de busca e filtros
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => {
        // Busca por nome
        if (product.name?.toLowerCase().includes(term)) return true;
        
        // Busca por código reduzido (short_code)
        if (product.short_code?.toLowerCase().includes(term)) return true;
        
        // Busca por categoria
        if (product.category?.toLowerCase().includes(term)) return true;
        
        // Busca por marca
        if (product.brand?.toLowerCase().includes(term)) return true;
        
        // Busca por fornecedor
        if (product.supplier?.toLowerCase().includes(term)) return true;
        
        // Busca por tamanho
        if (product.size?.toLowerCase().includes(term)) return true;
        
        // Busca por cor
        if (product.color?.toLowerCase().includes(term)) return true;
        
        // Busca por descrição
        if (product.description?.toLowerCase().includes(term)) return true;
        
        return false;
      });
    }

    // Filtros por atributos
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product => 
        filters.categories.includes(product.category || '')
      );
    }

    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.brand || '')
      );
    }

    if (filters.sizes.length > 0) {
      filtered = filtered.filter(product => 
        filters.sizes.includes(product.size || '')
      );
    }

    if (filters.suppliers.length > 0) {
      filtered = filtered.filter(product => 
        product.suppliers && filters.suppliers.includes(product.suppliers.name || '')
      );
    }

    if (filters.colors.length > 0) {
      filtered = filtered.filter(product => 
        filters.colors.includes(product.color || '')
      );
    }

    // Filtro por estoque (usando as mesmas funções do ProductStats)
    if (stockFilter) {
      const getCurrentStock = (product: any) => {
        // CORREÇÃO: Para exibição geral, usar 'stock' como estoque principal
        return product.stock || 0;
      };
      
      const getMinStock = (product: any) => {
        return product.stock_min !== undefined ? product.stock_min : (product.min_stock || 5);
      };

      switch (stockFilter) {
        case 'low_stock':
          filtered = filtered.filter(product => {
            const currentStock = getCurrentStock(product);
            const minStock = getMinStock(product);
            return currentStock > 0 && currentStock <= minStock;
          });
          break;
        case 'no_stock':
          filtered = filtered.filter(product => getCurrentStock(product) === 0);
          break;
        case 'in_stock':
          filtered = filtered.filter(product => {
            const currentStock = getCurrentStock(product);
            const minStock = getMinStock(product);
            return currentStock > minStock;
          });
          break;
        case 'consigned':
          console.log('🔍 [Produtos] Aplicando filtro consigned:', {
            totalProducts: filtered.length,
            consignedProductIds: Array.from(consignedProductIds),
            productsWithConsignedIds: filtered.filter(product => consignedProductIds.has(product.id)).length
          });
          filtered = filtered.filter(product => 
            consignedProductIds.has(product.id)
          );
          console.log('✅ [Produtos] Produtos após filtro consigned:', filtered.length);
          break;
      }
    }

    return filtered;
  }, [products, searchTerm, filters, stockFilter, consignedProductIds]);

  // Paginação dos produtos filtrados
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, PRODUCTS_PER_PAGE]);

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, stockFilter]);

  // Estatísticas são calculadas no componente ProductStats

  const getStockBadgeVariant = (product: any) => {
    const getCurrentStock = (product: any) => {
      // CORREÇÃO: Para exibição geral, usar 'stock' como estoque principal
      return product.stock || 0;
    };
    
    const getMinStock = (product: any) => {
      return product.stock_min !== undefined ? product.stock_min : (product.min_stock || 5);
    };

    const currentStock = getCurrentStock(product);
    const minStock = getMinStock(product);
    
    // Verificar se há unidades em consignação (RASCUNHO + ENTREGUE)
    // TODO: Implementar lógica de reservas quando necessário
    const unidadesEmConsignacao = 0;
    
    // CORREÇÃO: Calcular estoque disponível subtraindo unidades consignadas
    const estoqueDisponivel = Math.max(0, currentStock - unidadesEmConsignacao);

    if (currentStock === 0) return "destructive";
    if (estoqueDisponivel <= minStock) return "secondary";
    return "default";
  };

  const getStockBadgeText = (product: any) => {
    const getCurrentStock = (product: any) => {
      // CORREÇÃO: Para exibição geral, usar 'stock' como estoque principal
      return product.stock || 0;
    };
    
    const getMinStock = (product: any) => {
      return product.stock_min !== undefined ? product.stock_min : (product.min_stock || 5);
    };

    const stockFisico = getCurrentStock(product);
    const minStock = getMinStock(product);
    
    // Verificar se há unidades em consignação (RASCUNHO + ENTREGUE)
    // TODO: Implementar lógica de reservas quando necessário
    const unidadesEmConsignacao = 0;
    
    // ✅ CORREÇÃO: Mostrar estoque físico em vez de estoque disponível
    let baseText = '';
    if (stockFisico === 0) {
      baseText = "Sem estoque";
    } else if (stockFisico <= minStock) {
      baseText = `Estoque baixo (${stockFisico} unidades)`;
    } else {
      baseText = `${stockFisico} unidades`;
    }
    
    // Adicionar informação de consignação se houver
    if (unidadesEmConsignacao > 0) {
      baseText += ` (${unidadesEmConsignacao} em folha)`;
    }
    
    return baseText;
  };

  // Calcular lucro por unidade
  const calculateProfit = (product: Product) => {
    const sellPrice = product.price_cents ? product.price_cents / 100 : (product.price || 0);
    const costPrice = product.cost_price_cents ? product.cost_price_cents / 100 : (product.cost_price || 0);
    return sellPrice - costPrice;
  };

  const getProfitColor = (profit: number) => {
    if (profit <= 0) return "text-red-600";
    if (profit > 0 && profit <= 10) return "text-yellow-600";
    return "text-green-600";
  };

  // Modal de loading (aparece no primeiro load ou ao trocar de aba)
  const showLoadingModal = isLoading || isLoadingProducts;

  if (showLoadingModal) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center gap-8">
            {/* Spinner animado com ícone */}
            <div className="relative">
              {/* Círculo externo girando */}
              <div className="w-24 h-24 border-4 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin"></div>
              {/* Círculo interno girando na direção oposta */}
              <div className="absolute inset-2 w-20 h-20 border-4 border-gray-100 dark:border-gray-800 border-b-primary/60 rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.5s]"></div>
              {/* Ícone de pacote no centro */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Package className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            
            {/* Texto de carregamento */}
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Carregando Produtos
              </h3>
              <p className="text-sm text-muted-foreground">
                Preparando seu catálogo de produtos...
              </p>
              
              {/* Barra de progresso animada */}
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-loading"></div>
              </div>
              
              {/* Pontos animados */}
              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader 
        title="Produtos" 
        description="Gerencie seu catálogo de produtos"
        actions={
          <ProductAddDialog onSuccess={() => forceRefresh()} />
        }
      />

      <Tabs 
        defaultValue="produtos" 
        value={currentTab}
        onValueChange={(value) => setCurrentTab(value)}
        className="space-y-4 sm:space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 desktop:grid-cols-5 gap-1 h-auto">
          <TabsTrigger value="produtos" className="text-xs sm:text-sm py-2 sm:py-3">
            <Package className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden desktop:inline">Produtos</span>
            <span className="desktop:hidden">Prod.</span>
            <span className="ml-1">({products?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs sm:text-sm py-2 sm:py-3">
            <Tag className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden desktop:inline">Categorias</span>
            <span className="desktop:hidden">Cat.</span>
          </TabsTrigger>
          <TabsTrigger value="marcas" className="text-xs sm:text-sm py-2 sm:py-3">
            <Award className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden desktop:inline">Marcas</span>
            <span className="desktop:hidden">Marc.</span>
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="text-xs sm:text-sm py-2 sm:py-3">
            <Truck className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden desktop:inline">Fornecedores</span>
            <span className="desktop:hidden">Fornec.</span>
          </TabsTrigger>
          <TabsTrigger value="consignado" className="text-xs sm:text-sm py-2 sm:py-3">
            <Package2 className="mr-1 sm:mr-1.5 md:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden desktop:inline">Consignado</span>
            <span className="desktop:hidden">Cons.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-6">
          {/* Estatísticas */}
          <ProductStats 
            products={products || []} 
            consignedProductIds={consignedProductIds}
            onFilterClick={setStockFilter}
          />
          
          {/* Filtros */}
          <ProductFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            products={products || []}
            onFiltersChange={setFilters}
            stockFilter={stockFilter}
          />

          {/* Informação de paginação */}
          {filteredProducts.length > PRODUCTS_PER_PAGE && (
            <div className="flex items-center justify-between px-2 py-3 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}</span> a{" "}
                <span className="font-medium text-foreground">{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)}</span> de{" "}
                <span className="font-medium text-foreground">{filteredProducts.length}</span> produtos
              </div>
              <div className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{currentPage}</span> de{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </div>
            </div>
          )}

          {/* Lista de Produtos */}
          <div className="space-y-2 sm:space-y-3">
            {paginatedProducts.map((product) => (
              <Card key={product.id} className="relative">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Informações principais */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2 sm:gap-4 mb-2">
                        <div className="flex flex-col tablet:flex-row items-start tablet:items-start justify-between gap-3 tablet:gap-4">
                          <div className="flex-1 w-full tablet:w-auto min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold break-words whitespace-normal leading-tight">{product.name}</h3>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                              <span className="font-mono">{product.short_code}</span>
                              {consignedProductIds.has(product.id) && (
                                <ReservedUnitsModal 
                                  reservas={{
                                    product_id: product.id,
                                    product_name: product.name,
                                    short_code: product.short_code,
                                    total_reservado: 0,
                                    clientes: []
                                  }}
                                >
                                  <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50">
                                    <Package2 className="mr-1 h-3 w-3" />
                                    {(() => {
                                      // TODO: Implementar lógica de reservas quando necessário
                                      return 'Consignado';
                                    })()}
                                  </Badge>
                                </ReservedUnitsModal>
                              )}
                            </div>
                          </div>
                          
                          {/* Informações financeiras no canto superior direito */}
                          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 flex-shrink-0 w-full tablet:w-auto">
                            <div className="flex flex-col tablet:items-end items-start gap-1">
                              <div className={`text-sm sm:text-base font-semibold flex items-center gap-1 sm:gap-2 ${getProfitColor(calculateProfit(product))}`}>
                                {calculateProfit(product) >= 0 ? (
                                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                                {calculateProfit(product) >= 0 ? '+' : ''}{formatCurrency(calculateProfit(product))}
                                <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                                  {calculateProfit(product) >= 0 ? 'lucro/unidade' : 'prejuízo/unidade'}
                                </span>
                              </div>
                              <div className="text-xs sm:text-sm font-medium text-blue-600">
                                Preço: {formatCurrency(product.price_cents ? product.price_cents / 100 : (product.price || 0))}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                Custo: {formatCurrency(product.cost_price_cents ? product.cost_price_cents / 100 : (product.cost_price || 0))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informações detalhadas organizadas */}
                      <div className="space-y-2 mb-3">
                        {/* Primeira linha: Categoria, Marca, Fornecedor */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          {product.category && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Tag className="h-3 w-3" />
                              <span className="truncate">{product.category}</span>
                            </div>
                          )}
                          {product.brand && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Award className="h-3 w-3" />
                              <span className="truncate">{typeof product.brand === 'string' ? product.brand : (product.brand as any)?.name}</span>
                            </div>
                          )}
                          {product.supplier && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Truck className="h-3 w-3" />
                              <span className="truncate">{typeof product.supplier === 'string' ? product.supplier : (product.supplier as any)?.name}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Segunda linha: Tamanho, Cor */}
                        {(product.size || product.color) && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                            {product.size && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Ruler className="h-3 w-3" />
                                <span>Tamanho: {product.size}</span>
                              </div>
                            )}
                            {product.color && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Palette className="h-3 w-3" />
                                <span>Cor: {product.color}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Terceira linha: Estoque detalhado */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Package className="h-3 w-3" />
                            <span>Estoque: {product.stock || 0}</span>
                          </div>
                          {(product.stock_consigned || 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border-amber-200">
                                <Package2 className="h-3 w-3 mr-1" />
                                {product.stock_consigned} em folha
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Mín: {product.stock_min !== undefined ? product.stock_min : (product.min_stock || 5)}</span>
                          </div>
                        </div>
                        
                        {/* Quarta linha: Descrição (se houver) */}
                        {product.description && (
                          <div className="flex items-start gap-1 text-xs sm:text-sm text-muted-foreground">
                            <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate max-w-xs sm:max-w-md">{product.description}</span>
                          </div>
                        )}
                      </div>


                      {/* Estoque e ações */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStockBadgeVariant(product)} className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium">
                            {(() => {
                              const getCurrentStock = (product: any) => {
                                // ✅ Usar estoque disponível (físico - consignado)
                                return product.stock || 0;
                              };
                              const getMinStock = (product: any) => {
                                return product.stock_min !== undefined ? product.stock_min : (product.min_stock || 5);
                              };
                              const currentStock = getCurrentStock(product);
                              const minStock = getMinStock(product);
                              
                              if (currentStock === 0) {
                                return <><AlertTriangle className="h-3 w-3" />{getStockBadgeText(product)}</>;
                              }
                              if (currentStock <= minStock) {
                                return <><AlertTriangle className="h-3 w-3" />{getStockBadgeText(product)}</>;
                              }
                              return <><Package className="h-3 w-3" />{getStockBadgeText(product)}</>;
                            })()}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-1 sm:gap-1">
                          <ProductEditDialog 
                            product={product as any} 
                            onSuccess={() => forceRefresh()} 
                          />
                          <ProductLabelPrint product={product} />
                          <ProductDeleteDialog 
                            product={product} 
                            onSuccess={() => forceRefresh()} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controles de Paginação */}
          {filteredProducts.length > PRODUCTS_PER_PAGE && (
            <div className="flex flex-col gap-2 sm:gap-2 md:gap-3 pt-4 pb-4 w-full border-t">
              {/* Primeira linha: Todos os botões em ordem sequencial */}
              <div className="flex items-center justify-center gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5 flex-wrap min-w-0 w-full">
                {/* Botão Primeira */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm px-1 xs:px-1.5 sm:px-1.5 md:px-2 lg:px-2.5 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 flex-shrink-0"
                >
                  <span className="hidden lg:inline">Primeira</span>
                  <span className="lg:hidden">1ª</span>
                </Button>
                
                {/* Botão Anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm px-1 xs:px-1.5 sm:px-1.5 md:px-2 lg:px-2.5 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 flex-shrink-0"
                >
                  <ChevronLeft className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 mr-0.5 sm:mr-0.5 md:mr-1" />
                  <span className="hidden md:inline">Anterior</span>
                  <span className="md:hidden">Ant.</span>
                </Button>
                
                {/* Páginas numeradas - sempre 3 */}
                <div className="flex items-center gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5 flex-shrink-0">
                {(() => {
                  let prevPage = currentPage - 1;
                  let nextPage = currentPage + 1;
                  
                  // Se estiver na primeira página, mostrar 1, 2, 3
                  if (currentPage === 1) {
                    prevPage = null;
                    return (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                        >
                          1
                        </Button>
                        {totalPages >= 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage(2);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                          >
                            2
                          </Button>
                        )}
                        {totalPages >= 3 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage(3);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                          >
                            3
                          </Button>
                        )}
                      </>
                    );
                  }
                  
                  // Se estiver na última página, mostrar as últimas 3
                  if (currentPage === totalPages) {
                    nextPage = null;
                    return (
                      <>
                        {totalPages >= 3 && (
                      <Button
                            variant="outline"
                        size="sm"
                        onClick={() => {
                              setCurrentPage(totalPages - 2);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                            className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                      >
                            {totalPages - 2}
                      </Button>
                        )}
                        {totalPages >= 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentPage(totalPages - 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                          >
                            {totalPages - 1}
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    );
                  }
                  
                  // No meio: sempre mostrar página anterior, atual e seguinte
                  return (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentPage(prevPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                      >
                        {prevPage}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                      >
                        {currentPage}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentPage(nextPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-7 xs:w-8 sm:w-8 md:w-9 lg:w-10 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-9 text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm p-0 flex-shrink-0"
                      >
                        {nextPage}
                      </Button>
                    </>
                  );
                })()}
                </div>
                
                {/* Botão Próxima */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm px-1 xs:px-1.5 sm:px-1.5 md:px-1.5 lg:px-2 tablet:px-2.5 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-8 tablet:h-9 flex-shrink-0"
                >
                  <span className="hidden lg:inline">Próxima</span>
                  <span className="lg:hidden">Próx.</span>
                  <ChevronRight className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-3.5 lg:w-3.5 tablet:h-4 tablet:w-4 ml-0.5 sm:ml-0.5 md:ml-0.5 lg:ml-1" />
                </Button>
                
                {/* Botão Última */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPage(totalPages);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="text-[9px] xs:text-[10px] sm:text-[10px] md:text-xs lg:text-sm px-1 xs:px-1.5 sm:px-1.5 md:px-1.5 lg:px-2 tablet:px-2.5 h-7 xs:h-7 sm:h-7 md:h-8 lg:h-8 tablet:h-9 flex-shrink-0"
                >
                  <span className="hidden lg:inline">Última</span>
                  <span className="lg:hidden">Últ.</span>
                </Button>
                
                {/* Botão voltar ao topo */}
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  variant="outline"
                  size="sm"
                  className="h-7 xs:h-7 sm:h-7 md:h-8 lg:h-8 tablet:h-9 w-7 xs:w-7 sm:w-7 md:w-8 lg:w-8 tablet:w-9 p-0 flex-shrink-0 overflow-visible"
                  aria-label="Voltar ao topo"
                >
                  <ArrowUp className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-3.5 lg:w-3.5 tablet:h-4 tablet:w-4" />
                </Button>
              </div>
              
              {/* Segunda linha: Contagem de página */}
              <div className="flex items-center justify-center w-full">
                <div className="text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                  <span className="hidden desktop:inline">{((currentPage - 1) * PRODUCTS_PER_PAGE) + 1} - {Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}</span>
                  <span className="desktop:hidden">{currentPage}/{totalPages}</span>
                </div>
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || Object.values(filters).some(f => f.length > 0) || stockFilter
                  ? "Tente ajustar os filtros de busca"
                  : "Comece adicionando seu primeiro produto"
                }
              </p>
              {!searchTerm && !Object.values(filters).some(f => f.length > 0) && !stockFilter && (
                <ProductAddDialog />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categorias">
          <CategoryManagement />
        </TabsContent>

        <TabsContent value="marcas">
          <BrandManagement />
        </TabsContent>

        <TabsContent value="fornecedores">
          <SupplierManagement />
        </TabsContent>

        <TabsContent value="consignado">
          <ConsignadoStockOverview 
            onFilterByProduct={(productId, productName) => {
              // Filtrar produtos por ID específico
              setSearchTerm(productName)
              // Adicionar filtro por produto específico
              setFilters(prev => ({
                ...prev,
                // Limpar outros filtros e focar no produto específico
                sizes: [],
                brands: [],
                categories: [],
                suppliers: [],
                colors: []
              }))
              // Definir filtro de estoque como consignado
              setStockFilter('consigned')
              
              // Scroll para a aba de produtos
              const produtosTab = document.querySelector('[data-value="produtos"]') as HTMLElement
              if (produtosTab) {
                produtosTab.click()
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default Produtos;