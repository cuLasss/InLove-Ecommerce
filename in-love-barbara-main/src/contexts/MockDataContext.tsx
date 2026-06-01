// Sistema de gerenciamento de estado global para dados (local/Supabase)
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { universalDataAdapter } from '../lib/universal-data-adapter'
import type { Category, Product } from '../lib/local-only-data-manager'

interface MockDataContextType {
  categories: Category[]
  products: Product[]
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<void>
  updateCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>
  refreshData: () => Promise<void>
}

// Constantes
const CATEGORIES_STORAGE_KEY = 'lovable_categories_mock'
const PRODUCTS_STORAGE_KEY = 'lovable_products_mock'

// Categorias padrão
const defaultCategories: Category[] = [
  { id: 'c1e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e', name: 'Sutiãs', created_at: '2024-01-01T00:00:00Z' },
  { id: 'c2e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e', name: 'Calcinhas', created_at: '2024-01-01T00:00:00Z' },
  { id: 'c3e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e', name: 'Conjuntos', created_at: '2024-01-01T00:00:00Z' },
  { id: 'c4e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e', name: 'Pijamas', created_at: '2024-01-01T00:00:00Z' },
  { id: 'c5e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e', name: 'Bodies', created_at: '2024-01-01T00:00:00Z' },
]

// Funções utilitárias
const loadFromStorage = (key: string, defaultData: any[]) => {
  try {
    if (typeof window === 'undefined') return defaultData
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Erro ao carregar dados do localStorage:', error)
  }
  return defaultData
}

const saveToStorage = (key: string, data: any[]) => {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn('Erro ao salvar dados no localStorage:', error)
  }
}

// Context
const MockDataContext = createContext<MockDataContextType | undefined>(undefined)

// Provider
export function MockDataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // ✅ OTIMIZAÇÃO CRÍTICA: Usar React Query ao invés de carregar diretamente
  // Isso evita carregamento duplicado e aproveita o cache compartilhado
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await universalDataAdapter.getCategories()
      return response.data || []
    },
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    gcTime: 30 * 60 * 1000
  })

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await universalDataAdapter.getProducts()
      return response.data || []
    },
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    gcTime: 30 * 60 * 1000
  })

  // Sincronizar com estado local apenas quando necessário
  useEffect(() => {
    if (categoriesData) {
      setCategories(categoriesData)
      console.log(`✅ ${categoriesData.length} categorias carregadas`)
    }
  }, [categoriesData])

  useEffect(() => {
    if (productsData) {
      setProducts(productsData)
      console.log(`✅ ${productsData.length} produtos carregados`)
      console.log('🎉 Sistema inicializado com sucesso!')
    }
  }, [productsData])

  // localStorage desativado - dados são gerenciados pelo Supabase
  // useEffect(() => {
  //   saveToStorage(CATEGORIES_STORAGE_KEY, categories)
  // }, [categories])

  // useEffect(() => {
  //   saveToStorage(PRODUCTS_STORAGE_KEY, products)
  // }, [products])

  const addCategory = async (category: Omit<Category, 'id' | 'created_at'>) => {
    try {
      const response = await universalDataAdapter.createCategory(category.name, category.description)
      if (response.data) {
        setCategories(prev => [...prev, response.data!])
        console.log('✅ Categoria criada:', response.data)
      }
    } catch (error) {
      console.error('❌ Erro ao criar categoria:', error)
    }
  }

  const updateCategory = async (id: string, name: string) => {
    try {
      const response = await universalDataAdapter.updateCategory(id, { name })
      if (response.data) {
        setCategories(prev => prev.map(cat => 
          cat.id === id ? response.data! : cat
        ))
        console.log('✅ Categoria atualizada:', response.data)
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar categoria:', error)
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const response = await universalDataAdapter.deleteCategory(id)
      if (!response.error) {
        setCategories(prev => prev.filter(cat => cat.id !== id))
        console.log('✅ Categoria removida:', id)
      }
    } catch (error) {
      console.error('❌ Erro ao remover categoria:', error)
    }
  }

  const addProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
    try {
      const response = await universalDataAdapter.createProduct(product)
      if (response.data) {
        setProducts(prev => [...prev, response.data!])
        console.log('✅ Produto criado:', response.data)
      }
    } catch (error) {
      console.error('❌ Erro ao criar produto:', error)
    }
  }

  const refreshData = async () => {
    try {
      console.log('🔄 Atualizando dados do sistema local...')
      
      const [categoriesResponse, productsResponse] = await Promise.all([
        universalDataAdapter.getCategories(),
        universalDataAdapter.getProducts()
      ])

      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data)
      }

      if (productsResponse.data) {
        setProducts(productsResponse.data)
      }
      
      console.log('✅ Dados atualizados com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error)
    }
  }

  const value = {
    categories,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    refreshData
  }

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  )
}

// Hook personalizado
export const useMockData = () => {
  const context = useContext(MockDataContext)
  if (context === undefined) {
    throw new Error('useMockData deve ser usado dentro de MockDataProvider')
  }
  return context
}

// Funções legadas para compatibilidade com a API existente
let nextCategoryId = 6
let nextProductId = 1

const generateMockCategoryUUID = () => {
  return 'c' + nextCategoryId + 'e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e'
}

const generateMockProductUUID = () => {
  return 'p' + nextProductId + 'e90e1f-7c4b-4a5d-9b8e-2f3a4b5c6d7e'
}

// Instância global para ser usada pela API
let globalMockDataContext: MockDataContextType | null = null

export const setGlobalMockDataContext = (context: MockDataContextType) => {
  globalMockDataContext = context
}

// Funções para a API (compatibilidade)
export const createMockCategory = (name: string) => {
  const newCategory = {
    id: generateMockCategoryUUID(),
    name,
    created_at: new Date().toISOString()
  }
  nextCategoryId++
  
  // Se o contexto global estiver disponível, usar
  if (globalMockDataContext) {
    globalMockDataContext.addCategory(newCategory)
  }
  
  console.log('Categoria criada:', newCategory)
  return newCategory
}

export const updateMockCategory = (id: string, name: string) => {
  // Se o contexto global estiver disponível, usar
  if (globalMockDataContext) {
    globalMockDataContext.updateCategory(id, name)
  }
  
  // Retornar categoria atualizada
  const categories = loadFromStorage(CATEGORIES_STORAGE_KEY, defaultCategories)
  const updated = categories.find((cat: any) => cat.id === id)
  if (updated) {
    updated.name = name
    return updated
  }
  throw new Error('Categoria não encontrada')
}

export const deleteMockCategory = (id: string) => {
  // Se o contexto global estiver disponível, usar
  if (globalMockDataContext) {
    globalMockDataContext.deleteCategory(id)
  }
  
  console.log('Categoria removida:', id)
  return true
}

export const createMockProduct = (productData: any) => {
  const newProduct = {
    id: generateMockProductUUID(),
    name: productData.name,
    brand: productData.brand,
    size: productData.size,
    category_id: productData.category_id,
    price_cents: productData.price_cents,
    cost_price_cents: productData.cost_price_cents,
    stock: productData.stock || 0,
    stock_min: productData.stock_min || 0,
    stock_consigned: 0,
    short_code: productData.short_code,
    qr_code: productData.qr_code,
    description: productData.description,
    created_at: new Date().toISOString()
  }
  nextProductId++
  
  // Se o contexto global estiver disponível, usar
  if (globalMockDataContext) {
    globalMockDataContext.addProduct(newProduct)
  }
  
  console.log('Produto criado:', newProduct)
  return newProduct
}

// Exportações para compatibilidade
export const mockCategories = loadFromStorage(CATEGORIES_STORAGE_KEY, defaultCategories)
export const mockProducts = loadFromStorage(PRODUCTS_STORAGE_KEY, [])