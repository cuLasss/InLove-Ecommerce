import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Filter, Tag, Building2, Package, Package2, Palette, Truck, Ruler, Droplet } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ProductFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  products: any[]
  onFiltersChange: (filters: ProductFilters) => void
  stockFilter?: 'low_stock' | 'no_stock' | 'in_stock' | 'consigned' | null
}

export interface ProductFilters {
  sizes: string[]
  brands: string[]
  categories: string[]
  suppliers: string[]
  colors: string[]
}

export function ProductFilters({ 
  searchTerm, 
  onSearchChange, 
  products, 
  onFiltersChange,
  stockFilter 
}: ProductFiltersProps) {
  const [filters, setFilters] = useState<ProductFilters>({
    sizes: [],
    brands: [],
    categories: [],
    suppliers: [],
    colors: []
  })

  // Extrair valores únicos para os filtros
  const filterOptions = useMemo(() => {
    const safeProducts = products || [];
    const sizes = [...new Set(safeProducts.map(p => p.size).filter(Boolean))].sort()
    const brands = [...new Set(safeProducts.map(p => p.brands?.name).filter(Boolean))].sort()
    const categories = [...new Set(safeProducts.map(p => p.categories?.name || 'Sem categoria'))].sort()
    const suppliers = [...new Set(safeProducts.map(p => p.suppliers?.name).filter(Boolean))].sort()
    const colors = [...new Set(safeProducts.map(p => p.color).filter(Boolean))].sort()

    return { sizes, brands, categories, suppliers, colors }
  }, [products])

  const handleFilterChange = (type: keyof ProductFilters, value: string) => {
    const newFilters = {
      ...filters,
      [type]: filters[type].includes(value) 
        ? filters[type].filter(item => item !== value)
        : [...filters[type], value]
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const removeFilter = (type: keyof ProductFilters, value: string) => {
    const newFilters = {
      ...filters,
      [type]: filters[type].filter(item => item !== value)
    }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    const emptyFilters = {
      sizes: [],
      brands: [],
      categories: [],
      suppliers: [],
      colors: []
    }
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0)
  const totalActiveFilters = Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)

  return (
    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 text-sm sm:text-base h-10 sm:h-11"
          style={{ paddingLeft: '2.75rem' }}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
              <Filter className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <span className="sm:hidden">Filt.</span>
              {totalActiveFilters > 0 && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 px-1 py-0 text-xs">
                  {totalActiveFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-80 sm:max-w-80 p-3 sm:p-4 max-h-[85vh] overflow-y-auto z-[100]"
            align="start"
            side="bottom"
            sideOffset={8}
            collisionPadding={20}
          >
            <div className="space-y-3 sm:space-y-4">
              {/* Marcas */}
              <div>
                <label className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Marcas</span>
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {filterOptions.brands.length > 0 ? (
                    filterOptions.brands.map(brand => (
                    <Badge
                      key={brand}
                      variant={filters.brands.includes(brand) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors text-xs sm:text-sm px-2 py-1"
                      onClick={() => handleFilterChange('brands', brand)}
                    >
                      {brand}
                    </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhuma marca disponível</span>
                  )}
                </div>
              </div>

              {/* Fornecedores */}
              {filterOptions.suppliers.length > 0 && (
                <div>
                  <label className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Fornecedores</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {filterOptions.suppliers.map(supplier => (
                      <Badge
                        key={supplier}
                        variant={filters.suppliers.includes(supplier) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors text-xs sm:text-sm px-2 py-1"
                        onClick={() => handleFilterChange('suppliers', supplier)}
                      >
                        {supplier}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorias */}
              <div>
                <label className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Categorias</span>
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {filterOptions.categories.length > 0 ? (
                    filterOptions.categories.map(category => (
                    <Badge
                      key={category}
                      variant={filters.categories.includes(category) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors text-xs sm:text-sm px-2 py-1"
                      onClick={() => handleFilterChange('categories', category)}
                    >
                      {category}
                    </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhuma categoria disponível</span>
                  )}
                </div>
              </div>

              {/* Tamanhos */}
              <div>
                <label className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
                  <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Tamanhos</span>
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {filterOptions.sizes.length > 0 ? (
                    filterOptions.sizes.map(size => (
                    <Badge
                      key={size}
                      variant={filters.sizes.includes(size) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors text-xs sm:text-sm px-2 py-1"
                      onClick={() => handleFilterChange('sizes', size)}
                    >
                      {size}
                    </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhum tamanho disponível</span>
                  )}
                </div>
              </div>

              {/* Cores */}
              {filterOptions.colors.length > 0 && (
                <div>
                  <label className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-2">
                    <Droplet className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Cores</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {filterOptions.colors.map(color => (
                      <Badge
                        key={color}
                        variant={filters.colors.includes(color) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors text-xs sm:text-sm px-2 py-1"
                        onClick={() => handleFilterChange('colors', color)}
                      >
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs sm:text-sm h-8 sm:h-9">
            <X className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Limpar filtros</span>
            <span className="sm:hidden">Limpar</span>
          </Button>
        )}
      </div>

      {/* Filtros ativos */}
      {hasActiveFilters && (
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-medium text-muted-foreground">Filtros ativos:</div>
          <div className="flex flex-wrap gap-1">
          {filters.brands.map(brand => (
            <Badge key={`brand-${brand}`} variant="secondary" className="gap-1 text-xs">
              <Tag className="h-3 w-3" />
              <span className="truncate max-w-20 sm:max-w-none">{brand}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:bg-destructive/20 rounded-full flex-shrink-0" 
                onClick={() => removeFilter('brands', brand)}
              />
            </Badge>
          ))}
          {filters.suppliers.map(supplier => (
            <Badge key={`supplier-${supplier}`} variant="secondary" className="gap-1 text-xs">
              <Truck className="h-3 w-3" />
              <span className="truncate max-w-20 sm:max-w-none">{supplier}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:bg-destructive/20 rounded-full flex-shrink-0" 
                onClick={() => removeFilter('suppliers', supplier)}
              />
            </Badge>
          ))}
          {filters.categories.map(category => (
            <Badge key={`category-${category}`} variant="secondary" className="gap-1 text-xs">
              <Package className="h-3 w-3" />
              <span className="truncate max-w-20 sm:max-w-none">{category}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:bg-destructive/20 rounded-full flex-shrink-0" 
                onClick={() => removeFilter('categories', category)}
              />
            </Badge>
          ))}
          {filters.sizes.map(size => (
            <Badge key={`size-${size}`} variant="secondary" className="gap-1 text-xs">
              <Ruler className="h-3 w-3" />
              <span className="truncate max-w-20 sm:max-w-none">{size}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:bg-destructive/20 rounded-full flex-shrink-0" 
                onClick={() => removeFilter('sizes', size)}
              />
            </Badge>
          ))}
          {filters.colors.map(color => (
            <Badge key={`color-${color}`} variant="secondary" className="gap-1 text-xs">
              <Droplet className="h-3 w-3" />
              <span className="truncate max-w-20 sm:max-w-none">{color}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:bg-destructive/20 rounded-full flex-shrink-0" 
                onClick={() => removeFilter('colors', color)}
              />
            </Badge>
          ))}
          </div>
        </div>
      )}

      {stockFilter && (
        <div className="text-sm text-muted-foreground">
          Filtro ativo: {
            stockFilter === 'low_stock' ? 'Baixo estoque' :
            stockFilter === 'no_stock' ? 'Sem estoque' :
            stockFilter === 'in_stock' ? 'Em estoque' : ''
          }
        </div>
      )}
    </div>
  )
}