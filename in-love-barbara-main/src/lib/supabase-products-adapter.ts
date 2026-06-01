/**
 * Adaptador Supabase para Produtos, Categorias, Marcas e Fornecedores
 * Busca dados reais do banco Supabase
 */

import { supabaseAdmin } from '@/integrations/supabase/client-with-auth'
import type { Database } from '@/integrations/supabase/types'

// Tipos baseados no schema do Supabase
type Product = Database['public']['Tables']['products']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Brand = Database['public']['Tables']['brands']['Row']
type Supplier = Database['public']['Tables']['suppliers']['Row']
type Consignacao = Database['public']['Tables']['consignacoes']['Row']
type ConsignacaoItem = Database['public']['Tables']['consignacao_items']['Row']
type Client = Database['public']['Tables']['clients']['Row']

// Tipos de resposta padronizados
interface DataResponse<T> {
  data: T | null
  error: Error | null
}

interface DataListResponse<T> {
  data: T[] | null
  error: Error | null
}

// Classe adaptadora para produtos e entidades relacionadas
class SupabaseProductsAdapter {
  constructor() {
    // console.log('🔄 SupabaseProductsAdapter inicializado') // ✅ Logs desabilitados
  }

  // MÉTODO DE TESTE - Buscar categorias sem filtros e sem RLS
  async testGetCategoriesNoRLS(): Promise<DataListResponse<Category>> {
    try {
      console.log('🧪 [TESTE] Buscando categorias SEM filtros e SEM RLS...')
      
      const supabase = supabaseAdmin

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(10)

      if (error) {
        console.error('❌ [TESTE] Erro ao buscar categorias:', error)
        console.error('❌ [TESTE] Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { data: null, error: new Error(error.message) }
      }

      console.log(`🧪 [TESTE] ${data?.length || 0} categorias encontradas (sem filtros)`)
      console.log('🧪 [TESTE] Dados brutos:', data)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [TESTE] Erro inesperado ao buscar categorias:', error)
      return { data: null, error: error as Error }
    }
  }

  // ============================================================================
  // CATEGORIAS
  // ============================================================================
  
  async getCategories(): Promise<DataListResponse<Category>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando categorias...')
      
      const supabase = supabaseAdmin

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar categorias:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} categorias encontradas`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar categorias:', error)
      return { data: null, error: error as Error }
    }
  }

  async createCategory(name: string, description?: string): Promise<DataResponse<Category>> {
    try {
      console.log('➕ [SupabaseProductsAdapter] Criando categoria:', name)
      
      const supabase = supabaseAdmin

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          description: description || null,
          active: true
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao criar categoria:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Categoria criada:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao criar categoria:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateCategory(id: string, updates: { name?: string; description?: string; active?: boolean }): Promise<DataResponse<Category>> {
    try {
      console.log('✏️ [SupabaseProductsAdapter] Atualizando categoria:', id)
      
      const supabase = supabaseAdmin

      const { data, error } = await supabase
        .from('categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar categoria:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Categoria atualizada:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar categoria:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteCategory(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('🗑️ [SupabaseProductsAdapter] Deletando categoria:', id)
      
      const supabase = supabaseAdmin

      
      const { error } = await supabase
        .from('categories')
        .update({ active: false })
        .eq('id', id)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao deletar categoria:', error)
        return { error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Categoria deletada:', id)
      return { error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao deletar categoria:', error)
      return { error: error as Error }
    }
  }

  // ============================================================================
  // MARCAS
  // ============================================================================
  
  async getBrands(): Promise<DataListResponse<Brand>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando marcas...')
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name')

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar marcas:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} marcas encontradas`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar marcas:', error)
      return { data: null, error: error as Error }
    }
  }

  async createBrand(name: string): Promise<DataResponse<Brand>> {
    try {
      console.log('➕ [SupabaseProductsAdapter] Criando marca:', name)
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('brands')
        .insert({ name })
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao criar marca:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Marca criada:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao criar marca:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateBrand(id: string, name: string): Promise<DataResponse<Brand>> {
    try {
      console.log('✏️ [SupabaseProductsAdapter] Atualizando marca:', id)
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('brands')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar marca:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Marca atualizada:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar marca:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteBrand(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('🗑️ [SupabaseProductsAdapter] Deletando marca:', id)
      
      const supabase = supabaseAdmin

      
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao deletar marca:', error)
        return { error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Marca deletada:', id)
      return { error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao deletar marca:', error)
      return { error: error as Error }
    }
  }

  // ============================================================================
  // FORNECEDORES
  // ============================================================================
  
  async getSuppliers(): Promise<DataListResponse<Supplier>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando fornecedores...')
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar fornecedores:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} fornecedores encontrados`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar fornecedores:', error)
      return { data: null, error: error as Error }
    }
  }

  async createSupplier(supplierData: { name: string; whatsapp?: string; email?: string }): Promise<DataResponse<Supplier>> {
    try {
      console.log('➕ [SupabaseProductsAdapter] Criando fornecedor:', supplierData.name)
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          whatsapp: supplierData.whatsapp || null,
          email: supplierData.email || null
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao criar fornecedor:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Fornecedor criado:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao criar fornecedor:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateSupplier(id: string, supplierData: { name: string; whatsapp?: string; email?: string }): Promise<DataResponse<Supplier>> {
    try {
      console.log('✏️ [SupabaseProductsAdapter] Atualizando fornecedor:', id)
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          name: supplierData.name,
          whatsapp: supplierData.whatsapp || null,
          email: supplierData.email || null
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar fornecedor:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Fornecedor atualizado:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar fornecedor:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteSupplier(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('🗑️ [SupabaseProductsAdapter] Deletando fornecedor:', id)
      
      const supabase = supabaseAdmin

      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao deletar fornecedor:', error)
        return { error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Fornecedor deletado:', id)
      return { error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao deletar fornecedor:', error)
      return { error: error as Error }
    }
  }

  // ============================================================================
  // PRODUTOS
  // ============================================================================
  
  async getProducts(): Promise<DataListResponse<Product>> {
    try {
      const startTime = Date.now()
      console.log('🚀 [SupabaseProductsAdapter] Iniciando getProducts()...')
      
      const supabase = supabaseAdmin

      // Query otimizada com relacionamentos essenciais
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          short_code,
          price_cents,
          cost_price_cents,
          stock,
          stock_min,
          size,
          color,
          description,
          active,
          category_id,
          brand_id,
          supplier_id,
          categories:category_id (
            id,
            name
          ),
          brands:brand_id (
            id,
            name
          ),
          suppliers:supplier_id (
            id,
            name
          )
        `)
        .eq('active', true)
        .order('name')

      const queryTime = Date.now() - startTime
      console.log(`📊 [SupabaseProductsAdapter] Query de produtos executada em ${queryTime}ms`)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar produtos:', error)
        return { data: null, error: new Error(error.message) }
      }
      
      console.log(`📦 [SupabaseProductsAdapter] ${data?.length || 0} produtos retornados do Supabase`)

      // ✅ OTIMIZAÇÃO CRÍTICA: NÃO calcular estoque consignado no getProducts()
      // Isso é muito lento e não é necessário para a maioria dos casos
      // O estoque consignado será calculado apenas quando necessário (lazy)
      // Mapear produtos com relacionamentos incluídos (sem estoque consignado inicialmente)
      const products: Product[] = (data || []).map((product: any) => {
        const stockFisico = product.stock || 0

        return {
          id: product.id,
          name: product.name,
          short_code: product.short_code,
          price_cents: product.price_cents,
          cost_price_cents: product.cost_price_cents,
          cost_cents: product.cost_price_cents || 0, // Adicionar cost_cents
          stock: stockFisico, // ✅ Estoque físico normal (sem subtrair consignado)
          stock_min: product.stock_min,
          min_stock: product.stock_min || 0, // Adicionar min_stock
          stock_quantity: stockFisico, // Adicionar stock_quantity
          size: product.size,
          color: product.color,
          description: product.description,
          active: product.active,
          category_id: product.category_id,
          brand_id: product.brand_id,
          supplier_id: product.supplier_id,
          // Relacionamentos incluídos
          category: product.categories?.name || 'Sem categoria',
          brand: product.brands?.name || '',
          supplier: product.suppliers?.name || '',
          categories: product.categories,
          brands: product.brands,
          suppliers: product.suppliers,
          // Campos opcionais com valores padrão
          photo_url: null, // Será carregado sob demanda
          qr_code: null,
          stock_consigned: 0, // ✅ OTIMIZAÇÃO: Inicializar com 0 (será calculado lazy quando necessário)
          stock_physical: stockFisico, // ✅ Estoque físico total
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

      const totalTime = Date.now() - startTime
      console.log(`⚡ [SupabaseProductsAdapter] ${products.length} produtos processados em ${totalTime}ms (query: ${queryTime}ms, processamento: ${totalTime - queryTime}ms)`)
      
      return { data: products, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar produtos:', error)
      return { data: null, error: error as Error }
    }
  }

  async getProductsWithRelations(): Promise<DataListResponse<any>> {
    try {
      const startTime = Date.now()
      
      const supabase = supabaseAdmin

      // Query com JOIN nas categorias, marcas e fornecedores
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          short_code,
          price_cents,
          cost_price_cents,
          stock,
          stock_min,
          size,
          color,
          description,
          active,
          category_id,
          brand_id,
          supplier_id,
          categories:category_id (
            id,
            name
          ),
          brands:brand_id (
            id,
            name
          ),
          suppliers:supplier_id (
            id,
            name
          )
        `)
        .eq('active', true)
        .order('name')

      const endTime = Date.now()
      
      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar produtos:', error)
        return { data: null, error: new Error(error.message) }
      }

      // Mapear produtos com relacionamentos incluídos
      const productsWithRelations = (data || []).map(product => ({
        ...product,
        price: product.price_cents ? product.price_cents / 100 : 0,
        cost_price: product.cost_price_cents ? product.cost_price_cents / 100 : 0,
        // Adicionar nomes resolvidos das categorias
        category: product.categories?.name || 'Sem categoria',
        brand: product.brands?.name || 'Sem marca',
        supplier: product.suppliers?.name || 'Sem fornecedor',
        // Manter objetos relacionados para compatibilidade
        categories: product.categories,
        brands: product.brands,
        suppliers: product.suppliers
      }))

      console.log(`⚡ [SupabaseProductsAdapter] ${productsWithRelations.length} produtos com relacionamentos carregados em ${endTime - startTime}ms`)
      
      return { data: productsWithRelations, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar produtos:', error)
      return { data: null, error: error as Error }
    }
  }

  // Método auxiliar para enriquecer produtos com relacionamentos
  private async enrichProductsWithRelations(products: any[]): Promise<any[]> {
    if (!products.length) return products

    try {
      const supabase = supabaseAdmin
      
      // Buscar categorias, marcas e fornecedores em paralelo
      const [categoriesResult, brandsResult, suppliersResult] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('brands').select('id, name'),
        supabase.from('suppliers').select('id, name')
      ])

      // Criar mapas para lookup rápido
      const categoriesMap = new Map(categoriesResult.data?.map(c => [c.id, c]) || [])
      const brandsMap = new Map(brandsResult.data?.map(b => [b.id, b]) || [])
      const suppliersMap = new Map(suppliersResult.data?.map(s => [s.id, s]) || [])

      // Enriquecer produtos com relacionamentos
      return products.map(product => ({
        ...product,
        categories: product.category_id ? categoriesMap.get(product.category_id) : null,
        brands: product.brand_id ? brandsMap.get(product.brand_id) : null,
        suppliers: product.supplier_id ? suppliersMap.get(product.supplier_id) : null,
        // Campos de compatibilidade
        category: product.category_id ? categoriesMap.get(product.category_id)?.name : null,
        brand: product.brand_id ? brandsMap.get(product.brand_id)?.name : null,
        supplier: product.supplier_id ? suppliersMap.get(product.supplier_id)?.name : null,
        price: product.price_cents ? product.price_cents / 100 : 0,
        cost_price: product.cost_price_cents ? product.cost_price_cents / 100 : 0
      }))
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro ao enriquecer produtos:', error)
      // Retornar produtos sem relacionamentos em caso de erro
      return products.map(product => ({
        ...product,
        price: product.price_cents ? product.price_cents / 100 : 0,
        cost_price: product.cost_price_cents ? product.cost_price_cents / 100 : 0
      }))
    }
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at'>): Promise<DataResponse<Product>> {
    try {
      console.log('➕ [SupabaseProductsAdapter] Criando produto:', productData.name)
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          active: true
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao criar produto:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Produto criado:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao criar produto:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<DataResponse<Product>> {
    try {
      console.log('✏️ [SupabaseProductsAdapter] Atualizando produto:', id)
      
      const supabase = supabaseAdmin

      // Mapear campos para os nomes corretos do banco
      const mappedUpdates: any = {}
      
      // Mapear campos que podem ter nomes diferentes
      if ('min_stock' in updates) {
        mappedUpdates.min_stock = updates.min_stock
      }
      if ('stock_min' in updates) {
        mappedUpdates.stock_min = updates.stock_min
      }
      if ('cost_cents' in updates) {
        mappedUpdates.cost_cents = updates.cost_cents
      }
      if ('cost_price_cents' in updates) {
        mappedUpdates.cost_price_cents = updates.cost_price_cents
      }
      if ('stock_quantity' in updates) {
        mappedUpdates.stock_quantity = updates.stock_quantity
      }
      if ('stock' in updates) {
        mappedUpdates.stock = updates.stock
      }
      
      // Adicionar outros campos diretamente
      Object.keys(updates).forEach(key => {
        if (!['min_stock', 'stock_min', 'cost_cents', 'cost_price_cents', 'stock_quantity', 'stock'].includes(key)) {
          mappedUpdates[key] = (updates as any)[key]
        }
      })
      
      const { data, error } = await supabase
        .from('products')
        .update({
          ...mappedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar produto:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Produto atualizado:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar produto:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Busca a imagem de um produto específico (carregamento sob demanda)
   */
  async getProductImage(productId: string): Promise<{ data: string | null, error: Error | null }> {
    try {
      console.log('🖼️ [SupabaseProductsAdapter] Buscando imagem do produto:', productId)
      
      const supabase = supabaseAdmin
      console.log('🔧 [SupabaseProductsAdapter] Cliente Supabase obtido')
      
      const { data, error } = await supabase
        .from('products')
        .select('photo_url')
        .eq('id', productId)
        .single()

      console.log('📊 [SupabaseProductsAdapter] Resultado da query:', { data, error })

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar imagem:', error)
        return { data: null, error: new Error(error.message) }
      }

      const imageUrl = data?.photo_url || null
      console.log('✅ [SupabaseProductsAdapter] Imagem carregada:', imageUrl ? 'Sim' : 'Não')
      console.log('🔗 [SupabaseProductsAdapter] URL da imagem:', imageUrl)
      
      return { data: imageUrl, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar imagem:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteProduct(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('🗑️ [SupabaseProductsAdapter] Deletando produto:', id)
      
      const supabase = supabaseAdmin

      // Verificar se o produto existe antes de deletar
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', id)
        .single()

      if (checkError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao verificar produto:', checkError)
        return { error: new Error(`Produto não encontrado: ${checkError.message}`) }
      }

      if (!existingProduct) {
        console.error('❌ [SupabaseProductsAdapter] Produto não encontrado:', id)
        return { error: new Error('Produto não encontrado') }
      }

      console.log('🔍 [SupabaseProductsAdapter] Produto encontrado:', existingProduct.name)

      // Verificar se o produto está sendo usado em outras tabelas
      const dependencies: string[] = []
      
      // Verificar em sale_items
      const { count: saleItemsCount } = await supabase
        .from('sale_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
      
      if (saleItemsCount && saleItemsCount > 0) {
        dependencies.push(`${saleItemsCount} venda(s)`)
      }

      // Verificar em consignacao_items
      const { count: consignationsCount } = await supabase
        .from('consignacao_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
      
      if (consignationsCount && consignationsCount > 0) {
        dependencies.push(`${consignationsCount} consignação(ões)`)
      }

      // Verificar em produtos_na_folha (se existir)
      // Nota: Esta tabela pode não existir no schema, então vamos pular essa verificação
      // Se necessário, pode ser adicionada manualmente
      let productsOnSheetCount = 0
      
      if (productsOnSheetCount > 0) {
        dependencies.push(`${productsOnSheetCount} folha(s) de consignação`)
      }

      // Se houver dependências, retornar erro especial que indica que pode fazer exclusão em cascata
      if (dependencies.length > 0) {
        const message = `Não é possível excluir o produto "${existingProduct.name}" porque ele está sendo usado em: ${dependencies.join(', ')}. Remova todas as referências antes de excluir.`
        console.error('❌ [SupabaseProductsAdapter] Produto possui dependências:', dependencies)
        const error = new Error(message) as Error & { hasDependencies?: boolean; dependencies?: any }
        error.hasDependencies = true
        error.dependencies = {
          saleItemsCount: saleItemsCount || 0,
          consignationsCount: consignationsCount || 0,
          productsOnSheetCount: productsOnSheetCount || 0
        }
        return { error }
      }

      // Fazer hard delete (remoção completa do banco)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao deletar produto:', error)
        
        // Se for erro 409 (Conflict), significa que há constraint de chave estrangeira
        if (error.code === '23503' || error.message.includes('409') || error.message.includes('foreign key')) {
          return { 
            error: new Error(
              `Não é possível excluir o produto "${existingProduct.name}" porque ele está sendo usado em vendas, consignações ou outras operações. ` +
              `Remova todas as referências ao produto antes de tentar excluí-lo.`
            ) 
          }
        }
        
        return { error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Produto deletado permanentemente:', id)
      return { error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao deletar produto:', error)
      return { error: error as Error }
    }
  }

  async deleteProductCascade(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('🗑️ [SupabaseProductsAdapter] Deletando produto em cascata:', id)
      
      const supabase = supabaseAdmin

      // Verificar se o produto existe antes de deletar
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name, description')
        .eq('id', id)
        .single()

      if (checkError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao verificar produto:', checkError)
        return { error: new Error(`Produto não encontrado: ${checkError.message}`) }
      }

      if (!existingProduct) {
        console.error('❌ [SupabaseProductsAdapter] Produto não encontrado:', id)
        return { error: new Error('Produto não encontrado') }
      }

      console.log('🔍 [SupabaseProductsAdapter] Produto encontrado:', existingProduct.name)
      const productName = existingProduct.name

      // Tentar salvar o produto excluído na tabela deleted_products se existir
      // Nota: Esta tabela é opcional - se não existir, o sistema funciona normalmente com soft delete
      // Ignoramos silenciosamente erros 404 para não poluir o console
      try {
        const { error: insertError } = await (supabase as any)
          .from('deleted_products')
          .insert({
            product_id: id,
            product_name: productName,
            deleted_at: new Date().toISOString()
          })
          .select()

        // Ignorar silenciosamente erros 404 (tabela não existe) ou erros de relação
        if (insertError) {
          const isTableNotFound = 
            insertError.code === 'PGRST116' || // Tabela não encontrada
            insertError.message?.includes('relation') || 
            insertError.message?.includes('does not exist') ||
            insertError.message?.includes('404')
          
          if (!isTableNotFound) {
            // Apenas logar erros que não sejam "tabela não encontrada"
            console.warn('⚠️ [SupabaseProductsAdapter] Erro ao salvar produto excluído:', insertError.message)
          }
          // Erros 404 são esperados e ignorados silenciosamente
        }
      } catch (error: any) {
        // Ignorar silenciosamente erros de tabela não encontrada
        const isTableNotFound = 
          error?.code === 'PGRST116' ||
          error?.message?.includes('relation') || 
          error?.message?.includes('does not exist') ||
          error?.message?.includes('404')
        
        if (!isTableNotFound) {
          console.warn('⚠️ [SupabaseProductsAdapter] Erro ao acessar tabela deleted_products:', error?.message)
        }
        // Erros 404 são esperados e ignorados silenciosamente
      }

      // Buscar todos os sale_items que usam este produto
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('id, sale_id')
        .eq('product_id', id)

      const saleItemsCount = saleItems?.length || 0

      // Buscar consignacao_items
      const { data: consignationItems, error: consignationItemsError } = await supabase
        .from('consignacao_items')
        .select('id')
        .eq('product_id', id)

      const consignationItemsCount = consignationItems?.length || 0

      if (saleItemsError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar sale_items:', saleItemsError)
      } else if (saleItemsCount > 0) {
        console.log(`📦 [SupabaseProductsAdapter] Encontrados ${saleItemsCount} itens de venda que usam este produto`)
      }

      if (consignationItemsError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignacao_items:', consignationItemsError)
      } else if (consignationItemsCount > 0) {
        console.log(`📦 [SupabaseProductsAdapter] Encontrados ${consignationItemsCount} itens de consignação`)
      }

      // Como há constraints de foreign key, não podemos deletar o produto diretamente
      // Vamos fazer um "soft delete": marcar como inativo e adicionar um prefixo no nome
      // Isso permite que as vendas continuem funcionando, mas o produto não aparecerá nas listagens
      const deletedName = `[EXCLUÍDO] ${productName}`
      
      // Atualizar o produto para marcá-lo como excluído (soft delete)
      const { error: updateError } = await supabase
        .from('products')
        .update({
          active: false,
          name: deletedName,
          // Adicionar um campo de metadados se existir, ou usar description
          description: `Produto excluído em cascata em ${new Date().toISOString()}. ${existingProduct.description || ''}`
        })
        .eq('id', id)

      if (updateError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao marcar produto como excluído:', updateError)
        
        // Se não conseguir fazer soft delete, tentar deletar diretamente
        // (pode falhar se houver constraints)
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', id)

        if (deleteError) {
          console.error('❌ [SupabaseProductsAdapter] Erro ao deletar produto:', deleteError)
          
          // Se for erro 409 (Conflict), significa que há constraints de foreign key
          if (deleteError.code === '23503' || deleteError.message.includes('409') || deleteError.message.includes('foreign key')) {
            return { 
              error: new Error(
                `Não é possível excluir o produto "${productName}" porque ele está sendo usado em ${saleItemsCount} venda(s) e ${consignationItemsCount} consignação(ões). ` +
                `O produto foi marcado como inativo. Para excluir completamente, é necessário remover todas as referências manualmente ou configurar exclusão em cascata no banco de dados.`
              ) 
            }
          }
          
          return { error: new Error(deleteError.message) }
        }
      } else {
        console.log('✅ [SupabaseProductsAdapter] Produto marcado como excluído (soft delete):', id)
        console.log(`ℹ️ [SupabaseProductsAdapter] ${saleItemsCount} itens de venda e ${consignationItemsCount} itens de consignação ainda referenciam este produto`)
      }

      console.log('✅ [SupabaseProductsAdapter] Produto processado em cascata:', id)
      
      return { error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao deletar produto em cascata:', error)
      return { error: error as Error }
    }
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Calcula o estoque consignado para todos os produtos
   * Retorna um mapa com product_id -> quantidade consignada
   */
  async getConsignadoStockByProduct(): Promise<Map<string, number>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Calculando estoque consignado por produto...')
      
      const supabase = supabaseAdmin
      const consignadoStock = new Map<string, number>()

      // Buscar consignações ativas (RASCUNHO + ENTREGUE)
      const { data: consignacoesAtivas, error: consignacoesError } = await supabase
        .from('consignacoes')
        .select('id')
        .in('status', ['RASCUNHO', 'ENTREGUE'])

      if (consignacoesError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignações ativas:', consignacoesError)
        return consignadoStock
      }

      if (!consignacoesAtivas || consignacoesAtivas.length === 0) {
        console.log('📋 [SupabaseProductsAdapter] Nenhuma consignação ativa encontrada')
        return consignadoStock
      }

      const consignacaoIds = consignacoesAtivas.map(c => c.id)
      console.log(`📋 [SupabaseProductsAdapter] ${consignacaoIds.length} consignações ativas encontradas`)

      // Buscar todos os itens das consignações ativas
      const { data: itemsConsignados, error: itemsError } = await supabase
        .from('consignacao_items')
        .select('product_id, qty, qtd_devolvida')
        .in('consignacao_id', consignacaoIds)

      if (itemsError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens consignados:', itemsError)
        return consignadoStock
      }

      // ✅ CORREÇÃO: Agrupar por produto e somar quantidades realmente em folha
      if (itemsConsignados) {
        for (const item of itemsConsignados) {
          const productId = item.product_id
          // ✅ CORREÇÃO: Usar qty - qtd_devolvida para quantidade realmente em folha
          const qtyEmFolha = Math.max(0, (item.qty || 0) - (item.qtd_devolvida || 0))
          
          const currentQty = consignadoStock.get(productId) || 0
          consignadoStock.set(productId, currentQty + qtyEmFolha)
        }
      }

      console.log(`✅ [SupabaseProductsAdapter] Estoque consignado calculado para ${consignadoStock.size} produtos`)
      
      // Log detalhado para debug
      if (consignadoStock.size > 0) {
        console.log('📊 [SupabaseProductsAdapter] Produtos com consignação:')
        for (const [productId, qty] of consignadoStock.entries()) {
          console.log(`   - ${productId}: ${qty} unidades consignadas`)
        }
      }

      return consignadoStock
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao calcular estoque consignado:', error)
      return new Map<string, number>()
    }
  }

  /**
   * Gera um código único para consignação
   * Busca o maior número existente e adiciona 1, com retry em caso de conflito
   */
  private async generateUniqueCodigo(supabase: any, maxRetries: number = 10): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [SupabaseProductsAdapter] Tentativa ${attempt} de gerar código único...`)
        
        // Buscar o maior número de código existente
        const { data: existingCodes, error: queryError } = await supabase
          .from('consignacoes')
          .select('codigo')
          .like('codigo', 'C%')
          .order('codigo', { ascending: false })
          .limit(100) // Limitar para performance
        
        if (queryError) {
          console.error('❌ [SupabaseProductsAdapter] Erro ao buscar códigos existentes:', queryError)
          throw queryError
        }
        
        // Encontrar o maior número
        let maxNumber = 0
        if (existingCodes && existingCodes.length > 0) {
          for (const item of existingCodes) {
            const match = item.codigo?.match(/^C(\d+)$/)
            if (match) {
              const number = parseInt(match[1], 10)
              if (number > maxNumber) {
                maxNumber = number
              }
            }
          }
        }
        
        // Gerar próximo número
        const nextNumber = maxNumber + 1
        const codigo = `C${nextNumber.toString().padStart(6, '0')}`
        
        console.log(`🔍 [SupabaseProductsAdapter] Maior código encontrado: C${maxNumber.toString().padStart(6, '0')}`)
        console.log(`🆕 [SupabaseProductsAdapter] Próximo código: ${codigo}`)
        
        // Verificar se o código já existe (double-check)
        const { data: existingCodigo, error: checkError } = await supabase
          .from('consignacoes')
          .select('id')
          .eq('codigo', codigo)
          .single()
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = "not found"
          console.error('❌ [SupabaseProductsAdapter] Erro ao verificar código:', checkError)
          throw checkError
        }
        
        if (!existingCodigo) {
          console.log(`✅ [SupabaseProductsAdapter] Código ${codigo} está disponível!`)
          return codigo
        } else {
          console.log(`⚠️ [SupabaseProductsAdapter] Código ${codigo} já existe, tentando novamente...`)
          // Aguardar um pouco antes da próxima tentativa
          await new Promise(resolve => setTimeout(resolve, 100 * attempt))
        }
        
      } catch (error) {
        console.error(`❌ [SupabaseProductsAdapter] Erro na tentativa ${attempt}:`, error)
        if (attempt === maxRetries) {
          throw error
        }
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 200 * attempt))
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw new Error(`Não foi possível gerar código único após ${maxRetries} tentativas`)
  }

  // ============================================================================
  // CONSIGNAÇÕES E CONSIGNADO
  // ============================================================================
  
  async getConsignacoes(): Promise<DataListResponse<Consignacao>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando consignações...')
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('consignacoes')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            whatsapp,
            types
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignações:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} consignações encontradas`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar consignações:', error)
      return { data: null, error: error as Error }
    }
  }

  async createConsignacao(consignacaoData: Omit<Consignacao, 'id' | 'created_at' | 'updated_at'>): Promise<DataResponse<Consignacao>> {
    try {
      console.log('🆕 [SupabaseProductsAdapter] Criando consignação...')
      
      const supabase = supabaseAdmin

      // Gerar código sequencial único se não foi fornecido
      let codigo = consignacaoData.codigo
      if (!codigo) {
        codigo = await this.generateUniqueCodigo(supabase)
        console.log(`🔢 [SupabaseProductsAdapter] Código único gerado: ${codigo}`)
      }

      const { data, error } = await supabase
        .from('consignacoes')
        .insert({
          ...consignacaoData,
          codigo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          clients:client_id (
            id,
            name,
            whatsapp,
            types
          )
        `)
        .single()

      if (error) {
        // Se o erro for de código duplicado, tentar gerar um novo código
        if (error.code === '23505' && error.message.includes('consignacoes_codigo_key')) {
          console.log('⚠️ [SupabaseProductsAdapter] Código duplicado detectado, gerando novo código...')
          
          // Gerar novo código único
          const novoCodigo = await this.generateUniqueCodigo(supabase)
          console.log(`🔄 [SupabaseProductsAdapter] Novo código gerado: ${novoCodigo}`)
          
          // Tentar inserir novamente com o novo código
          const { data: retryData, error: retryError } = await supabase
            .from('consignacoes')
            .insert({
              ...consignacaoData,
              codigo: novoCodigo,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select(`
              *,
              clients:client_id (
                id,
                name,
                whatsapp,
                types
              )
            `)
            .single()

          if (retryError) {
            console.error('❌ [SupabaseProductsAdapter] Erro ao criar consignação após retry:', retryError)
            return { data: null, error: new Error(retryError.message) }
          }

          console.log('✅ [SupabaseProductsAdapter] Consignação criada com código único:', retryData.id)
          return { data: retryData, error: null }
        }
        
        console.error('❌ [SupabaseProductsAdapter] Erro ao criar consignação:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Consignação criada:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao criar consignação:', error)
      return { data: null, error: error as Error }
    }
  }

  async getConsignacaoItems(consignacaoId: string): Promise<DataListResponse<ConsignacaoItem>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando itens da consignação:', consignacaoId)
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('consignacao_items')
        .select(`
          id,
          consignacao_id,
          product_id,
          qty,
          unit_price_cents,
          desconto_percentual,
          status,
          commission_percent,
          qtd_enviada,
          qtd_vendida,
          qtd_devolvida,
          qtd_perda,
          preco_base_cents,
          created_at,
          updated_at,
          products:product_id (
            id,
            name,
            short_code,
            price_cents,
            stock,
            stock_consigned
          )
        `)
        .eq('consignacao_id', consignacaoId)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} itens encontrados`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar itens da consignação:', error)
      return { data: null, error: error as Error }
    }
  }

  async createConsignacaoItem(itemData: Omit<ConsignacaoItem, 'id' | 'created_at'>): Promise<DataResponse<ConsignacaoItem>> {
    try {
      console.log('🆕 [SupabaseProductsAdapter] Criando/atualizando item de consignação...')
      
      const supabase = supabaseAdmin

      // 🔍 VERIFICAR se já existe um item com o mesmo product_id nesta consignação
      const { data: existingItem, error: checkError } = await supabase
        .from('consignacao_items')
        .select('*')
        .eq('consignacao_id', itemData.consignacao_id)
        .eq('product_id', itemData.product_id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = "not found"
        console.error('❌ [SupabaseProductsAdapter] Erro ao verificar item existente:', checkError)
        return { data: null, error: new Error(checkError.message) }
      }

      if (existingItem) {
        // ✅ ITEM EXISTE - Somar quantidade ao item existente
        console.log(`🔄 [SupabaseProductsAdapter] Item existente encontrado. Somando ${itemData.qty} à quantidade atual ${existingItem.qty}`)
        
        const newQuantity = existingItem.qty + itemData.qty
        
        const { data, error } = await supabase
          .from('consignacao_items')
          .update({
            qty: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)
          .select(`
            *,
            products:product_id (
              id,
              name,
              short_code,
              price_cents,
              stock
            )
          `)
          .single()

        if (error) {
          console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar item existente:', error)
          return { data: null, error: new Error(error.message) }
        }

        console.log(`✅ [SupabaseProductsAdapter] Item atualizado: ${existingItem.qty} + ${itemData.qty} = ${newQuantity}`)
        return { data, error: null }
      } else {
        // 🆕 ITEM NÃO EXISTE - Criar novo item
        console.log(`🆕 [SupabaseProductsAdapter] Item não existe. Criando novo item com quantidade ${itemData.qty}`)
        
        const { data, error } = await supabase
          .from('consignacao_items')
          .insert({
            ...itemData,
            created_at: new Date().toISOString()
          })
          .select(`
            *,
            products:product_id (
              id,
              name,
              short_code,
              price_cents,
              stock
            )
          `)
          .single()

        if (error) {
          console.error('❌ [SupabaseProductsAdapter] Erro ao criar novo item:', error)
          return { data: null, error: new Error(error.message) }
        }

        console.log('✅ [SupabaseProductsAdapter] Novo item criado:', data.id)
        return { data, error: null }
      }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao criar/atualizar item:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateConsignacao(id: string, updates: Partial<Consignacao>): Promise<DataResponse<Consignacao>> {
    try {
      console.log('✏️ [SupabaseProductsAdapter] Atualizando consignação:', id)
      
      const supabase = supabaseAdmin
      
      // Buscar status atual da consignação
      const { data: currentConsignacao, error: currentError } = await supabase
        .from('consignacoes')
        .select('status')
        .eq('id', id)
        .single()

      if (currentError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignação atual:', currentError)
        return { data: null, error: new Error(currentError.message) }
      }

      const currentStatus = currentConsignacao.status
      const newStatus = updates.status
      
      console.log(`🔄 [SupabaseProductsAdapter] Mudança de status: ${currentStatus} → ${newStatus}`)
      
      // Atualizar consignação
      const { data, error } = await supabase
        .from('consignacoes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          clients:client_id (
            id,
            name,
            whatsapp,
            types
          )
        `)
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar consignação:', error)
        return { data: null, error: new Error(error.message) }
      }

      // ✅ NOVA LÓGICA: Inicializar qtd_enviada quando status muda para ENTREGUE
      if (newStatus === 'ENTREGUE' && currentStatus !== 'ENTREGUE') {
        console.log('📦 [SupabaseProductsAdapter] Status mudou para ENTREGUE - inicializando qtd_enviada')
        
        // Buscar todos os itens da consignação
        const { data: items, error: itemsError } = await supabase
          .from('consignacao_items')
          .select('id, qty')
          .eq('consignacao_id', id)

        if (itemsError) {
          console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação:', itemsError)
          // Não falhar a operação, apenas logar o erro
        } else if (items && items.length > 0) {
          // Atualizar qtd_enviada para todos os itens
          for (const item of items) {
            const { error: updateItemError } = await supabase
              .from('consignacao_items')
              .update({ 
                qtd_enviada: item.qty,
                qtd_vendida: item.qty, // Inicialmente toda quantidade enviada é considerada vendida
                qtd_devolvida: 0, // Inicialmente nenhuma devolução
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)

            if (updateItemError) {
              console.error(`❌ [SupabaseProductsAdapter] Erro ao atualizar item ${item.id}:`, updateItemError)
            } else {
              console.log(`✅ [SupabaseProductsAdapter] Item ${item.id}: qtd_enviada = ${item.qty}`)
            }
          }
        }
      }

      console.log('✅ [SupabaseProductsAdapter] Consignação atualizada:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar consignação:', error)
      return { data: null, error: error as Error }
    }
  }

  // Cache para controlar reduções de estoque já processadas
  private processedConsignations = new Set<string>()

  /**
   * Reduzir estoque físico dos produtos quando são movidos para consignação
   * COM CONTROLE DE DUPLICAÇÃO
   */
  async reducePhysicalStockForConsignment(consignacaoId: string): Promise<DataResponse<boolean>> {
    try {
      // ✅ CONTROLE DE DUPLICAÇÃO: Verificar se já foi processado
      if (this.processedConsignations.has(consignacaoId)) {
        console.log(`⚠️ [SupabaseProductsAdapter] Consignação ${consignacaoId} já foi processada - pulando redução de estoque`)
        return { data: true, error: null }
      }

      console.log('📦 [SupabaseProductsAdapter] Reduzindo estoque físico para consignação:', consignacaoId)
      
      const supabase = supabaseAdmin
      
      // Buscar todos os itens da consignação
      const { data: items, error: itemsError } = await supabase
        .from('consignacao_items')
        .select('product_id, qty')
        .eq('consignacao_id', consignacaoId)

      if (itemsError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação:', itemsError)
        return { data: null, error: new Error(itemsError.message) }
      }

      if (!items || items.length === 0) {
        console.log('📋 [SupabaseProductsAdapter] Nenhum item encontrado na consignação')
        return { data: true, error: null }
      }

      // Agrupar por produto para somar quantidades
      const productQuantities = new Map<string, number>()
      for (const item of items) {
        const currentQty = productQuantities.get(item.product_id) || 0
        productQuantities.set(item.product_id, currentQty + item.qty)
      }

      console.log(`📊 [SupabaseProductsAdapter] Reduzindo estoque para ${productQuantities.size} produtos:`)
      
      // Atualizar estoque físico de cada produto
      for (const [productId, totalQty] of productQuantities.entries()) {
        console.log(`   - Produto ${productId}: reduzindo ${totalQty} unidades`)
        
        // Buscar estoque atual do produto
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .single()

        if (productError) {
          console.error(`❌ [SupabaseProductsAdapter] Erro ao buscar produto ${productId}:`, productError)
          continue
        }

        const currentStock = product.stock || 0
        const newStock = Math.max(0, currentStock - totalQty)

        // Atualizar estoque do produto
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (updateError) {
          console.error(`❌ [SupabaseProductsAdapter] Erro ao atualizar estoque do produto ${productId}:`, updateError)
          continue
        }

        console.log(`   ✅ Produto ${productId}: ${currentStock} → ${newStock} (redução: ${totalQty})`)
      }

      // ✅ MARCAR COMO PROCESSADO para evitar duplicação
      this.processedConsignations.add(consignacaoId)
      console.log(`🔒 [SupabaseProductsAdapter] Consignação ${consignacaoId} marcada como processada`)

      console.log('✅ [SupabaseProductsAdapter] Estoque físico reduzido com sucesso')
      return { data: true, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao reduzir estoque físico:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteConsignacao(id: string): Promise<{ error: Error | null }> {
    try {
      console.log('🗑️ [SupabaseProductsAdapter] Deletando consignação:', id)
      
      const supabase = supabaseAdmin

      // ✅ CORREÇÃO CRÍTICA: Primeiro buscar dados da consignação para retornar produtos ao estoque
      const { data: consignacaoData, error: consignacaoError } = await supabase
        .from('consignacoes')
        .select('id, codigo, status')
        .eq('id', id)
        .single()

      if (consignacaoError || !consignacaoData) {
        console.error('❌ [SupabaseProductsAdapter] Consignação não encontrada:', consignacaoError)
        return { error: new Error('Consignação não encontrada') }
      }

      console.log('🔍 [SupabaseProductsAdapter] Dados da consignação:', {
        id: consignacaoData.id,
        codigo: consignacaoData.codigo,
        status: consignacaoData.status
      })

      // ✅ CORREÇÃO CRÍTICA: Verificar se deve retornar produtos ao estoque
      const deveRetornarEstoque = consignacaoData.status === 'RASCUNHO' || consignacaoData.status === 'ENTREGUE'
      
      if (deveRetornarEstoque) {
        console.log('📦 [SupabaseProductsAdapter] Retornando produtos ao estoque para consignação:', consignacaoData.codigo)
        
        // ✅ CORREÇÃO SIMPLIFICADA: Buscar itens da consignação usando coluna qty
        const { data: itemsData, error: itemsError } = await supabase
          .from('consignacao_items')
          .select(`
            id,
            product_id,
            qty,
            products:product_id (
              id,
              name,
              stock,
              stock_consigned
            )
          `)
          .eq('consignacao_id', id)

        if (itemsError) {
          console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação:', itemsError)
          return { error: new Error(itemsError.message) }
        }

        if (itemsData && itemsData.length > 0) {
          console.log('📦 [SupabaseProductsAdapter] Itens encontrados para retorno ao estoque:', itemsData.length)
          
          // ✅ CORREÇÃO SIMPLIFICADA: Processar cada item usando coluna qty
          for (const item of itemsData) {
            if (!item.products) continue
            
            const product = item.products
            // Usar quantidade do item (qty)
            const qtyEmFolha = item.qty || 0
            
            if (qtyEmFolha > 0) {
              // Somar quantidade na coluna stock
              const novoEstoqueFisico = (product.stock || 0) + qtyEmFolha
              const novoEstoqueConsignado = Math.max(0, (product.stock_consigned || 0) - qtyEmFolha)
              
              console.log('📦 [SupabaseProductsAdapter] Retornando produto ao estoque:', {
                produto: product.name,
                qty_em_folha: qtyEmFolha,
                qty_total: item.qty,
                estoque_fisico_anterior: product.stock,
                estoque_fisico_novo: novoEstoqueFisico,
                estoque_consignado_anterior: product.stock_consigned,
                estoque_consignado_novo: novoEstoqueConsignado
              })
              
              // Atualizar estoque do produto
              const { error: updateError } = await supabase
                .from('products')
                .update({
                  stock: novoEstoqueFisico,
                  stock_consigned: novoEstoqueConsignado
                })
                .eq('id', product.id)
              
              if (updateError) {
                console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar estoque do produto:', updateError)
                return { error: new Error(`Erro ao atualizar estoque do produto ${product.name}: ${updateError.message}`) }
              }
              
              console.log('✅ [SupabaseProductsAdapter] Produto retornado ao estoque:', product.name)
            }
          }
          
          console.log('✅ [SupabaseProductsAdapter] Todos os produtos retornados ao estoque')
        } else {
          console.log('⚠️ [SupabaseProductsAdapter] Nenhum item encontrado na consignação')
        }
      } else {
        console.log('ℹ️ [SupabaseProductsAdapter] Consignação com status', consignacaoData.status, '- não retornando produtos ao estoque')
      }

      // Agora deletar todos os itens da consignação
      console.log('🗑️ [SupabaseProductsAdapter] Deletando itens da consignação...')
      const { error: itemsDeleteError } = await supabase
        .from('consignacao_items')
        .delete()
        .eq('consignacao_id', id)

      if (itemsDeleteError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao deletar itens da consignação:', itemsDeleteError)
        return { error: new Error(itemsDeleteError.message) }
      }

      // Por último deletar a consignação principal
      console.log('🗑️ [SupabaseProductsAdapter] Deletando consignação principal...')
      const { error } = await supabase
        .from('consignacoes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao deletar consignação:', error)
        return { error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Consignação deletada com sucesso:', id)
      return { error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao deletar consignação:', error)
      return { error: error as Error }
    }
  }

  async updateConsignacaoItem(itemId: string, updates: Partial<ConsignacaoItem>): Promise<DataResponse<ConsignacaoItem>> {
    try {
      console.log('🔄 [SupabaseProductsAdapter] Atualizando item de consignação:', { itemId, updates })
      
      const supabase = supabaseAdmin

      const { data, error } = await supabase
        .from('consignacao_items')
        .update(updates)
        .eq('id', itemId)
        .select(`
          *,
          products:product_id (
            id,
            name,
            short_code,
            price_cents,
            stock
          )
        `)
        .single()

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar item de consignação:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Item de consignação atualizado:', data.id)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar item de consignação:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateConsignacaoItemsByProduct(consignacaoId: string, productId: string, updates: Partial<ConsignacaoItem>): Promise<DataResponse<ConsignacaoItem[]>> {
    try {
      console.log('🔄 [SupabaseProductsAdapter] Atualizando itens de consignação por produto:', { consignacaoId, productId, updates })
      
      const supabase = supabaseAdmin

      const { data, error } = await supabase
        .from('consignacao_items')
        .update(updates)
        .eq('consignacao_id', consignacaoId)
        .eq('product_id', productId)
        .select(`
          *,
          products:product_id (
            id,
            name,
            short_code,
            price_cents,
            stock
          )
        `)

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar itens de consignação por produto:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [SupabaseProductsAdapter] Itens de consignação atualizados:', data?.length || 0)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao atualizar itens de consignação por produto:', error)
      return { data: null, error: error as Error }
    }
  }

  async getConsignadoReservas(): Promise<DataListResponse<any>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando reservas de consignado...')
      
      // Buscar consignações ativas (ENTREGUE e RASCUNHO)
      const supabase = supabaseAdmin

      const { data: consignacoes, error: consignacoesError } = await supabase
        .from('consignacoes')
        .select(`
          id,
          codigo,
          status,
          client_id,
          clients:client_id (
            id,
            name,
            whatsapp,
            types
          )
        `)
        .in('status', ['ENTREGUE', 'RASCUNHO'])
        .order('created_at', { ascending: false })

      if (consignacoesError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignações:', consignacoesError)
        return { data: null, error: new Error(consignacoesError.message) }
      }

      // Buscar itens das consignações ativas
      const consignacaoIds = consignacoes?.map(c => c.id) || []
      if (consignacaoIds.length === 0) {
        return { data: [], error: null }
      }

      const { data: items, error: itemsError } = await supabase
        .from('consignacao_items')
        .select(`
          *,
          products:product_id (
            id,
            name,
            short_code,
            price_cents,
            stock
          )
        `)
        .in('consignacao_id', consignacaoIds)

      if (itemsError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens:', itemsError)
        return { data: null, error: new Error(itemsError.message) }
      }

      // Combinar dados
      const reservas = consignacoes?.map(consignacao => ({
        ...consignacao,
        items: items?.filter(item => item.consignacao_id === consignacao.id) || []
      })) || []

      console.log(`✅ [SupabaseProductsAdapter] ${reservas.length} reservas encontradas`)
      return { data: reservas, error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar reservas:', error)
      return { data: null, error: error as Error }
    }
  }

  async getConsignadoPorProduto(): Promise<DataListResponse<any>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando consignado por produto...')
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('vw_consignado_por_produto')
        .select(`
          *,
          products:product_id (
            id,
            name,
            short_code,
            price_cents,
            stock
          )
        `)
        .order('qty_reservada', { ascending: false })

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignado por produto:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} produtos com consignado encontrados`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar consignado por produto:', error)
      return { data: null, error: error as Error }
    }
  }

  async getConsignadoPorCliente(): Promise<DataListResponse<any>> {
    try {
      console.log('🔍 [SupabaseProductsAdapter] Buscando consignado por cliente...')
      
      const supabase = supabaseAdmin

      
      const { data, error } = await supabase
        .from('consignacoes')
        .select(`
          id,
          codigo,
          status,
          client_id,
          created_at,
          clients:client_id (
            id,
            name,
            whatsapp,
            types
          )
        `)
        .in('status', ['ENTREGUE', 'RASCUNHO'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar consignado por cliente:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log(`✅ [SupabaseProductsAdapter] ${data?.length || 0} clientes com consignado encontrados`)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao buscar consignado por cliente:', error)
      return { data: null, error: error as Error }
    }
  }

  /**
   * Atualiza o estoque físico quando produtos são devolvidos
   * @param devolucoes Array de devoluções com product_id e qty_devolvida
   */
  async updateStockForReturns(devolucoes: Array<{ product_id: string; qty_devolvida: number; product_name: string }>): Promise<void> {
    try {
      console.log('📦 [SupabaseProductsAdapter] Atualizando estoque para devoluções:', devolucoes)

      // Processar cada devolução
      for (const devolucao of devolucoes) {
        if (devolucao.qty_devolvida <= 0) {
          console.log(`⚠️ [SupabaseProductsAdapter] Pulando devolução com quantidade zero: ${devolucao.product_name}`)
          continue
        }

        try {
          // Buscar produto atual
          const supabase = supabaseAdmin
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, stock')
            .eq('id', devolucao.product_id)
            .single()

          if (productError) {
            console.error(`❌ [SupabaseProductsAdapter] Erro ao buscar produto ${devolucao.product_id}:`, productError)
            continue
          }

          if (!product) {
            console.error(`❌ [SupabaseProductsAdapter] Produto ${devolucao.product_id} não encontrado`)
            continue
          }

          const currentStock = product.stock || 0
          const newStock = currentStock + devolucao.qty_devolvida

          // Atualizar estoque físico (produtos devolvidos voltam para o estoque)
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', devolucao.product_id)

          if (updateError) {
            console.error(`❌ [SupabaseProductsAdapter] Erro ao atualizar estoque do produto ${devolucao.product_id}:`, updateError)
            continue
          }

          console.log(`📦 [SupabaseProductsAdapter] Produto ${product.name}: ${currentStock} → ${newStock} (devolução: +${devolucao.qty_devolvida})`)

        } catch (error) {
          console.error(`❌ [SupabaseProductsAdapter] Erro ao processar devolução do produto ${devolucao.product_id}:`, error)
        }
      }

      console.log('✅ [SupabaseProductsAdapter] Estoque atualizado para todas as devoluções')

    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar estoque para devoluções:', error)
    }
  }

  /**
   * Atualiza a quantidade na tabela consignacao_items quando produtos são devolvidos
   * @param consignacaoId ID da consignação
   * @param devolucoes Array de devoluções com product_id e qty_devolvida
   */
  async updateConsignacaoItemsForReturns(consignacaoId: string, devolucoes: Array<{ product_id: string; qty_devolvida: number; product_name: string }>): Promise<void> {
    try {
      console.log('📦 [SupabaseProductsAdapter] Atualizando consignacao_items para devoluções:', devolucoes)

      const supabase = supabaseAdmin

      // Processar cada devolução
      for (const devolucao of devolucoes) {
        if (devolucao.qty_devolvida <= 0) {
          console.log(`⚠️ [SupabaseProductsAdapter] Pulando devolução com quantidade zero: ${devolucao.product_name}`)
          continue
        }

        try {
          // Buscar itens da consignação para este produto
          const { data: items, error: itemsError } = await supabase
            .from('consignacao_items')
            .select('id, qty, qtd_devolvida')
            .eq('consignacao_id', consignacaoId)
            .eq('product_id', devolucao.product_id)

          if (itemsError) {
            console.error(`❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação para produto ${devolucao.product_id}:`, itemsError)
            continue
          }

          if (!items || items.length === 0) {
            console.error(`❌ [SupabaseProductsAdapter] Nenhum item encontrado na consignação para produto ${devolucao.product_id}`)
            continue
          }

          // ✅ NOVA LÓGICA SIMPLIFICADA: Apenas atualizar qtd_devolvida
          // Com a nova lógica, a quantidade em folha é calculada como qty - qtd_devolvida
          // Não precisamos mais alterar a coluna qty
          
          const totalQtyAtual = items.reduce((sum, item) => sum + item.qty, 0)
          const totalQtdDevolvidaAtual = items.reduce((sum, item) => sum + (item.qtd_devolvida || 0), 0)
          const novaQtdDevolvidaTotal = totalQtdDevolvidaAtual + devolucao.qty_devolvida

          console.log(`📦 [SupabaseProductsAdapter] Produto ${devolucao.product_name}:`)
          console.log(`   Quantidade total (qty): ${totalQtyAtual}`)
          console.log(`   Quantidade devolvida atual: ${totalQtdDevolvidaAtual}`)
          console.log(`   Nova quantidade devolvida: ${novaQtdDevolvidaTotal}`)
          console.log(`   Quantidade em folha será: ${totalQtyAtual - novaQtdDevolvidaTotal}`)

          // Distribuir a nova quantidade devolvida entre os itens existentes
          const qtdDevolvidaPorItem = Math.floor(devolucao.qty_devolvida / items.length)
          const qtdDevolvidaRestante = devolucao.qty_devolvida % items.length

          console.log(`📊 [SupabaseProductsAdapter] Distribuindo devolução: ${qtdDevolvidaPorItem} por item + ${qtdDevolvidaRestante} restante`)

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const qtdDevolvidaItem = qtdDevolvidaPorItem + (i < qtdDevolvidaRestante ? 1 : 0)
            const novaQtdDevolvidaItem = (item.qtd_devolvida || 0) + qtdDevolvidaItem

            const { error: updateError } = await supabase
              .from('consignacao_items')
              .update({ 
                qtd_devolvida: novaQtdDevolvidaItem,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)

            if (updateError) {
              console.error(`❌ [SupabaseProductsAdapter] Erro ao atualizar item ${item.id}:`, updateError)
            } else {
              console.log(`✅ [SupabaseProductsAdapter] Item ${item.id}:`)
              console.log(`   qty: ${item.qty} (mantida)`)
              console.log(`   qtd_devolvida: ${item.qtd_devolvida || 0} → ${novaQtdDevolvidaItem}`)
              console.log(`   qty_em_folha: ${item.qty - novaQtdDevolvidaItem}`)
            }
          }

        } catch (error) {
          console.error(`❌ [SupabaseProductsAdapter] Erro ao processar devolução do produto ${devolucao.product_id}:`, error)
        }
      }

      console.log('✅ [SupabaseProductsAdapter] Consignacao_items atualizados para todas as devoluções')

    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro ao atualizar consignacao_items para devoluções:', error)
    }
  }

  /**
   * Salva as devoluções na tabela consignacao_items
   * @param consignacaoId ID da consignação
   * @param devolucoes Array de devoluções com product_id e qty_devolvida
   */
  async saveReturnsToConsignacaoItems(consignacaoId: string, devolucoes: Array<{ product_id: string; qty_devolvida: number; product_name: string }>): Promise<void> {
    try {
      console.log('💾 [SupabaseProductsAdapter] Salvando devoluções na tabela consignacao_items:', devolucoes)

      const supabase = supabaseAdmin

      // Processar cada devolução
      for (const devolucao of devolucoes) {
        if (devolucao.qty_devolvida <= 0) {
          console.log(`⚠️ [SupabaseProductsAdapter] Pulando devolução com quantidade zero: ${devolucao.product_name}`)
          continue
        }

        try {
          // Buscar itens da consignação para este produto
          const { data: items, error: itemsError } = await supabase
            .from('consignacao_items')
            .select('id, qty, qtd_enviada, qtd_vendida, qtd_devolvida')
            .eq('consignacao_id', consignacaoId)
            .eq('product_id', devolucao.product_id)

          if (itemsError) {
            console.error(`❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação para produto ${devolucao.product_id}:`, itemsError)
            continue
          }

          if (!items || items.length === 0) {
            console.error(`❌ [SupabaseProductsAdapter] Nenhum item encontrado na consignação para produto ${devolucao.product_id}`)
            continue
          }

          // ✅ SIMPLIFICAÇÃO: Remover dependência da qtd_enviada
          // Calcular apenas com base nas quantidades atuais
          const totalQtyAtual = items.reduce((sum, item) => sum + item.qty, 0)
          const totalQtdDevolvida = items.reduce((sum, item) => sum + item.qtd_devolvida, 0)
          const totalQtdVendida = items.reduce((sum, item) => sum + item.qtd_vendida, 0)

          // ✅ NOVA LÓGICA: Usar quantidade devolvida final sem validação de enviada
          const novaQtdDevolvida = devolucao.qty_devolvida
          const diferencaDevolvida = novaQtdDevolvida - totalQtdDevolvida
          const novaQtyAtual = Math.max(0, totalQtyAtual - diferencaDevolvida)
          const novaQtdVendida = totalQtdVendida // Manter vendida como está

          console.log(`💾 [SupabaseProductsAdapter] Produto ${devolucao.product_name}:`)
          console.log(`   Quantidade atual na folha: ${totalQtyAtual}`)
          console.log(`   Quantidade devolvida atual: ${totalQtdDevolvida}`)
          console.log(`   Quantidade vendida atual: ${totalQtdVendida}`)
          console.log(`   Quantidade devolvida FINAL: ${devolucao.qty_devolvida}`)
          console.log(`   Diferença devolvida: ${diferencaDevolvida}`)
          console.log(`   Nova quantidade atual na folha: ${novaQtyAtual}`)
          console.log(`   Nova quantidade devolvida total: ${novaQtdDevolvida}`)
          console.log(`   Quantidade vendida (mantida): ${novaQtdVendida}`)

          // ✅ SIMPLIFICAÇÃO: Redistribuir apenas quantidades que mudam
          const qtyAtualPorItem = Math.floor(novaQtyAtual / items.length)
          const qtyAtualRestante = novaQtyAtual % items.length
          const qtdDevolvidaPorItem = Math.floor(novaQtdDevolvida / items.length)
          const qtdDevolvidaRestante = novaQtdDevolvida % items.length
          // ✅ Quantidade vendida não muda mais

          console.log(`📊 [SupabaseProductsAdapter] Redistribuindo quantidades:`)
          console.log(`   Atual na folha: ${qtyAtualPorItem} por item + ${qtyAtualRestante} restante`)
          console.log(`   Devolvida: ${qtdDevolvidaPorItem} por item + ${qtdDevolvidaRestante} restante`)
          console.log(`   Vendida: mantida como está`)

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const novaQtyAtualItem = qtyAtualPorItem + (i < qtyAtualRestante ? 1 : 0)
            const novaQtdDevolvidaItem = qtdDevolvidaPorItem + (i < qtdDevolvidaRestante ? 1 : 0)
            // ✅ Quantidade vendida não é alterada

            const { error: updateError } = await supabase
              .from('consignacao_items')
              .update({ 
                qtd_devolvida: novaQtdDevolvidaItem,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)

            if (updateError) {
              console.error(`❌ [SupabaseProductsAdapter] Erro ao atualizar item ${item.id}:`, updateError)
            } else {
              console.log(`✅ [SupabaseProductsAdapter] Item ${item.id}:`)
              console.log(`   qty: ${item.qty} (mantida)`)
              console.log(`   qtd_vendida: ${item.qtd_vendida} (mantida)`)
              console.log(`   qtd_devolvida: ${item.qtd_devolvida} → ${novaQtdDevolvidaItem}`)
              console.log(`   qty_em_folha: ${item.qty - novaQtdDevolvidaItem}`)
            }
          }

        } catch (error) {
          console.error(`❌ [SupabaseProductsAdapter] Erro ao processar devolução do produto ${devolucao.product_id}:`, error)
        }
      }

      console.log('✅ [SupabaseProductsAdapter] Devoluções salvas na tabela consignacao_items')

    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro ao salvar devoluções na tabela consignacao_items:', error)
    }
  }

  /**
   * Carrega os produtos salvos de uma consignação com suas quantidades vendidas e devolvidas
   * @param consignacaoId ID da consignação
   */
  async getConsignacaoItemsWithReturns(consignacaoId: string): Promise<DataListResponse<any>> {
    try {
      console.log('📦 [SupabaseProductsAdapter] Carregando itens da consignação com devoluções:', consignacaoId)

      // Verificar se a consignação existe primeiro
      const supabase = supabaseAdmin
      
      const { data: consignacaoExists, error: consignacaoError } = await supabase
        .from('consignacoes')
        .select('id, codigo, status')
        .eq('id', consignacaoId)
        .single()

      if (consignacaoError || !consignacaoExists) {
        console.error('❌ [SupabaseProductsAdapter] Consignação não encontrada:', consignacaoId)
        console.error('❌ [SupabaseProductsAdapter] Erro:', consignacaoError)
        return { data: [], error: new Error(`Consignação ${consignacaoId} não encontrada`) }
      }

      console.log('✅ [SupabaseProductsAdapter] Consignação encontrada:', consignacaoExists.codigo)

      // ✅ CORREÇÃO: Buscar dados com JOIN explícito para garantir estoque real e preços atualizados
      const { data: items, error: itemsError } = await supabase
        .from('consignacao_items')
        .select(`
          id,
          product_id,
          qty,
          qtd_enviada,
          qtd_vendida,
          qtd_devolvida,
          unit_price_cents,
          commission_percent,
          products!inner (
            id,
            name,
            short_code,
            price_cents,
            stock,
            stock_consigned
          )
        `)
        .eq('consignacao_id', consignacaoId)

      if (itemsError) {
        console.error('❌ [SupabaseProductsAdapter] Erro ao buscar itens da consignação:', itemsError)
        console.error('❌ [SupabaseProductsAdapter] Detalhes do erro:', JSON.stringify(itemsError, null, 2))
        console.error('❌ [SupabaseProductsAdapter] Consignação ID:', consignacaoId)
        return { data: null, error: new Error(itemsError.message) }
      }

      if (!items || items.length === 0) {
        console.log('⚠️ [SupabaseProductsAdapter] Nenhum item encontrado na consignação')
        return { data: [], error: null }
      }

      // ✅ CORREÇÃO: Log detalhado dos dados recebidos
      console.log('🔍 [SupabaseProductsAdapter] Dados brutos recebidos:', items)
      items.forEach((item, index) => {
        console.log(`🔍 [SupabaseProductsAdapter] Item ${index + 1}:`, {
          id: item.id,
          product_id: item.product_id,
          qty: item.qty,
          products: item.products,
          stock_from_products: item.products?.stock,
          stock_consigned_from_products: item.products?.stock_consigned
        })
      })

      // Agrupar itens por produto_id para consolidar quantidades
      const produtosConsolidados = new Map<string, any>()

      for (const item of items) {
        const productId = item.product_id
        
        if (produtosConsolidados.has(productId)) {
          const produtoExistente = produtosConsolidados.get(productId)
          produtoExistente.qty += item.qty
          produtoExistente.qtd_enviada += item.qtd_enviada
          produtoExistente.qtd_vendida += item.qtd_vendida
          produtoExistente.qtd_devolvida += item.qtd_devolvida
          
          // ✅ CORREÇÃO CRÍTICA: Atualizar preço para o mais recente e recalcular valores
          const precoAtualizado = item.products?.price_cents || item.unit_price_cents || produtoExistente.unit_price_cents || 0
          produtoExistente.unit_price_cents = precoAtualizado
          produtoExistente.subtotal_cents = produtoExistente.qtd_vendida * precoAtualizado
          produtoExistente.commission_value_cents = Math.round(produtoExistente.subtotal_cents * ((produtoExistente.commission_percent || 0) / 100))
        } else {
          // ✅ CORREÇÃO CRÍTICA: Usar preço atualizado do produto, não o preço antigo da consignação
          const precoAtualizado = item.products?.price_cents || item.unit_price_cents || 0
          
          produtosConsolidados.set(productId, {
            id: item.id,
            product_id: item.product_id,
            product_code: item.products?.short_code || item.product_id,
            product_name: item.products?.name || 'Produto não encontrado',
            qty: item.qty, // Quantidade atual na folha
            qty_em_folha: Math.max(0, (item.qty || 0) - (item.qtd_devolvida || 0)), // ✅ CORREÇÃO: Quantidade realmente em folha (qty - devolvida)
            qtd_enviada: item.qtd_enviada, // Quantidade original enviada
            qtd_vendida: item.qtd_vendida, // Quantidade vendida
            qtd_devolvida: item.qtd_devolvida, // Quantidade devolvida
            unit_price_cents: precoAtualizado, // ✅ CORREÇÃO: Usar preço atualizado
            commission_percent: item.commission_percent,
            // ✅ CORREÇÃO: Usar qtd_vendida para cálculos monetários com preço atualizado
            subtotal_cents: item.qtd_vendida * precoAtualizado,
            commission_value_cents: Math.round((item.qtd_vendida * precoAtualizado) * ((item.commission_percent || 0) / 100)),
            products: item.products // ✅ CORREÇÃO: Incluir dados do produto
          })
          
          console.log(`💰 [SupabaseProductsAdapter] Preço atualizado para ${item.products?.name}:`, {
            preco_antigo: item.unit_price_cents,
            preco_atualizado: precoAtualizado,
            produto: item.products?.name
          })
        }
      }

      const produtosArray = Array.from(produtosConsolidados.values())

      console.log(`✅ [SupabaseProductsAdapter] ${produtosArray.length} produtos consolidados carregados`)
      
      // ✅ NOVA FUNCIONALIDADE: Log detalhado dos dados consolidados
      for (const produto of produtosArray) {
        console.log('🔍 [SupabaseProductsAdapter] Produto consolidado:', {
          product_name: produto.product_name,
          qty: produto.qty,
          qtd_enviada: produto.qtd_enviada,
          qtd_vendida: produto.qtd_vendida,
          qtd_devolvida: produto.qtd_devolvida
        })
        console.log('🔍 [SupabaseProductsAdapter] Valores específicos:', JSON.stringify({
          'qty (atual)': produto.qty,
          'qtd_enviada (original)': produto.qtd_enviada,
          'qtd_vendida': produto.qtd_vendida,
          'qtd_devolvida': produto.qtd_devolvida
        }, null, 2))
      }
      
      return { data: produtosArray, error: null }

    } catch (error) {
      console.error('❌ [SupabaseProductsAdapter] Erro inesperado ao carregar itens da consignação:', error)
      return { data: null, error: error as Error }
    }
  }
}

// Instância singleton do adaptador
export const supabaseProductsAdapter = new SupabaseProductsAdapter()

// Exportar para uso global
export default supabaseProductsAdapter
