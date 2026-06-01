/**
 * Sistema de dados 100% LOCAL - Desconectado do Supabase
 * Gerencia todos os dados localmente para desenvolvimento
 * Preparado para reconexão futura com Supabase
 */

// Importar configuração
import { DATABASE_CONFIG } from '../config/database'

// Importar dados locais
import categoriesData from '../data/categories.json'
import productsData from '../data/products.json'
import clientsData from '../data/clients.json'
import usersData from '../data/users.json'
import salesData from '../data/sales.json'
import saleItemsData from '../data/sale_items.json'
import consignacoesData from '../data/consignacoes.json'
import consignacaoItemsData from '../data/consignacao_items.json'
import paymentsData from '../data/payments.json'
import cashierShiftsData from '../data/cashier_shifts.json'
import brandsData from '../data/brands.json'
import suppliersData from '../data/suppliers.json'

// Tipos baseados na estrutura do banco (mantidos para compatibilidade futura)
export interface Category {
  id: string
  name: string
  description?: string | null
  active?: boolean
  created_at: string
}

export interface Brand {
  id: string
  name: string
  created_at: string
}

export interface Supplier {
  id: string
  name: string
  whatsapp?: number | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  short_code?: string | null
  qr_code?: string | null
  category_id?: string | null
  brand_id?: string | null
  supplier_id?: string | null
  price_cents: number
  cost_price_cents?: number
  stock?: number
  stock_min?: number
  stock_consigned?: number
  size?: string | null
  color?: string | null
  description?: string | null
  active?: boolean
  created_at: string
  updated_at?: string
  // Derived properties for compatibility
  price?: number
  category?: string
  brand?: string
  supplier?: string
  photo_url?: string
}

export interface Client {
  id: string
  name: string
  whatsapp?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  birthday?: string | null
  notes?: string | null
  types?: string[]
  created_at: string
  updated_at?: string
  active?: boolean
}

export interface BlacklistEntry {
  id: string
  client_id: string
  client_name: string
  client_type: 'CONSIGNADO' | 'ATACADO' | 'VAREJO' // Tipo do cliente
  reason: string
  blocked_at: string
  blocked_until: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  name: string
  role: 'ADMIN' | 'COLAB'
  whatsapp?: string | null
  created_at: string
  updated_at?: string
  active?: boolean
}

export interface Sale {
  id: string
  client_id?: string | null
  user_id?: string | null
  channel?: 'VAREJO' | 'ATACADO'
  status?: 'RASCUNHO' | 'FECHADA' | 'CANCELADA'
  discount_total_cents?: number
  total_cents?: number // CORREÇÃO: Adicionar campo total_cents
  payment_summary?: Record<string, number>
  created_at: string
  closed_at?: string | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  discount_percent?: number
  created_at: string
}

export interface Consignacao {
  id: string
  codigo?: string
  client_id: string
  consultora_id?: string | null
  status?: 'RASCUNHO' | 'ENTREGUE' | 'EM_CONFERENCIA' | 'FINALIZADO' | 'CANCELADA'
  commission_default_percent?: number
  representative_name?: string
  city?: string
  created_at: string
  updated_at?: string
  data_prevista?: string | null
  observacao?: string | null
}

export interface ConsignacaoItem {
  id: string
  consignacao_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  commission_percent?: number
  returned_qty?: number
  created_at: string
}

export interface Payment {
  id: string
  sale_id?: string | null
  consignacao_id?: string | null
  amount_cents: number
  method?: 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO'
  paid_at?: string
  created_at?: string
  received_by?: string // ✅ NOVO: Quem recebeu o pagamento
  notes?: string // ✅ NOVO: Observações do pagamento
  collaborator_id?: string // ✅ NOVO: ID da colaboradora
}

export interface CashierShift {
  id: string
  opened_at: string
  closed_at?: string | null
  opening_amount_cents: number
  closing_amount_cents?: number | null
  totals?: Record<string, any>
}

// Resposta padrão para simular API
interface LocalResponse<T> {
  data: T | null
  error: Error | null
}

interface LocalListResponse<T> {
  data: T[] | null
  error: Error | null
}

// Classe para gerenciar dados localmente (sem Supabase)
class LocalOnlyDataManager {
  private data: {
    categories: Category[]
    brands: Brand[]
    suppliers: Supplier[]
    products: Product[]
    clients: Client[]
    blacklist: BlacklistEntry[]
    users: User[]
    sales: Sale[]
    sale_items: SaleItem[]
    consignacoes: Consignacao[]
    consignacao_items: ConsignacaoItem[]
    payments: Payment[]
    cashier_shifts: CashierShift[]
  }

  constructor() {
    // Verificar configuração do banco diretamente
    if (DATABASE_CONFIG.mode === 'local') {
      // Inicializar dados do localStorage ou dos arquivos JSON
      this.data = this.loadFromLocalStorage()

      // Salvar dados iniciais no localStorage se não existirem
      this.initializeLocalStorageIfNeeded()

      // console.log('🔧 Sistema LOCAL iniciado (desconectado do Supabase)') // ✅ Logs desabilitados
      // console.log('📊 Dados carregados:', this.getStats()) // ✅ Logs desabilitados
    } else {
      // Modo Supabase - inicializar com dados vazios e NÃO usar localStorage
      this.data = {
        categories: [],
        brands: [],
        suppliers: [],
        products: [],
        clients: [],
        blacklist: [],
        users: [],
        sales: [],
        sale_items: [],
        consignacoes: [],
        consignacao_items: [],
        payments: [],
        cashier_shifts: []
      }
      
      // console.log('🔧 Sistema LOCAL desativado (modo Supabase ativo)') // ✅ Logs desabilitados
      // console.log('📊 Dados vazios inicializados - localStorage ignorado') // ✅ Logs desabilitados
    }
  }

  // Inicializar localStorage com dados padrão se necessário (apenas em modo local)
  private async initializeLocalStorageIfNeeded() {
    // Só inicializar localStorage se estiver em modo local
    if (DATABASE_CONFIG.mode !== 'local') {
      console.log('🚫 localStorage desativado - modo Supabase ativo')
      return
    }

    const keys = ['categories', 'brands', 'suppliers', 'products', 'clients', 'blacklist', 'users', 'sales', 'sale_items', 'consignacoes', 'consignacao_items', 'payments', 'cashier_shifts']
    
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(this.data[key as keyof typeof this.data]))
        console.log(`💾 Inicializando ${key} no localStorage`)
      } else {
        console.log(`✅ ${key} já existe no localStorage`)
      }
    }
    
    // Força uma primeira sincronização para garantir consistência
    await this.saveData()
  }

  // Carregar dados do localStorage ou inicializar com dados padrão (apenas em modo local)
  private loadFromLocalStorage() {
    // Só carregar do localStorage se estiver em modo local
    if (DATABASE_CONFIG.mode !== 'local') {
      console.log('🚫 Carregamento do localStorage desativado - modo Supabase ativo')
      return {
        categories: [],
        brands: [],
        suppliers: [],
        products: [],
        clients: [],
        blacklist: [],
        users: [],
        sales: [],
        sale_items: [],
        consignacoes: [],
        consignacao_items: [],
        payments: [],
        cashier_shifts: []
      }
    }

    try {
      const savedData = {
        categories: JSON.parse(localStorage.getItem('categories') || 'null'),
        brands: JSON.parse(localStorage.getItem('brands') || 'null'),
        suppliers: JSON.parse(localStorage.getItem('suppliers') || 'null'),
        products: JSON.parse(localStorage.getItem('products') || 'null'),
        clients: JSON.parse(localStorage.getItem('clients') || 'null'),
        blacklist: JSON.parse(localStorage.getItem('blacklist') || 'null'),
        users: JSON.parse(localStorage.getItem('users') || 'null'),
        sales: JSON.parse(localStorage.getItem('sales') || 'null'),
        sale_items: JSON.parse(localStorage.getItem('sale_items') || 'null'),
        consignacoes: JSON.parse(localStorage.getItem('consignacoes') || 'null'),
        consignacao_items: JSON.parse(localStorage.getItem('consignacao_items') || 'null'),
        payments: JSON.parse(localStorage.getItem('payments') || 'null'),
        cashier_shifts: JSON.parse(localStorage.getItem('cashier_shifts') || 'null'),
      }

      // CORREÇÃO: Priorizar dados do localStorage sobre arquivos JSON
      // Se algum dado não existir no localStorage, usar dados padrão dos arquivos JSON
      const result = {
        categories: savedData.categories || [...categoriesData as Category[]],
        brands: savedData.brands || [...brandsData as Brand[]],
        suppliers: savedData.suppliers || [...suppliersData as Supplier[]],
        products: savedData.products || [...productsData as Product[]],
        clients: savedData.clients || [...clientsData as Client[]],
        blacklist: savedData.blacklist || [],
        users: savedData.users || [...usersData as User[]],
        sales: savedData.sales || [...salesData as Sale[]],
        sale_items: savedData.sale_items || [...saleItemsData as SaleItem[]],
        consignacoes: savedData.consignacoes || [...consignacoesData as Consignacao[]],
        consignacao_items: savedData.consignacao_items || [...consignacaoItemsData as ConsignacaoItem[]],
        payments: savedData.payments || [...paymentsData as Payment[]],
        cashier_shifts: savedData.cashier_shifts || [...cashierShiftsData as CashierShift[]]
      }

      // Log para debug
      console.log('📊 Dados carregados do localStorage:')
      console.log(`  - Vendas: ${result.sales.length} (localStorage: ${savedData.sales?.length || 0}, JSON: ${salesData.length})`)
      console.log(`  - Itens: ${result.sale_items.length} (localStorage: ${savedData.sale_items?.length || 0}, JSON: ${saleItemsData.length})`)
      console.log(`  - Pagamentos: ${result.payments.length} (localStorage: ${savedData.payments?.length || 0}, JSON: ${paymentsData.length})`)

      return result
    } catch (error) {
      console.error('Erro ao carregar dados do localStorage, usando dados padrão:', error)
      return {
        categories: [...categoriesData as Category[]],
        brands: [...brandsData as Brand[]],
        suppliers: [...suppliersData as Supplier[]],
        products: [...productsData as Product[]],
        clients: [...clientsData as Client[]],
        blacklist: [],
        users: [...usersData as User[]],
        sales: [...salesData as Sale[]],
        sale_items: [...saleItemsData as SaleItem[]],
        consignacoes: [...consignacoesData as Consignacao[]],
        consignacao_items: [...consignacaoItemsData as ConsignacaoItem[]],
        payments: [...paymentsData as Payment[]],
        cashier_shifts: [...cashierShiftsData as CashierShift[]]
      }
    }
  }

  // Função para gerar UUID
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Simular delay de rede (opcional, para testes)
  private async simulateNetworkDelay(ms: number = 100): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }

  // MÉTODOS PARA CATEGORIAS
  async getCategories(): Promise<LocalListResponse<Category>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.categories], error: null }
  }

  async getCategoryById(id: string): Promise<LocalResponse<Category>> {
    await this.simulateNetworkDelay()
    const category = this.data.categories.find(cat => cat.id === id)
    return { 
      data: category || null, 
      error: category ? null : new Error('Category not found') 
    }
  }

  async createCategory(name: string, description?: string): Promise<LocalResponse<Category>> {
    await this.simulateNetworkDelay()
    const newCategory: Category = {
      id: this.generateId(),
      name,
      description: description || null,
      active: true,
      created_at: new Date().toISOString()
    }
    this.data.categories.push(newCategory)
    await this.saveSpecificData('categories')
    return { data: newCategory, error: null }
  }

  async updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<LocalResponse<Category>> {
    await this.simulateNetworkDelay()
    const index = this.data.categories.findIndex(cat => cat.id === id)
    if (index === -1) {
      return { data: null, error: new Error('Category not found') }
    }
    
    this.data.categories[index] = { ...this.data.categories[index], ...updates }
    await this.saveSpecificData('categories')
    return { data: this.data.categories[index], error: null }
  }

  async deleteCategory(id: string): Promise<{ error: Error | null }> {
    await this.simulateNetworkDelay()
    const index = this.data.categories.findIndex(cat => cat.id === id)
    if (index === -1) {
      return { error: new Error('Category not found') }
    }
    
    this.data.categories.splice(index, 1)
    await this.saveSpecificData('categories')
    return { error: null }
  }

  // MÉTODOS PARA MARCAS
  async getBrands(): Promise<LocalListResponse<Brand>> {
    await this.simulateNetworkDelay()
    return { data: this.data.brands, error: null }
  }

  async getBrandById(id: string): Promise<LocalResponse<Brand>> {
    await this.simulateNetworkDelay()
    const brand = this.data.brands.find(b => b.id === id)
    return { 
      data: brand || null, 
      error: brand ? null : new Error('Brand not found') 
    }
  }

  async createBrand(name: string): Promise<LocalResponse<Brand>> {
    await this.simulateNetworkDelay()
    const newBrand: Brand = {
      id: this.generateId(),
      name,
      created_at: new Date().toISOString()
    }
    this.data.brands.push(newBrand)
    await this.saveSpecificData('brands')
    return { data: newBrand, error: null }
  }

  async updateBrand(id: string, name: string): Promise<LocalResponse<Brand>> {
    await this.simulateNetworkDelay()
    const index = this.data.brands.findIndex(b => b.id === id)
    if (index === -1) {
      return { data: null, error: new Error('Brand not found') }
    }
    
    this.data.brands[index] = { ...this.data.brands[index], name }
    await this.saveSpecificData('brands')
    return { data: this.data.brands[index], error: null }
  }

  async deleteBrand(id: string): Promise<{ error: Error | null }> {
    await this.simulateNetworkDelay()
    const index = this.data.brands.findIndex(b => b.id === id)
    if (index === -1) {
      return { error: new Error('Brand not found') }
    }
    
    this.data.brands.splice(index, 1)
    await this.saveSpecificData('brands')
    return { error: null }
  }

  // MÉTODOS PARA FORNECEDORES
  async getSuppliers(): Promise<LocalListResponse<Supplier>> {
    await this.simulateNetworkDelay()
    return { data: this.data.suppliers, error: null }
  }

  async createSupplier(supplierData: { name: string; whatsapp?: string }): Promise<LocalResponse<Supplier>> {
    await this.simulateNetworkDelay()
    const newSupplier: Supplier = {
      id: this.generateId(),
      name: supplierData.name,
      whatsapp: supplierData.whatsapp ? parseInt(supplierData.whatsapp.replace(/\D/g, '')) : null,
      created_at: new Date().toISOString()
    }
    this.data.suppliers.push(newSupplier)
    await this.saveSpecificData('suppliers')
    return { data: newSupplier, error: null }
  }

  async updateSupplier(id: string, supplierData: { name: string; whatsapp?: string }): Promise<LocalResponse<Supplier>> {
    await this.simulateNetworkDelay()
    const index = this.data.suppliers.findIndex(s => s.id === id)
    if (index === -1) {
      return { data: null, error: new Error('Supplier not found') }
    }
    
    this.data.suppliers[index] = { 
      ...this.data.suppliers[index], 
      name: supplierData.name,
      whatsapp: supplierData.whatsapp ? parseInt(supplierData.whatsapp.replace(/\D/g, '')) : null
    }
    await this.saveSpecificData('suppliers')
    return { data: this.data.suppliers[index], error: null }
  }

  async deleteSupplier(id: string): Promise<{ error: Error | null }> {
    await this.simulateNetworkDelay()
    const index = this.data.suppliers.findIndex(s => s.id === id)
    if (index === -1) {
      return { error: new Error('Supplier not found') }
    }
    
    this.data.suppliers.splice(index, 1)
    await this.saveSpecificData('suppliers')
    return { error: null }
  }

  // MÉTODOS PARA PRODUTOS
  async getProducts(): Promise<LocalListResponse<Product>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.products], error: null }
  }

  // Método para buscar produtos com dados relacionados (join)
  async getProductsWithRelations(): Promise<LocalListResponse<any>> {
    try {
      await this.simulateNetworkDelay()
      
      console.log('🔍 [getProductsWithRelations] Debug:', {
        productsCount: this.data.products?.length || 0,
        categoriesCount: this.data.categories?.length || 0,
        brandsCount: this.data.brands?.length || 0,
        suppliersCount: this.data.suppliers?.length || 0,
        products: this.data.products,
        categories: this.data.categories
      });
      
      if (!this.data.products || !Array.isArray(this.data.products)) {
        console.warn('Produtos não encontrados, retornando array vazio')
        return { data: [], error: null }
      }

      const productsWithRelations = this.data.products.map(product => {
        try {
          // Buscar categoria
          const category = product.category_id 
            ? this.data.categories?.find(c => c.id === product.category_id)
            : null

          console.log(`🔍 [getProductsWithRelations] Produto ${product.name}:`, {
            productId: product.id,
            categoryId: product.category_id,
            categoryFound: category,
            categoryName: category?.name
          });

          // Buscar marca
          const brand = product.brand_id 
            ? this.data.brands?.find(b => b.id === product.brand_id)
            : null

          // Buscar fornecedor
          const supplier = product.supplier_id 
            ? this.data.suppliers?.find(s => s.id === product.supplier_id)
            : null

          return {
            ...product,
            // Adicionar nomes resolvidos
            category: category?.name || 'Sem categoria',
            brand: brand?.name || 'Sem marca',
            supplier: supplier?.name || 'Sem fornecedor',
            // Manter objetos relacionados para compatibilidade
            categories: category,
            brands: brand,
            suppliers: supplier
          }
        } catch (productError) {
          console.error('Erro ao processar produto:', product.id, productError)
          return {
            ...product,
            category: 'Sem categoria',
            brand: 'Sem marca',
            supplier: 'Sem fornecedor',
            categories: null,
            brands: null,
            suppliers: null
          }
        }
      })

      return { data: productsWithRelations, error: null }
    } catch (error) {
      console.error('Erro em getProductsWithRelations:', error)
      return { data: [], error: error as Error }
    }
  }

  async getProductById(id: string): Promise<LocalResponse<Product>> {
    await this.simulateNetworkDelay()
    const product = this.data.products.find(prod => prod.id === id)
    return { 
      data: product || null, 
      error: product ? null : new Error('Product not found') 
    }
  }

  async getProductsByCategory(categoryId: string): Promise<LocalListResponse<Product>> {
    await this.simulateNetworkDelay()
    const products = this.data.products.filter(prod => prod.category_id === categoryId)
    return { data: products, error: null }
  }

  async searchProducts(query: string): Promise<LocalListResponse<Product>> {
    await this.simulateNetworkDelay()
    const lowerQuery = query.toLowerCase()
    const products = this.data.products.filter(prod => 
      prod.name.toLowerCase().includes(lowerQuery) ||
      prod.short_code?.toLowerCase().includes(lowerQuery) ||
      prod.qr_code?.toLowerCase().includes(lowerQuery)
    )
    return { data: products, error: null }
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at'>): Promise<LocalResponse<Product>> {
    await this.simulateNetworkDelay()
    const newProduct: Product = {
      ...productData,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    this.data.products.push(newProduct)
    await this.saveSpecificData('products')
    return { data: newProduct, error: null }
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<LocalResponse<Product>> {
    await this.simulateNetworkDelay()
    const index = this.data.products.findIndex(prod => prod.id === id)
    if (index === -1) {
      return { data: null, error: new Error('Product not found') }
    }
    
    this.data.products[index] = { 
      ...this.data.products[index], 
      ...updates,
      updated_at: new Date().toISOString()
    }
    await this.saveSpecificData('products')
    return { data: this.data.products[index], error: null }
  }

  async deleteProduct(id: string): Promise<{ error: Error | null }> {
    await this.simulateNetworkDelay()
    const index = this.data.products.findIndex(prod => prod.id === id)
    if (index === -1) {
      return { error: new Error('Product not found') }
    }
    
    this.data.products.splice(index, 1)
    await this.saveSpecificData('products')
    return { error: null }
  }

  // MÉTODOS PARA CLIENTES
  async getClients(): Promise<LocalListResponse<Client>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.clients], error: null }
  }

  async getClientById(id: string): Promise<LocalResponse<Client>> {
    await this.simulateNetworkDelay()
    const client = this.data.clients.find(client => client.id === id)
    return { 
      data: client || null, 
      error: client ? null : new Error('Client not found') 
    }
  }

  async searchClients(query: string): Promise<LocalListResponse<Client>> {
    await this.simulateNetworkDelay()
    const lowerQuery = query.toLowerCase()
    const clients = this.data.clients.filter(client => 
      client.name.toLowerCase().includes(lowerQuery) ||
      client.whatsapp?.includes(query) ||
      client.city?.toLowerCase().includes(lowerQuery)
    )
    return { data: clients, error: null }
  }

  async getClientsByType(type: string): Promise<LocalListResponse<Client>> {
    await this.simulateNetworkDelay()
    const clients = this.data.clients.filter(client => 
      client.types && client.types.includes(type)
    )
    return { data: clients, error: null }
  }

  async createClient(clientData: Omit<Client, 'id' | 'created_at'>): Promise<LocalResponse<Client>> {
    await this.simulateNetworkDelay()
    const newClient: Client = {
      ...clientData,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true
    }
    this.data.clients.push(newClient)
    await this.saveSpecificData('clients')
    return { data: newClient, error: null }
  }

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'created_at'>>): Promise<LocalResponse<Client>> {
    await this.simulateNetworkDelay()
    const index = this.data.clients.findIndex(client => client.id === id)
    if (index === -1) {
      return { data: null, error: new Error('Client not found') }
    }
    
    this.data.clients[index] = { 
      ...this.data.clients[index], 
      ...updates,
      updated_at: new Date().toISOString()
    }
    await this.saveSpecificData('clients')
    return { data: this.data.clients[index], error: null }
  }

  async deleteClient(id: string): Promise<{ error: Error | null }> {
    await this.simulateNetworkDelay()
    const index = this.data.clients.findIndex(client => client.id === id)
    if (index === -1) {
      return { error: new Error('Client not found') }
    }
    
    this.data.clients.splice(index, 1)
    await this.saveSpecificData('clients')
    return { error: null }
  }

  // MÉTODOS PARA BLACKLIST
  async getBlacklist(): Promise<LocalListResponse<BlacklistEntry>> {
    console.log('🚀 [getBlacklist] FUNÇÃO CHAMADA')
    await this.simulateNetworkDelay()
    
    // Recarregar dados do localStorage para garantir que temos os dados mais recentes
    const savedBlacklist = JSON.parse(localStorage.getItem('blacklist') || '[]')
    console.log('🔍 [getBlacklist] Dados do localStorage:', savedBlacklist.map((e: any) => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, client_type: e.client_type })))
    
    // Atualizar dados em memória com os dados do localStorage
    this.data.blacklist = savedBlacklist
    
    console.log('🔍 [localDataManager.getBlacklist] Retornando dados da blacklist:', this.data.blacklist.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, client_type: e.client_type })))
    return { data: [...this.data.blacklist], error: null }
  }

  async getBlacklistByType(clientType: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'): Promise<LocalListResponse<BlacklistEntry>> {
    console.log('🚀 [getBlacklistByType] FUNÇÃO CHAMADA para tipo:', clientType)
    await this.simulateNetworkDelay()
    
    // Recarregar dados do localStorage para garantir que temos os dados mais recentes
    const savedBlacklist = JSON.parse(localStorage.getItem('blacklist') || '[]')
    this.data.blacklist = savedBlacklist
    
    // Filtrar apenas entradas do tipo especificado
    const filteredBlacklist = this.data.blacklist.filter(entry => entry.client_type === clientType)
    
    console.log('🔍 [getBlacklistByType] Blacklist filtrada:', filteredBlacklist.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, client_type: e.client_type })))
    return { data: [...filteredBlacklist], error: null }
  }

  async addToBlacklist(blacklistData: {
    client_id: string;
    client_name: string;
    client_type: 'CONSIGNADO' | 'ATACADO' | 'VAREJO';
    reason: string;
    days_blocked: number;
  }): Promise<LocalResponse<BlacklistEntry>> {
    console.log('🚀 [addToBlacklist] BLOQUEANDO cliente:', blacklistData.client_name, 'tipo:', blacklistData.client_type)
    await this.simulateNetworkDelay()
    
    // Verificar se cliente já está bloqueado no mesmo tipo
    const now = new Date()
    const existingEntry = this.data.blacklist.find(entry => {
      if (entry.client_id !== blacklistData.client_id || entry.client_type !== blacklistData.client_type) {
        return false
      }
      // Verificar se o bloqueio ainda está ativo (não expirado)
      const blockedUntil = new Date(entry.blocked_until)
      return now <= blockedUntil
    })
    
    if (existingEntry) {
      console.warn(`⚠️ [addToBlacklist] Cliente ${blacklistData.client_name} já está bloqueado no tipo ${blacklistData.client_type}`)
      return { 
        data: null, 
        error: new Error(`Este cliente já está bloqueado no ${blacklistData.client_type}. Desbloqueie-o primeiro antes de criar um novo bloqueio.`) 
      }
    }
    
    // Remover entradas expiradas do mesmo cliente e tipo (se houver)
    this.data.blacklist = this.data.blacklist.filter(entry => {
      if (entry.client_id === blacklistData.client_id && entry.client_type === blacklistData.client_type) {
        const blockedUntil = new Date(entry.blocked_until)
        return now > blockedUntil // Manter apenas se estiver expirado
      }
      return true
    })

    const blockedAt = new Date()
    const blockedUntil = new Date()
    blockedUntil.setDate(blockedAt.getDate() + blacklistData.days_blocked)

    const newEntry: BlacklistEntry = {
      id: this.generateId(),
      client_id: blacklistData.client_id,
      client_name: blacklistData.client_name,
      client_type: blacklistData.client_type,
      reason: blacklistData.reason,
      blocked_at: blockedAt.toISOString(),
      blocked_until: blockedUntil.toISOString(),
      is_active: true,
      created_by: 'system', // TODO: Pegar usuário atual
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('✅ [addToBlacklist] Nova entrada criada:', { 
      id: newEntry.id, 
      client_id: newEntry.client_id, 
      client_name: newEntry.client_name,
      blocked_until: newEntry.blocked_until
    })

    this.data.blacklist.push(newEntry)
    await this.saveSpecificData('blacklist')
    
    console.log('💾 [addToBlacklist] Cliente bloqueado e salvo')
    return { data: newEntry, error: null }
  }

  async removeFromBlacklist(clientId: string, clientType?: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'): Promise<{ error: Error | null }> {
    console.log('🚀 [removeFromBlacklist] DESBLOQUEANDO cliente:', clientId, clientType ? `(tipo: ${clientType})` : '')
    await this.simulateNetworkDelay()
    
    console.log('🔍 [removeFromBlacklist] Blacklist antes:', this.data.blacklist.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, client_type: e.client_type })))
    
    // Encontrar e REMOVER completamente a entrada da blacklist
    const initialLength = this.data.blacklist.length
    
    if (clientType) {
      // Se especificou o tipo, remover apenas bloqueios desse tipo
      this.data.blacklist = this.data.blacklist.filter(entry => 
        !(entry.client_id === clientId && entry.client_type === clientType)
      )
    } else {
      // Se não especificou o tipo, remover todos os bloqueios do cliente
      this.data.blacklist = this.data.blacklist.filter(entry => entry.client_id !== clientId)
    }
    
    const finalLength = this.data.blacklist.length
    
    if (initialLength === finalLength) {
      console.log('⚠️ [removeFromBlacklist] Cliente não estava na blacklist')
      return { error: null } // Não é erro, cliente já estava desbloqueado
    }
    
    console.log('✅ [removeFromBlacklist] Cliente removido da blacklist')
    console.log('🔍 [removeFromBlacklist] Blacklist depois:', this.data.blacklist.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, client_type: e.client_type })))
    
    // Salvar dados atualizados
    await this.saveSpecificData('blacklist')
    
    console.log('💾 [removeFromBlacklist] Dados salvos no localStorage')
    return { error: null }
  }

  async checkClientBlacklist(clientId: string, clientType?: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'): Promise<LocalResponse<boolean>> {
    await this.simulateNetworkDelay()
    
    // Recarregar dados do localStorage para garantir que temos os dados mais recentes
    const savedBlacklist = JSON.parse(localStorage.getItem('blacklist') || '[]')
    this.data.blacklist = savedBlacklist
    
    console.log('🔍 [checkClientBlacklist] Verificando cliente:', clientId, 'tipo:', clientType)
    console.log('🔍 [checkClientBlacklist] Blacklist atual:', this.data.blacklist.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, client_type: e.client_type })))
    
    // Verificar se cliente está na blacklist
    let isBlocked = false
    
    if (clientType) {
      // Se especificou o tipo, verificar apenas entradas desse tipo
      isBlocked = this.data.blacklist.some(entry => 
        entry.client_id === clientId && entry.client_type === clientType
      )
    } else {
      // Se não especificou o tipo, verificar qualquer entrada
      isBlocked = this.data.blacklist.some(entry => entry.client_id === clientId)
    }
    
    if (isBlocked) {
      console.log('🚫 [checkClientBlacklist] Cliente está BLOQUEADO')
      return { data: true, error: null }
    } else {
      console.log('✅ [checkClientBlacklist] Cliente está LIBERADO')
      return { data: false, error: null }
    }
  }

  // MÉTODOS PARA USUÁRIOS
  async getUsers(): Promise<LocalListResponse<User>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.users], error: null }
  }

  async getUserById(id: string): Promise<LocalResponse<User>> {
    await this.simulateNetworkDelay()
    const user = this.data.users.find(user => user.id === id)
    return { 
      data: user || null, 
      error: user ? null : new Error('User not found') 
    }
  }

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<LocalResponse<User>> {
    await this.simulateNetworkDelay()
    const newUser: User = {
      ...userData,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      active: true
    }
    this.data.users.push(newUser)
    await this.saveSpecificData('users')
    return { data: newUser, error: null }
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'created_at'>>): Promise<LocalResponse<User>> {
    await this.simulateNetworkDelay()
    const index = this.data.users.findIndex(user => user.id === id)
    if (index === -1) {
      return { data: null, error: new Error('User not found') }
    }
    
    this.data.users[index] = {
      ...this.data.users[index],
      ...userData,
      updated_at: new Date().toISOString()
    }
    
    await this.saveSpecificData('users')
    return { data: this.data.users[index], error: null }
  }

  async deleteUser(id: string): Promise<LocalResponse<boolean>> {
    await this.simulateNetworkDelay()
    const index = this.data.users.findIndex(user => user.id === id)
    if (index === -1) {
      return { data: false, error: new Error('User not found') }
    }
    
    this.data.users.splice(index, 1)
    await this.saveSpecificData('users')
    return { data: true, error: null }
  }

  // MÉTODOS PARA VENDAS
  async getSales(): Promise<LocalListResponse<Sale>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.sales], error: null }
  }

  async getSaleById(id: string): Promise<LocalResponse<Sale>> {
    await this.simulateNetworkDelay()
    const sale = this.data.sales.find(sale => sale.id === id)
    return { 
      data: sale || null, 
      error: sale ? null : new Error('Sale not found') 
    }
  }

  async createSale(saleData: Omit<Sale, 'id' | 'created_at'>): Promise<LocalResponse<Sale>> {
    await this.simulateNetworkDelay()
    const newSale: Sale = {
      ...saleData,
      id: this.generateId(),
      created_at: new Date().toISOString()
    }
    this.data.sales.push(newSale)
    await this.saveSpecificData('sales')
    return { data: newSale, error: null }
  }

  async updateSale(id: string, updates: Partial<Omit<Sale, 'id' | 'created_at'>>): Promise<LocalResponse<Sale>> {
    await this.simulateNetworkDelay()
    
    try {
      const saleIndex = this.data.sales.findIndex(sale => sale.id === id);
      if (saleIndex === -1) {
        return { data: null, error: new Error('Venda não encontrada') };
      }

      // Atualizar venda
      this.data.sales[saleIndex] = {
        ...this.data.sales[saleIndex],
        ...updates
      };

      await this.saveSpecificData('sales');

      return { data: this.data.sales[saleIndex], error: null };
    } catch (error) {
      console.error('❌ [LocalDataManager] Erro ao atualizar venda:', error);
      return { data: null, error: error as Error };
    }
  }

  // MÉTODOS PARA ITENS DE VENDA
  async getSaleItems(saleId: string): Promise<LocalListResponse<SaleItem>> {
    await this.simulateNetworkDelay()
    const items = this.data.sale_items.filter(item => item.sale_id === saleId)
    console.log(`🔄 [LocalDataManager] Buscando itens para venda ${saleId}:`, {
      total_items: this.data.sale_items.length,
      found_items: items.length,
      all_items: this.data.sale_items
    });
    return { data: items, error: null }
  }

  async getAllSaleItems(): Promise<LocalListResponse<SaleItem>> {
    await this.simulateNetworkDelay()
    
    // Debug detalhado
    console.log(`🔄 [LocalDataManager] Buscando todos os itens de vendas:`);
    console.log(`  - Dados em memória: ${this.data.sale_items.length} itens`);
    console.log(`  - Dados no localStorage: ${JSON.parse(localStorage.getItem('sale_items') || '[]').length} itens`);
    console.log(`  - Itens em memória:`, this.data.sale_items);
    console.log(`  - Itens no localStorage:`, JSON.parse(localStorage.getItem('sale_items') || '[]'));
    
    return { data: this.data.sale_items, error: null }
  }

  async createSaleItem(saleItemData: Omit<SaleItem, 'id' | 'created_at'>): Promise<LocalResponse<SaleItem>> {
    await this.simulateNetworkDelay()
    const newSaleItem: SaleItem = {
      ...saleItemData,
      id: this.generateId(),
      created_at: new Date().toISOString()
    }
    this.data.sale_items.push(newSaleItem)
    await this.saveSpecificData('sale_items')
    return { data: newSaleItem, error: null }
  }

  // MÉTODOS PARA PAGAMENTOS
  async getPaymentsBySaleId(saleId: string): Promise<LocalListResponse<Payment>> {
    await this.simulateNetworkDelay()
    const payments = this.data.payments.filter(payment => payment.sale_id === saleId)
    return { data: payments, error: null }
  }

  async createPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<LocalResponse<Payment>> {
    try {
      console.log('🔄 [LocalDataManager] Criando pagamento:', paymentData);
      
      const newPayment: Payment = {
        ...paymentData,
        id: this.generateId(),
        created_at: new Date().toISOString(),
        paid_at: paymentData.paid_at || new Date().toISOString()
      };
      
      this.data.payments.push(newPayment);
      
      // Salvar imediatamente
      await this.saveSpecificData('payments');
      
      console.log('✅ [LocalDataManager] Pagamento criado:', newPayment.id);
      
      return { data: newPayment, error: null };
    } catch (error) {
      console.error('❌ [LocalDataManager] Erro ao criar pagamento:', error);
      return { data: null, error: error as Error };
    }
  }

  // MÉTODO COMPLETO PARA FINALIZAR VENDA VAREJO
  async completeRetailSale(saleData: {
    client_id?: string | null;
    collaborator_id?: string | null;
    items: Array<{
      product_id: string;
      qty: number;
      unit_price_cents: number;
      discount_percent: number;
    }>;
    payments: Array<{
      method: string;
      amount_cents: number;
    }>;
  }): Promise<LocalResponse<{ sale_id: string; total_cents: number; items_count: number; payments_count: number }>> {
    await this.simulateNetworkDelay()
    
    try {
      // Calcular total da venda
      const total_cents = saleData.items.reduce((acc, item) => {
        const itemTotal = item.unit_price_cents * item.qty;
        const discountAmount = Math.round(itemTotal * (item.discount_percent / 100));
        return acc + (itemTotal - discountAmount);
      }, 0);

      // Calcular desconto total
      const discount_total_cents = saleData.items.reduce((acc, item) => {
        const itemTotal = item.unit_price_cents * item.qty;
        return acc + Math.round(itemTotal * (item.discount_percent / 100));
      }, 0);

      // ✅ CORREÇÃO: Garantir que sempre tenha um user_id válido
      let userId = saleData.collaborator_id;
      
      if (!userId) {
        // Buscar colaborador padrão se não há colaborador selecionado
        const defaultCollaborator = this.data.collaborators.find(c => c.active);
        if (defaultCollaborator) {
          userId = defaultCollaborator.id;
          console.log(`🔄 [LocalDataManager] Usando colaborador padrão: ${defaultCollaborator.name}`);
        } else {
          console.warn('⚠️ [LocalDataManager] Nenhum colaborador ativo encontrado');
        }
      }

      // Criar venda
      const sale: Sale = {
        id: this.generateId(),
        client_id: saleData.client_id,
        user_id: userId,
        channel: 'VAREJO',
        status: 'FECHADA',
        discount_total_cents,
        total_cents, // CORREÇÃO: Salvar o total calculado na venda
        payment_summary: saleData.payments.reduce((acc, payment) => {
          acc[payment.method] = (acc[payment.method] || 0) + payment.amount_cents;
          return acc;
        }, {} as Record<string, number>),
        created_at: new Date().toISOString(),
        closed_at: new Date().toISOString()
      };

      console.log('🔄 [LocalDataManager] Criando venda:', {
        sale_id: sale.id,
        client_id: sale.client_id,
        user_id: sale.user_id,
        channel: sale.channel,
        status: sale.status,
        discount_total_cents: sale.discount_total_cents,
        payment_summary: sale.payment_summary,
        created_at: sale.created_at,
        total_cents: total_cents
      });

      this.data.sales.push(sale);

      // Criar itens da venda
      for (const item of saleData.items) {
        const saleItem: SaleItem = {
          id: this.generateId(),
          sale_id: sale.id,
          product_id: item.product_id,
          qty: item.qty,
          unit_price_cents: item.unit_price_cents,
          discount_percent: item.discount_percent,
          created_at: new Date().toISOString()
        };
        
        console.log('🔄 [LocalDataManager] Criando item da venda:', {
          item_id: saleItem.id,
          sale_id: saleItem.sale_id,
          product_id: saleItem.product_id,
          qty: saleItem.qty,
          unit_price_cents: saleItem.unit_price_cents,
          discount_percent: saleItem.discount_percent
        });
        
        this.data.sale_items.push(saleItem);

        // Atualizar estoque do produto
        const productIndex = this.data.products.findIndex(p => p.id === item.product_id);
        if (productIndex >= 0) {
          const product = this.data.products[productIndex];
          const currentStock = product.stock || 0;
          const newStock = Math.max(0, currentStock - item.qty);
          
          this.data.products[productIndex].stock = newStock;
        }
      }

      // Criar pagamentos
      for (const payment of saleData.payments) {
        const paymentRecord: Payment = {
          id: this.generateId(),
          sale_id: sale.id,
          method: payment.method as 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO',
          amount_cents: payment.amount_cents,
          created_at: new Date().toISOString(),
          paid_at: new Date().toISOString()
        };
        
        console.log('🔄 [LocalDataManager] Criando pagamento:', {
          payment_id: paymentRecord.id,
          sale_id: paymentRecord.sale_id,
          method: paymentRecord.method,
          amount_cents: paymentRecord.amount_cents
        });
        
        this.data.payments.push(paymentRecord);
      }

      // CORREÇÃO: Salvar todos os dados de forma mais robusta
      console.log('💾 [LocalDataManager] Salvando dados da venda...');
      await this.saveSpecificData('sales');
      await this.saveSpecificData('sale_items');
      await this.saveSpecificData('payments');
      await this.saveSpecificData('products');

      // Verificar se os dados foram salvos corretamente
      const savedSales = JSON.parse(localStorage.getItem('sales') || '[]');
      const savedItems = JSON.parse(localStorage.getItem('sale_items') || '[]');
      const savedPayments = JSON.parse(localStorage.getItem('payments') || '[]');
      
      console.log('✅ [LocalDataManager] Verificação pós-salvamento:');
      console.log(`  - Vendas salvas: ${savedSales.length}`);
      console.log(`  - Itens salvos: ${savedItems.length}`);
      console.log(`  - Pagamentos salvos: ${savedPayments.length}`);
      
      // Verificar se a venda específica foi salva
      const savedSale = savedSales.find((s: any) => s.id === sale.id);
      const savedSaleItems = savedItems.filter((item: any) => item.sale_id === sale.id);
      const savedSalePayments = savedPayments.filter((payment: any) => payment.sale_id === sale.id);
      
      console.log(`✅ [LocalDataManager] Venda ${sale.id.slice(-4)} verificada:`);
      console.log(`  - Venda: ${savedSale ? '✅' : '❌'}`);
      console.log(`  - Itens: ${savedSaleItems.length}/${saleData.items.length}`);
      console.log(`  - Pagamentos: ${savedSalePayments.length}/${saleData.payments.length}`);

      console.log(`✅ [LocalDataManager] Venda finalizada: ${sale.id}`);

      return {
        data: {
          sale_id: sale.id,
          total_cents,
          items_count: saleData.items.length,
          payments_count: saleData.payments.length
        },
        error: null
      };

    } catch (error) {
      console.error('❌ [LocalDataManager] Erro ao finalizar venda:', error);
      return { data: null, error: error as Error };
    }
  }

  // ADICIONAR PAGAMENTO A VENDA EXISTENTE
  async addPaymentToSale(saleId: string, paymentData: {
    method: string;
    amount_cents: number;
  }): Promise<LocalResponse<{ payment_id: string; amount_cents: number; method: string }>> {
    try {
      console.log('🔄 [LocalDataManager] Adicionando pagamento à venda:', {
        sale_id: saleId,
        method: paymentData.method,
        amount_cents: paymentData.amount_cents
      });

      // Verificar se a venda existe
      const sale = this.data.sales.find(s => s.id === saleId);
      if (!sale) {
        throw new Error('Venda não encontrada');
      }

      // Verificar se a venda está fechada
      if (sale.status !== 'FECHADA') {
        throw new Error('Apenas vendas fechadas podem receber pagamentos adicionais');
      }

      // Calcular total da venda
      let totalAmount = 0;
      if (sale.total_cents !== undefined) {
        totalAmount = sale.total_cents;
      } else {
        totalAmount = this.data.sale_items
          .filter(item => item.sale_id === saleId)
          .reduce((sum, item) => {
            const itemTotal = item.unit_price_cents * item.qty;
            const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
            return sum + (itemTotal - discountAmount);
          }, 0);
      }

      // Calcular valor já pago
      const paidAmount = this.data.payments
        .filter(p => p.sale_id === saleId)
        .reduce((sum, p) => sum + p.amount_cents, 0);

      // Verificar se o pagamento não excede o valor pendente
      const pendingAmount = totalAmount - paidAmount;
      if (paymentData.amount_cents > pendingAmount) {
        throw new Error(`Valor do pagamento (R$ ${(paymentData.amount_cents / 100).toFixed(2)}) excede o valor pendente (R$ ${(pendingAmount / 100).toFixed(2)})`);
      }

      // Criar o pagamento
      const paymentRecord: Payment = {
        id: this.generateId(),
        sale_id: saleId,
        method: paymentData.method as 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO',
        amount_cents: paymentData.amount_cents,
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString()
      };

      console.log('🔄 [LocalDataManager] Criando pagamento:', {
        payment_id: paymentRecord.id,
        sale_id: paymentRecord.sale_id,
        method: paymentRecord.method,
        amount_cents: paymentRecord.amount_cents
      });

      // Adicionar o pagamento
      this.data.payments.push(paymentRecord);

      // Salvar dados
      await this.saveSpecificData('payments');

      console.log(`✅ [LocalDataManager] Pagamento adicionado: ${paymentRecord.id}`);

      return {
        data: {
          payment_id: paymentRecord.id,
          amount_cents: paymentRecord.amount_cents,
          method: paymentRecord.method
        },
        error: null
      };

    } catch (error) {
      console.error('❌ [LocalDataManager] Erro ao adicionar pagamento:', error);
      return { data: null, error: error as Error };
    }
  }

  // MÉTODOS PARA CONSIGNAÇÕES
  async getConsignacoes(): Promise<LocalListResponse<Consignacao>> {
    await this.simulateNetworkDelay()
    
    console.log('📋 [getConsignacoes] Consignações carregadas do localStorage:', this.data.consignacoes.length);
    console.log('📋 [getConsignacoes] Dados completos:', this.data.consignacoes.map(c => ({
      id: c.id, 
      status: c.status, 
      codigo: c.codigo, 
      client_id: c.client_id,
      data_prevista: c.data_prevista
    })));
    
    return { data: [...this.data.consignacoes], error: null }
  }

  async getConsignacaoById(id: string): Promise<LocalResponse<Consignacao>> {
    await this.simulateNetworkDelay()
    const consignacao = this.data.consignacoes.find(cons => cons.id === id)
    return { 
      data: consignacao || null, 
      error: consignacao ? null : new Error('Consignacao not found') 
    }
  }

  async createConsignacao(consignacaoData: Omit<Consignacao, 'id' | 'created_at' | 'updated_at'>): Promise<LocalResponse<Consignacao>> {
    await this.simulateNetworkDelay()
    const now = new Date().toISOString()
    
    // Gerar código sequencial se não foi fornecido
    let codigo = consignacaoData.codigo
    if (!codigo) {
      const existingConsignacoes = this.data.consignacoes || []
      const nextNumber = existingConsignacoes.length + 1
      codigo = `C${nextNumber.toString().padStart(6, '0')}`
      console.log(`🔢 [createConsignacao] Código gerado: ${codigo} para número ${nextNumber} de ${existingConsignacoes.length} existentes`);
    }
    
    const newConsignacao: Consignacao = {
      ...consignacaoData,
      codigo,
      id: this.generateId(),
      created_at: now,
      updated_at: now
    }
    
    console.log('🆕 [createConsignacao] Nova consignação criada:', JSON.stringify(newConsignacao, null, 2));
    
    this.data.consignacoes.push(newConsignacao)
    await this.saveSpecificData('consignacoes')
    
    console.log('💾 [createConsignacao] Consignação salva, total agora:', this.data.consignacoes.length);
    
    return { data: newConsignacao, error: null }
  }

  async updateConsignacao(id: string, updates: Partial<Consignacao>): Promise<LocalResponse<Consignacao>> {
    try {
      console.log('🚀 [LocalDataManager.updateConsignacao] FUNÇÃO CHAMADA!')
      console.log('🔄 [LocalDataManager.updateConsignacao] Atualizando:', { id, updates })
      
      // Buscar índice da consignação
      const index = this.data.consignacoes.findIndex(c => c.id === id)
      if (index === -1) {
        return { data: null, error: new Error('Consignação não encontrada') }
      }
      
      const consignacaoAtual = this.data.consignacoes[index]
      const novoStatus = updates.status
      
      console.log('🔍 [LocalDataManager.updateConsignacao] DEBUG - Status atual:', consignacaoAtual.status)
      console.log('🔍 [LocalDataManager.updateConsignacao] DEBUG - Novo status:', novoStatus)
      console.log('🔍 [LocalDataManager.updateConsignacao] DEBUG - Status diferentes?', novoStatus !== consignacaoAtual.status)
      console.log('🔍 [LocalDataManager.updateConsignacao] DEBUG - Condição completo:', {
        novoStatus,
        statusAtual: consignacaoAtual.status,
        temNovoStatus: !!novoStatus,
        saoDiferentes: novoStatus !== consignacaoAtual.status,
        condicaoCompleta: novoStatus && novoStatus !== consignacaoAtual.status
      })
      
      // LÓGICA DE ATUALIZAÇÃO DE ESTOQUE
      if (novoStatus && novoStatus !== consignacaoAtual.status) {
        console.log(`🔄 [LocalDataManager.updateConsignacao] Mudança de status: ${consignacaoAtual.status} → ${novoStatus}`)
        
        // Se mudando de ENTREGUE para EM_CONFERENCIA (Aguardando Pagamento)
        if (consignacaoAtual.status === 'ENTREGUE' && novoStatus === 'EM_CONFERENCIA') {
          console.log('📦 [LocalDataManager.updateConsignacao] REMOVENDO produtos do estoque físico (produtos não devolvidos)')
          
          // Buscar itens da consignação
          const itensConsignacao = this.data.consignacao_items.filter(item => item.consignacao_id === id)
          console.log('🔍 [LocalDataManager.updateConsignacao] Itens encontrados:', itensConsignacao.length)
          
          for (const item of itensConsignacao) {
            const productIndex = this.data.products.findIndex(p => p.id === item.product_id)
            if (productIndex >= 0) {
              const product = this.data.products[productIndex]
              const currentStock = product.stock || 0
              
              // ✅ CORREÇÃO: Usar quantidade vendida (qtd_enviada - qtd_devolvida) para remoção do estoque
              const qtyVendida = Math.max(0, (item.qtd_enviada || item.qty) - (item.qtd_devolvida || 0))
              const newStock = Math.max(0, currentStock - qtyVendida)
              
              console.log(`📦 [LocalDataManager.updateConsignacao] Produto ${product.name}:`, {
                estoqueAnterior: currentStock,
                qtdEnviada: item.qtd_enviada || item.qty,
                qtdDevolvida: item.qtd_devolvida || 0,
                qtyVendidaCalculada: qtyVendida,
                estoqueNovo: newStock,
                removidoDoEstoque: qtyVendida
              })
              
              this.data.products[productIndex].stock = newStock
            } else {
              console.log('❌ [LocalDataManager.updateConsignacao] Produto não encontrado:', item.product_id)
            }
          }
          
          // Salvar produtos atualizados
          await this.saveSpecificData('products')
          console.log('✅ [LocalDataManager.updateConsignacao] Estoque físico atualizado - produtos removidos')
        }
        
        // Se mudando de EM_CONFERENCIA para FINALIZADO (Pagamento Concluído)
        if (consignacaoAtual.status === 'EM_CONFERENCIA' && novoStatus === 'FINALIZADO') {
          console.log('✅ [LocalDataManager.updateConsignacao] Consignação finalizada - produtos já foram removidos do estoque')
        }
        
        // Se mudando de qualquer status para CANCELADA (devolver produtos ao estoque)
        if (novoStatus === 'CANCELADA') {
          console.log('🔄 [LocalDataManager.updateConsignacao] DEVOLVENDO produtos ao estoque (consignação cancelada)')
          
          // Buscar itens da consignação
          const itensConsignacao = this.data.consignacao_items.filter(item => item.consignacao_id === id)
          
          for (const item of itensConsignacao) {
            const productIndex = this.data.products.findIndex(p => p.id === item.product_id)
            if (productIndex >= 0) {
              const product = this.data.products[productIndex]
              const currentStock = product.stock || 0
              const newStock = currentStock + item.qty
              
              console.log(`🔄 [LocalDataManager.updateConsignacao] Produto ${product.name}: ${currentStock} → ${newStock} (devolvido ${item.qty})`)
              
              this.data.products[productIndex].stock = newStock
            }
          }
          
          // Salvar produtos atualizados
          await this.saveSpecificData('products')
          console.log('✅ [LocalDataManager.updateConsignacao] Estoque físico atualizado - produtos devolvidos')
        }
      } else {
        console.log('⚠️ [LocalDataManager.updateConsignacao] Nenhuma mudança de status detectada ou status inválido')
      }
      
      // Criar versão atualizada com timestamp
      const updatedConsignacao: Consignacao = {
        ...this.data.consignacoes[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      // Atualizar no array
      this.data.consignacoes[index] = updatedConsignacao
      
      // Persistir no localStorage usando o método correto
      await this.saveData()
      
      console.log('✅ [LocalDataManager.updateConsignacao] Atualizada:', updatedConsignacao)
      return { data: updatedConsignacao, error: null }
    } catch (error) {
      console.error('❌ [LocalDataManager.updateConsignacao] Erro:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteConsignacao(id: string): Promise<{ error: Error | null }> {
    await this.simulateNetworkDelay()
    
    console.log('🗑️ [deleteConsignacao] Tentando excluir consignação:', id);
    
    try {
      // Deletar itens da consignação primeiro
      const itemsToDelete = this.data.consignacao_items.filter(item => item.consignacao_id === id)
      console.log(`🗑️ [deleteConsignacao] Encontrados ${itemsToDelete.length} itens para deletar`);
      
      for (const item of itemsToDelete) {
        // Remover item da lista
        const itemIndex = this.data.consignacao_items.findIndex(i => i.id === item.id)
        if (itemIndex !== -1) {
          this.data.consignacao_items.splice(itemIndex, 1)
          console.log(`🗑️ [deleteConsignacao] Item ${item.id} removido`);
        }
      }
      
      // Deletar a consignação
      const consignacaoIndex = this.data.consignacoes.findIndex(cons => cons.id === id)
      if (consignacaoIndex === -1) {
        console.error('❌ [deleteConsignacao] Consignação não encontrada:', id);
        return { error: new Error('Consignação não encontrada') }
      }
      
      this.data.consignacoes.splice(consignacaoIndex, 1)
      console.log('🗑️ [deleteConsignacao] Consignação removida da lista');
      
      // Salvar alterações
      await this.saveSpecificData('consignacoes')
      await this.saveSpecificData('consignacao_items')
      
      console.log('💾 [deleteConsignacao] Alterações salvas no localStorage');
      
      return { error: null }
    } catch (error) {
      console.error('❌ [deleteConsignacao] Erro ao excluir:', error);
      return { error: error as Error }
    }
  }

  // MÉTODOS PARA ITENS DE CONSIGNAÇÃO
  async getConsignacaoItems(consignacaoId: string): Promise<LocalListResponse<ConsignacaoItem>> {
    await this.simulateNetworkDelay()
    const items = this.data.consignacao_items.filter(item => item.consignacao_id === consignacaoId)
    return { data: items, error: null }
  }

  async createConsignacaoItem(itemData: Omit<ConsignacaoItem, 'id' | 'created_at'>): Promise<LocalResponse<ConsignacaoItem>> {
    await this.simulateNetworkDelay()
    const newItem: ConsignacaoItem = {
      ...itemData,
      id: this.generateId(),
      created_at: new Date().toISOString()
    }
    this.data.consignacao_items.push(newItem)
    await this.saveSpecificData('consignacao_items')
    return { data: newItem, error: null }
  }

  // MÉTODOS PARA PAGAMENTOS
  async getPayments(): Promise<LocalListResponse<Payment>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.payments], error: null }
  }

  // MÉTODOS PARA TURNOS DE CAIXA
  async getCashierShifts(): Promise<LocalListResponse<CashierShift>> {
    await this.simulateNetworkDelay()
    return { data: [...this.data.cashier_shifts], error: null }
  }

  async getCurrentShift(): Promise<LocalResponse<CashierShift>> {
    await this.simulateNetworkDelay()
    const shift = this.data.cashier_shifts.find(shift => shift.closed_at === null)
    return { 
      data: shift || null, 
      error: shift ? null : new Error('No current shift') 
    }
  }

  // MÉTODOS UTILITÁRIOS
  getStats() {
    return {
      categories: this.data.categories.length,
      products: this.data.products.length,
      clients: this.data.clients.length,
      blacklist: this.data.blacklist.length,
      users: this.data.users.length,
      sales: this.data.sales.length,
      sale_items: this.data.sale_items.length,
      consignacoes: this.data.consignacoes.length,
      consignacao_items: this.data.consignacao_items.length,
      payments: this.data.payments.length,
      cashier_shifts: this.data.cashier_shifts.length,
      total: Object.values(this.data).reduce((sum, arr) => sum + arr.length, 0)
    }
  }

  // Método para resetar dados (útil para testes)
  reset() {
    this.data = {
      categories: [...categoriesData as Category[]],
      brands: [...brandsData as Brand[]],
      suppliers: [...suppliersData as Supplier[]],
      products: [...productsData as Product[]],
      clients: [...clientsData as Client[]],
      blacklist: [],
      users: [...usersData as User[]],
      sales: [...salesData as Sale[]],
      sale_items: [...saleItemsData as SaleItem[]],
      consignacoes: [...consignacoesData as Consignacao[]],
      consignacao_items: [...consignacaoItemsData as ConsignacaoItem[]],
      payments: [...paymentsData as Payment[]],
      cashier_shifts: [...cashierShiftsData as CashierShift[]]
    }
  }

  // Método para salvar dados no localStorage (apenas em modo local)
  async saveData(): Promise<void> {
    // Só salvar no localStorage se estiver em modo local
    if (DATABASE_CONFIG.mode !== 'local') {
      console.log('🚫 Salvamento no localStorage desativado - modo Supabase ativo')
      return
    }

    try {
      // Salvar cada tipo de dado no localStorage com validação
      const dataTypes = [
        { key: 'categories', data: this.data.categories },
        { key: 'brands', data: this.data.brands },
        { key: 'suppliers', data: this.data.suppliers },
        { key: 'products', data: this.data.products },
        { key: 'clients', data: this.data.clients },
        { key: 'blacklist', data: this.data.blacklist },
        { key: 'users', data: this.data.users },
        { key: 'sales', data: this.data.sales },
        { key: 'sale_items', data: this.data.sale_items },
        { key: 'consignacoes', data: this.data.consignacoes },
        { key: 'consignacao_items', data: this.data.consignacao_items },
        { key: 'payments', data: this.data.payments },
        { key: 'cashier_shifts', data: this.data.cashier_shifts }
      ]
      
      for (const { key, data } of dataTypes) {
        try {
          const jsonData = JSON.stringify(data)
          localStorage.setItem(key, jsonData)
          console.log(`💾 ${key}: ${data.length} registros salvos`)
        } catch (error) {
          console.error(`❌ Erro ao salvar ${key}:`, error)
          throw error
        }
      }
      
      // Salvar timestamp da última atualização
      localStorage.setItem('lastSaveTime', new Date().toISOString())
      console.log('✅ Todos os dados salvos no localStorage com sucesso')
    } catch (error) {
      console.error('❌ Erro geral ao salvar dados no localStorage:', error)
      throw error
    }
  }

  // Método para salvar um tipo específico de dado
  private async saveSpecificData(key: keyof typeof this.data): Promise<void> {
    try {
      console.log(`💾 [saveSpecificData] Salvando ${key}...`)
      // Sempre salvar no localStorage (independente da configuração persistData)
      // A configuração persistData é para funcionalidades futuras
      const dataToSave = this.data[key]
      const jsonData = JSON.stringify(dataToSave)
      localStorage.setItem(key, jsonData)
      console.log(`💾 [saveSpecificData] ${key} salvo no localStorage (${dataToSave.length} registros)`)
      
      // Logs específicos para blacklist
      if (key === 'blacklist') {
        console.log('🔍 [saveSpecificData] Dados da blacklist sendo salvos:', dataToSave.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name, is_active: e.is_active })))
        console.log('🔍 [saveSpecificData] JSON sendo salvo:', jsonData)
      }
      
      // Verificar se foi salvo corretamente
      const savedData = localStorage.getItem(key)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        console.log(`✅ [saveSpecificData] ${key} verificado: ${parsedData.length} registros no localStorage`)
        
        // Verificar se os dados são idênticos
        if (parsedData.length !== dataToSave.length) {
          console.error(`❌ ${key}: Inconsistência detectada! Memória: ${dataToSave.length}, localStorage: ${parsedData.length}`)
        }
      } else {
        console.error(`❌ ${key}: Falha ao salvar no localStorage`)
      }
    } catch (error) {
      console.error(`❌ Erro ao salvar ${key} no localStorage:`, error)
      throw error
    }
  }

  // Método para verificar integridade dos dados salvos
  checkDataIntegrity(): boolean {
    try {
      const keys = ['categories', 'brands', 'suppliers', 'products', 'clients', 'users', 'sales', 'sale_items', 'consignacoes', 'consignacao_items', 'payments', 'cashier_shifts']
      let allValid = true
      
      for (const key of keys) {
        const stored = localStorage.getItem(key)
        if (!stored) {
          console.warn(`⚠️ ${key} não encontrado no localStorage`)
          allValid = false
        } else {
          try {
            const parsed = JSON.parse(stored)
            if (!Array.isArray(parsed)) {
              console.warn(`⚠️ ${key} não é um array válido`)
              allValid = false
            } else {
              console.log(`✅ ${key}: ${parsed.length} registros válidos`)
            }
          } catch (error) {
            console.error(`❌ Erro ao parsear ${key}:`, error)
            allValid = false
          }
        }
      }
      
      const lastSave = localStorage.getItem('lastSaveTime')
      console.log(`📅 Último salvamento: ${lastSave || 'Nunca'}`)
      
      return allValid
    } catch (error) {
      console.error('❌ Erro ao verificar integridade dos dados:', error)
      return false
    }
  }

  // MÉTODOS PARA EXCLUSÃO DE VENDAS
  async deleteSale(saleId: string): Promise<LocalResponse<boolean>> {
    await this.simulateNetworkDelay()
    
    try {
      console.log('🗑️ [LocalDataManager] Excluindo venda:', saleId);
      
      // Encontrar a venda
      const saleIndex = this.data.sales.findIndex(s => s.id === saleId);
      if (saleIndex === -1) {
        throw new Error('Venda não encontrada');
      }
      
      // Remover itens da venda
      this.data.sale_items = this.data.sale_items.filter(item => item.sale_id !== saleId);
      
      // Remover pagamentos da venda
      this.data.payments = this.data.payments.filter(payment => payment.sale_id !== saleId);
      
      // Remover a venda
      this.data.sales.splice(saleIndex, 1);
      
      // Salvar dados
      await this.saveSpecificData('sales');
      await this.saveSpecificData('sale_items');
      await this.saveSpecificData('payments');
      
      console.log('✅ [LocalDataManager] Venda excluída com sucesso');
      return { data: true, error: null };
      
    } catch (error) {
      console.error('❌ [LocalDataManager] Erro ao excluir venda:', error);
      return { data: null, error: error as Error };
    }
  }

  async deleteSales(saleIds: string[]): Promise<LocalResponse<{ deleted: number; failed: number }>> {
    await this.simulateNetworkDelay()
    
    try {
      console.log('🗑️ [LocalDataManager] Excluindo vendas em massa:', saleIds);
      
      let deleted = 0;
      let failed = 0;
      
      for (const saleId of saleIds) {
        try {
          // Encontrar a venda
          const saleIndex = this.data.sales.findIndex(s => s.id === saleId);
          if (saleIndex === -1) {
            failed++;
            continue;
          }
          
          // Remover itens da venda
          this.data.sale_items = this.data.sale_items.filter(item => item.sale_id !== saleId);
          
          // Remover pagamentos da venda
          this.data.payments = this.data.payments.filter(payment => payment.sale_id !== saleId);
          
          // Remover a venda
          this.data.sales.splice(saleIndex, 1);
          deleted++;
          
        } catch (error) {
          console.error(`❌ [LocalDataManager] Erro ao excluir venda ${saleId}:`, error);
          failed++;
        }
      }
      
      // Salvar dados apenas se houve exclusões
      if (deleted > 0) {
        await this.saveSpecificData('sales');
        await this.saveSpecificData('sale_items');
        await this.saveSpecificData('payments');
      }
      
      console.log(`✅ [LocalDataManager] Exclusão em massa concluída: ${deleted} excluídas, ${failed} falharam`);
      return { data: { deleted, failed }, error: null };
      
    } catch (error) {
      console.error('❌ [LocalDataManager] Erro na exclusão em massa:', error);
      return { data: null, error: error as Error };
    }
  }
}

// Instância singleton
export const localDataManager = new LocalOnlyDataManager()

// Expor função de debug globalmente (apenas em desenvolvimento)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugLocalData = {
    checkIntegrity: () => localDataManager.checkDataIntegrity(),
    saveData: () => localDataManager.saveData(),
    getStats: () => localDataManager.getStats(),
    checkSalesItems: () => {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]')
      const saleItems = JSON.parse(localStorage.getItem('sale_items') || '[]')
      console.log('🔍 Debug Vendas e Itens:')
      console.log(`📊 Vendas: ${sales.length}`)
      console.log(`📦 Itens: ${saleItems.length}`)
      
      sales.forEach((sale: any) => {
        const items = saleItems.filter((item: any) => item.sale_id === sale.id)
        console.log(`🛒 Venda ${sale.id.slice(-4)}: ${items.length} itens, Total: R$ ${(sale.total_cents / 100).toFixed(2)}`)
        items.forEach((item: any) => {
          console.log(`  - ${item.qty}x produto ${item.product_id.slice(-4)}`)
        })
      })
    },
    fixSalesItems: () => {
      console.log('🔧 Forçando sincronização de vendas e itens...')
      localDataManager.saveData()
    },
    clearAll: () => {
      const keys = ['categories', 'brands', 'suppliers', 'products', 'clients', 'users', 'sales', 'sale_items', 'consignacoes', 'consignacao_items', 'payments', 'cashier_shifts', 'lastSaveTime']
      keys.forEach(key => localStorage.removeItem(key))
      console.log('🗑️ Todos os dados locais foram removidos')
      location.reload()
    },
    
        // Função para verificar dados do localStorage
        checkLocalStorageData: () => {
          console.log('🔍 [LocalDataManager] Verificando dados do localStorage...')
          
          const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]')
          const consignacaoItems = JSON.parse(localStorage.getItem('consignacao_items') || '[]')
          
          console.log('📊 Consignações no localStorage:', consignacoes.length)
          console.log('📦 Itens no localStorage:', consignacaoItems.length)
          
          if (consignacoes.length > 0) {
            console.log('📋 Consignações encontradas:')
            consignacoes.forEach((c: any) => {
              console.log(`  - ${c.codigo}: ${c.status}`)
            })
          }
          
          if (consignacaoItems.length > 0) {
            console.log('📦 Itens encontrados:')
            consignacaoItems.forEach((item: any) => {
              console.log(`  - ${item.id}: produto ${item.product_id}, comissão ${item.commission_percent}%`)
            })
          }
        },
        
        // Função para verificar comissões específicas de uma folha
        checkCommissionsForFolha: (folhaCodigo: string) => {
          console.log(`🔍 [LocalDataManager] Verificando comissões para folha ${folhaCodigo}...`)
          
          const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]')
          const consignacaoItems = JSON.parse(localStorage.getItem('consignacao_items') || '[]')
          
          const folha = consignacoes.find((c: any) => c.codigo === folhaCodigo)
          if (!folha) {
            console.log('❌ Folha não encontrada:', folhaCodigo)
            return
          }
          
          const itensFolha = consignacaoItems.filter((item: any) => item.consignacao_id === folha.id)
          console.log(`📦 Itens da folha ${folhaCodigo}:`, itensFolha.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            qty: item.qty,
            commission_percent: item.commission_percent
          })))
        },
    
    // Função para forçar recarregamento dos dados (limpar localStorage e recarregar)
    forceReloadData: async () => {
      try {
        console.log('🔄 [LocalDataManager] Forçando recarregamento dos dados...')
        
        // Limpar TODOS os dados do localStorage
        const keys = ['categories', 'brands', 'suppliers', 'products', 'clients', 'users', 'sales', 'sale_items', 'consignacoes', 'consignacao_items', 'payments', 'cashier_shifts', 'lastSaveTime']
        keys.forEach(key => localStorage.removeItem(key))
        console.log('🧹 [LocalDataManager] localStorage completamente limpo')
        
        // Recarregar página para forçar recarregamento dos dados
        console.log('🔄 [LocalDataManager] Recarregando página...')
        location.reload()
      } catch (error) {
        console.error('❌ [LocalDataManager] Erro ao forçar recarregamento:', error)
      }
    }
  }
  console.log('🔧 Debug disponível: window.debugLocalData')
  console.log('🔧 Use window.debugLocalData.checkSalesItems() para verificar vendas e itens')
}

// Flag para indicar que estamos em modo 100% local
export const USE_LOCAL_ONLY = true

// ✅ Logs desabilitados
// console.log('🔧 Sistema configurado para modo LOCAL APENAS')
// console.log('📊 Dados disponíveis:', localDataManager.getStats())
// console.log('🔌 Supabase DESCONECTADO - pronto para reconexão futura')
