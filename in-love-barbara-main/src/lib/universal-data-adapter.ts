/**
 * Adaptador Universal de Dados
 * Alterna automaticamente entre dados locais e Supabase
 * Preparado para reconexão futura
 */

import { DATABASE_CONFIG, isLocalMode } from '../config/database'
import { localDataManager } from './local-only-data-manager'
import { supabaseClientsAdapter } from './supabase-clients-adapter'
import { supabaseCollaboratorsAdapter } from './supabase-collaborators-adapter'
import { supabaseSalesAdapter } from './supabase-sales-adapter'
import { supabaseProductsAdapter } from './supabase-products-adapter'
import { supabaseAdmin } from '@/integrations/supabase/client-with-auth'
import type { 
  Category, 
  Brand,
  Supplier,
  Product, 
  Client, 
  User, 
  Sale, 
  SaleItem, 
  Consignacao, 
  ConsignacaoItem, 
  Payment
} from './local-only-data-manager'

// Tipos de resposta padronizados
interface DataResponse<T> {
  data: T | null
  error: Error | null
}

interface DataListResponse<T> {
  data: T[] | null
  error: Error | null
}

// Classe adaptadora universal
class UniversalDataAdapter {
  constructor() {
    // console.log(`🔄 Adaptador Universal inicializado - Modo: ${DATABASE_CONFIG.mode.toUpperCase()}`) // ✅ Logs desabilitados
  }

  // MÉTODOS PARA CATEGORIAS
  async getCategories(): Promise<DataListResponse<Category>> {
    if (isLocalMode()) {
      return await localDataManager.getCategories()
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getCategories()
  }

  async getCategoryById(id: string): Promise<DataResponse<Category>> {
    if (isLocalMode()) {
      return await localDataManager.getCategoryById(id)
    }
    
    // Modo Supabase - implementar busca por ID
    const { data: categories, error } = await supabaseProductsAdapter.getCategories()
    if (error) return { data: null, error }
    
    const category = categories?.find(c => c.id === id)
    return { data: category || null, error: null }
  }

  async createCategory(name: string, description?: string): Promise<DataResponse<Category>> {
    if (isLocalMode()) {
      return await localDataManager.createCategory(name, description)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.createCategory(name, description)
  }

  async updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<DataResponse<Category>> {
    if (isLocalMode()) {
      return await localDataManager.updateCategory(id, updates)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateCategory(id, updates)
  }

  async deleteCategory(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteCategory(id)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.deleteCategory(id)
  }

  // MÉTODOS PARA MARCAS
  async getBrands(): Promise<DataListResponse<Brand>> {
    if (isLocalMode()) {
      return await localDataManager.getBrands()
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getBrands()
  }

  async getBrandById(id: string): Promise<DataResponse<Brand>> {
    if (isLocalMode()) {
      return await localDataManager.getBrandById(id)
    }
    
    // Modo Supabase - implementar busca por ID
    const { data: brands, error } = await supabaseProductsAdapter.getBrands()
    if (error) return { data: null, error }
    
    const brand = brands?.find(b => b.id === id)
    return { data: brand || null, error: null }
  }

  async createBrand(name: string): Promise<DataResponse<Brand>> {
    if (isLocalMode()) {
      return await localDataManager.createBrand(name)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.createBrand(name)
  }

  async updateBrand(id: string, name: string): Promise<DataResponse<Brand>> {
    if (isLocalMode()) {
      return await localDataManager.updateBrand(id, name)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateBrand(id, name)
  }

  async deleteBrand(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteBrand(id)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.deleteBrand(id)
  }

  // MÉTODOS PARA FORNECEDORES
  async getSuppliers(): Promise<DataListResponse<Supplier>> {
    if (isLocalMode()) {
      return await localDataManager.getSuppliers()
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getSuppliers()
  }

  async createSupplier(supplierData: { name: string; whatsapp?: string }): Promise<DataResponse<Supplier>> {
    if (isLocalMode()) {
      return await localDataManager.createSupplier(supplierData)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.createSupplier(supplierData)
  }

  async updateSupplier(id: string, supplierData: { name: string; whatsapp?: string }): Promise<DataResponse<Supplier>> {
    if (isLocalMode()) {
      return await localDataManager.updateSupplier(id, supplierData)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateSupplier(id, supplierData)
  }

  async deleteSupplier(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteSupplier(id)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.deleteSupplier(id)
  }

  // MÉTODOS PARA PRODUTOS
  async getProducts(): Promise<DataListResponse<Product>> {
    if (isLocalMode()) {
      return await localDataManager.getProducts()
    }
    
    // Modo Supabase - usar método otimizado
    return await supabaseProductsAdapter.getProducts()
  }

  async getProductsWithRelations(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.getProductsWithRelations()
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getProductsWithRelations()
  }

  /**
   * Busca a imagem de um produto específico (carregamento sob demanda)
   */
  async getProductImage(productId: string): Promise<{ data: string | null, error: Error | null }> {
    console.log('🔧 [UniversalDataAdapter] Modo atual:', isLocalMode() ? 'LOCAL' : 'SUPABASE')
    
    if (isLocalMode()) {
      console.log('⚠️ [UniversalDataAdapter] Modo local - retornando null para imagem')
      // No modo local, retornar null (sem imagens)
      return { data: null, error: null }
    }
    
    console.log('☁️ [UniversalDataAdapter] Modo Supabase - buscando imagem...')
    // Modo Supabase - buscar imagem do banco
    const result = await supabaseProductsAdapter.getProductImage(productId)
    return result
  }

  async getProductsByCategory(categoryId: string): Promise<DataListResponse<Product>> {
    if (isLocalMode()) {
      return await localDataManager.getProductsByCategory(categoryId)
    }
    
    // Modo Supabase - implementar busca de produtos por categoria
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', categoryId)
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar produtos por categoria:', error)
        return { data: [], error: new Error(`Erro ao buscar produtos por categoria: ${error.message}`) }
      }

      const products = data || []
      console.log(`✅ [UniversalDataAdapter] ${products.length} produtos da categoria ${categoryId} carregados do Supabase`)
      
      return { data: products, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar produtos por categoria:', error)
      return { data: [], error: error as Error }
    }
  }

  async searchProducts(query: string): Promise<DataListResponse<Product>> {
    if (isLocalMode()) {
      return await localDataManager.searchProducts(query)
    }
    
    // Modo Supabase - implementar busca de produtos
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar produtos:', error)
        return { data: [], error: new Error(`Erro ao buscar produtos: ${error.message}`) }
      }

      const products = data || []
      console.log(`✅ [UniversalDataAdapter] ${products.length} produtos encontrados para "${query}" no Supabase`)
      
      return { data: products, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar produtos:', error)
      return { data: [], error: error as Error }
    }
  }

  async createProduct(productData: Omit<Product, 'id' | 'created_at'>): Promise<DataResponse<Product>> {
    if (isLocalMode()) {
      return await localDataManager.createProduct(productData)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.createProduct(productData)
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<DataResponse<Product>> {
    if (isLocalMode()) {
      return await localDataManager.updateProduct(id, updates)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateProduct(id, updates)
  }

  async deleteProduct(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteProduct(id)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.deleteProduct(id)
  }

  async deleteProductCascade(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      // Em modo local, apenas deletar normalmente
      return await localDataManager.deleteProduct(id)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.deleteProductCascade(id)
  }

  // MÉTODOS PARA CLIENTES
  async getClients(): Promise<DataListResponse<Client>> {
    if (isLocalMode()) {
      return await localDataManager.getClients()
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.getClients()
  }

  async getClientById(id: string): Promise<DataResponse<Client>> {
    if (isLocalMode()) {
      return await localDataManager.getClientById(id)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.getClientById(id)
  }

  async searchClients(query: string): Promise<DataListResponse<Client>> {
    if (isLocalMode()) {
      return await localDataManager.searchClients(query)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.searchClients(query)
  }

  async getClientsByType(type: string): Promise<DataListResponse<Client>> {
    if (isLocalMode()) {
      return await localDataManager.getClientsByType(type)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.getClientsByType(type)
  }

  async createClient(clientData: Omit<Client, 'id' | 'created_at'>): Promise<DataResponse<Client>> {
    if (isLocalMode()) {
      return await localDataManager.createClient(clientData)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.createClient(clientData)
  }

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'created_at'>>): Promise<DataResponse<Client>> {
    if (isLocalMode()) {
      return await localDataManager.updateClient(id, updates)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.updateClient(id, updates)
  }

  async deleteClient(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteClient(id)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.deleteClient(id)
  }

  async deleteClients(ids: string[]): Promise<{ data: { deleted: number; failed: number } | null; error: Error | null }> {
    if (isLocalMode()) {
      // Para dados locais, vamos implementar um método simples
      let deleted = 0
      let failed = 0
      
      for (const id of ids) {
        try {
          const { error } = await localDataManager.deleteClient(id)
          if (error) {
            failed++
          } else {
            deleted++
          }
        } catch (err) {
          failed++
        }
      }
      
      return { data: { deleted, failed }, error: null }
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseClientsAdapter.deleteClients(ids)
  }

  // MÉTODOS PARA COLABORADORES
  async getCollaborators(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.getUsers()
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseCollaboratorsAdapter.getCollaborators()
  }

  async getCollaboratorById(id: string): Promise<DataResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.getUserById(id)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseCollaboratorsAdapter.getCollaboratorById(id)
  }

  async createCollaborator(collaboratorData: any): Promise<DataResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.createUser(collaboratorData)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseCollaboratorsAdapter.createCollaborator(collaboratorData)
  }

  async updateCollaborator(id: string, updates: any): Promise<DataResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.updateUser(id, updates)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseCollaboratorsAdapter.updateCollaborator(id, updates)
  }

  async deleteCollaborator(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteUser(id)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseCollaboratorsAdapter.deleteCollaborator(id)
  }

  async deleteCollaborators(ids: string[]): Promise<{ data: { deleted: number; failed: number } | null; error: Error | null }> {
    if (isLocalMode()) {
      // Para dados locais, vamos implementar um método simples
      let deleted = 0
      let failed = 0
      
      for (const id of ids) {
        try {
          const { error } = await localDataManager.deleteUser(id)
          if (error) {
            failed++
          } else {
            deleted++
          }
        } catch (err) {
          failed++
        }
      }
      
      return { data: { deleted, failed }, error: null }
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseCollaboratorsAdapter.deleteCollaborators(ids)
  }

  // MÉTODOS PARA BLACKLIST
  async getBlacklist(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.getBlacklist()
    }
    
    // Modo Supabase - implementar busca de blacklist
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar blacklist:', error)
        return { data: [], error: new Error(`Erro ao buscar blacklist: ${error.message}`) }
      }

      const blacklist = data || []
      console.log(`✅ [UniversalDataAdapter] ${blacklist.length} entradas da blacklist carregadas do Supabase`)
      
      return { data: blacklist, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar blacklist:', error)
      return { data: [], error: error as Error }
    }
  }

  async getBlacklistByType(clientType: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.getBlacklistByType(clientType)
    }
    
    // Modo Supabase - implementar busca de blacklist por tipo
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .eq('client_type', clientType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar blacklist por tipo:', error)
        return { data: [], error: new Error(`Erro ao buscar blacklist por tipo: ${error.message}`) }
      }

      const blacklist = data || []
      console.log(`✅ [UniversalDataAdapter] ${blacklist.length} entradas da blacklist do tipo "${clientType}" carregadas do Supabase`)
      
      return { data: blacklist, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar blacklist por tipo:', error)
      return { data: [], error: error as Error }
    }
  }

  async addToBlacklist(blacklistData: {
    client_id: string;
    client_name: string;
    client_type: 'CONSIGNADO' | 'ATACADO' | 'VAREJO';
    reason: string;
    days_blocked: number;
  }): Promise<DataResponse<any>> {
    if (isLocalMode()) {
      return await localDataManager.addToBlacklist(blacklistData)
    }
    
    // Modo Supabase - implementar adição à blacklist
    try {
      const supabase = supabaseAdmin
      
      // Verificar se o cliente já está bloqueado no mesmo tipo
      const now = new Date()
      const { data: existingEntries, error: checkError } = await supabase
        .from('blacklist')
        .select('id, blocked_until')
        .eq('client_id', blacklistData.client_id)
        .eq('client_type', blacklistData.client_type)
        .eq('is_active', true)
      
      if (checkError) {
        console.error('❌ [UniversalDataAdapter] Erro ao verificar blacklist existente:', checkError)
        return { data: null, error: new Error(`Erro ao verificar blacklist: ${checkError.message}`) }
      }
      
      // Verificar se há bloqueios ativos (não expirados)
      const hasActiveBlock = existingEntries?.some(entry => {
        const blockedUntil = new Date(entry.blocked_until)
        return now <= blockedUntil
      })
      
      if (hasActiveBlock) {
        console.warn(`⚠️ [UniversalDataAdapter] Cliente ${blacklistData.client_name} já está bloqueado no tipo ${blacklistData.client_type}`)
        return { 
          data: null, 
          error: new Error(`Este cliente já está bloqueado no ${blacklistData.client_type}. Desbloqueie-o primeiro antes de criar um novo bloqueio.`) 
        }
      }
      
      const blockedUntil = new Date()
      blockedUntil.setDate(blockedUntil.getDate() + blacklistData.days_blocked)
      
      const { data, error } = await supabase
        .from('blacklist')
        .insert({
          client_id: blacklistData.client_id,
          client_name: blacklistData.client_name,
          client_type: blacklistData.client_type,
          reason: blacklistData.reason,
          blocked_at: new Date().toISOString(),
          blocked_until: blockedUntil.toISOString(),
          is_active: true,
          created_by: 'system', // TODO: Usar ID do usuário logado
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao adicionar à blacklist:', error)
        return { data: null, error: new Error(`Erro ao adicionar à blacklist: ${error.message}`) }
      }

      console.log(`✅ [UniversalDataAdapter] Cliente adicionado à blacklist: ${blacklistData.client_name}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao adicionar à blacklist:', error)
      return { data: null, error: error as Error }
    }
  }

  async removeFromBlacklist(clientId: string, clientType?: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.removeFromBlacklist(clientId, clientType)
    }
    
    // Modo Supabase - desbloquear cliente
    try {
      const supabase = supabaseAdmin
      
      console.log(`🔄 [UniversalDataAdapter] Desbloqueando cliente: ${clientId}${clientType ? ` (tipo: ${clientType})` : ''}`)
      
      // Construir query para desativar bloqueios
      let query = supabase
        .from('blacklist')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .eq('is_active', true)
      
      // Se especificou o tipo, filtrar apenas bloqueios desse tipo
      if (clientType) {
        query = query.eq('client_type', clientType)
      }
      
      const { data, error } = await query.select()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao desbloquear cliente:', error)
        return { error: new Error(`Erro ao desbloquear cliente: ${error.message}`) }
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ [UniversalDataAdapter] Cliente não estava bloqueado ou não foi encontrado:', clientId)
        return { error: null } // Não é erro, cliente já estava desbloqueado
      }

      console.log(`✅ [UniversalDataAdapter] Cliente desbloqueado com sucesso: ${clientId} (${data.length} bloqueio(s) removido(s))`)
      return { error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao desbloquear cliente:', error)
      return { error: error as Error }
    }
  }

  async checkClientBlacklist(clientId: string, clientType?: 'CONSIGNADO' | 'ATACADO' | 'VAREJO'): Promise<DataResponse<boolean>> {
    // Validar se o clientId é válido
    if (!clientId || clientId.trim() === '' || clientId === 'none') {
      console.log('⚠️ [UniversalDataAdapter] ClientId inválido ou vazio, retornando false')
      return { data: false, error: null }
    }

    if (isLocalMode()) {
      return await localDataManager.checkClientBlacklist(clientId, clientType)
    }
    
    // Modo Supabase - implementar verificação de blacklist
    try {
      const supabase = supabaseAdmin
      
      let query = supabase
        .from('blacklist')
        .select('id, blocked_until')
        .eq('client_id', clientId)
        .eq('is_active', true)
      
      if (clientType) {
        query = query.eq('client_type', clientType)
      }
      
      const { data, error } = await query

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao verificar blacklist:', error)
        return { data: false, error: new Error(`Erro ao verificar blacklist: ${error.message}`) }
      }

      // Verificar se há bloqueios ativos (não expirados)
      const now = new Date()
      const hasActiveBlock = data?.some(entry => {
        const blockedUntil = new Date(entry.blocked_until)
        return blockedUntil > now
      }) || false

      return { data: hasActiveBlock, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao verificar blacklist:', error)
      return { data: false, error: error as Error }
    }
  }

  // MÉTODOS PARA USUÁRIOS
  async getUsers(): Promise<DataListResponse<User>> {
    if (isLocalMode()) {
      return await localDataManager.getUsers()
    }
    
    // ✅ CORREÇÃO: Usar getAppUsers() para buscar da tabela app_users correta
    return await this.getAppUsers()
  }

  // Método específico para buscar usuários da tabela app_users (para vendas)
  async getAppUsers(): Promise<DataListResponse<User>> {
    if (isLocalMode()) {
      return await localDataManager.getUsers()
    }
    
    // Usar Supabase quando não estiver em modo local
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar usuários app_users:', error)
        return { data: [], error: new Error(`Erro ao buscar usuários app_users: ${error.message}`) }
      }
      
      const users = (data || []).map(user => ({
        id: user.id,
        name: user.name,
        role: user.role || 'COLAB',
        whatsapp: user.whatsapp,
        created_at: user.created_at
      })) as User[]
      
      console.log(`✅ [UniversalDataAdapter] ${users.length} usuários app_users carregados do Supabase`)
      
      return { data: users, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar usuários app_users:', error)
      return { data: [], error }
    }
  }

  async getUserById(id: string): Promise<DataResponse<User>> {
    if (isLocalMode()) {
      return await localDataManager.getUserById(id)
    }
    
    // Usar Supabase quando não estiver em modo local
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single()
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar usuário app_users por ID:', error)
        return { data: null, error: new Error(`Erro ao buscar usuário app_users por ID: ${error.message}`) }
      }
      
      if (!data) {
        return { data: null, error: new Error('Usuário não encontrado') }
      }
      
      const user = {
        id: data.id,
        name: data.name,
        role: data.role || 'COLAB',
        whatsapp: data.whatsapp,
        created_at: data.created_at
      } as User
      
      console.log(`✅ [UniversalDataAdapter] Usuário app_users encontrado: ${user.name} (${user.id})`)
      
      return { data: user, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar usuário app_users por ID:', error)
      return { data: null, error }
    }
  }

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<DataResponse<User>> {
    if (isLocalMode()) {
      return await localDataManager.createUser(userData)
    }
    
    // Modo Supabase - implementar criação de usuário
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          name: userData.name,
          role: userData.role || 'COLAB',
          whatsapp: userData.whatsapp,
          email: userData.email,
          active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao criar usuário:', error)
        return { data: null, error: new Error(`Erro ao criar usuário: ${error.message}`) }
      }

      console.log(`✅ [UniversalDataAdapter] Usuário criado: ${userData.name}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao criar usuário:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'created_at'>>): Promise<DataResponse<User>> {
    if (isLocalMode()) {
      return await localDataManager.updateUser(id, userData)
    }
    
    // Modo Supabase - implementar atualização de usuário
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('app_users')
        .update({
          name: userData.name,
          role: userData.role,
          whatsapp: userData.whatsapp,
          email: userData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao atualizar usuário:', error)
        return { data: null, error: new Error(`Erro ao atualizar usuário: ${error.message}`) }
      }

      console.log(`✅ [UniversalDataAdapter] Usuário atualizado: ${id}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao atualizar usuário:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteUser(id: string): Promise<DataResponse<boolean>> {
    if (isLocalMode()) {
      return await localDataManager.deleteUser(id)
    }
    
    // Modo Supabase - implementar exclusão de usuário
    try {
      const supabase = supabaseAdmin
      
      const { error } = await supabase
        .from('app_users')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao deletar usuário:', error)
        return { data: false, error: new Error(`Erro ao deletar usuário: ${error.message}`) }
      }

      console.log(`✅ [UniversalDataAdapter] Usuário deletado: ${id}`)
      return { data: true, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao deletar usuário:', error)
      return { data: false, error: error as Error }
    }
  }

  // MÉTODOS PARA VENDAS
  async getSales(): Promise<DataListResponse<Sale>> {
    if (isLocalMode()) {
      return await localDataManager.getSales()
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.getSales()
  }

  async getSalesByChannel(channel: 'VAREJO' | 'ATACADO'): Promise<DataListResponse<Sale>> {
    if (isLocalMode()) {
      const { data: allSales, error } = await localDataManager.getSales()
      if (error) return { data: [], error }
      
      const filteredSales = allSales?.filter(sale => sale.channel === channel) || []
      return { data: filteredSales, error: null }
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.getSalesByChannel(channel)
  }

  async getSaleById(id: string): Promise<DataResponse<Sale>> {
    if (isLocalMode()) {
      return await localDataManager.getSaleById(id)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.getSaleById(id)
  }

  // MÉTODO PARA MAPEAR COLABORADOR PARA USUÁRIO DO SISTEMA
  async mapCollaboratorToAppUser(collaboratorId: string | null): Promise<string | null> {
    if (!collaboratorId) return null;
    
    try {
      
      // Buscar colaborador pelo ID na tabela collaborators
      const { data: collaborator, error: collaboratorError } = await supabaseAdmin
        .from('collaborators')
        .select('id, name')
        .eq('id', collaboratorId)
        .eq('active', true)
        .single();
      
      if (collaboratorError || !collaborator) {
        console.warn(`⚠️ [UniversalDataAdapter] Colaborador ${collaboratorId} não encontrado na tabela collaborators`);
        return null;
      }
      
      
      // Buscar usuário correspondente pelo nome na tabela app_users
      const { data: appUser, error: appUserError } = await supabaseAdmin
        .from('app_users')
        .select('id, name')
        .eq('name', collaborator.name)
        .eq('active', true)
        .single();
      
      if (appUserError || !appUser) {
        console.warn(`⚠️ [UniversalDataAdapter] Usuário ${collaborator.name} não encontrado em app_users`);
        return null;
      }
      
      console.log(`✅ [UniversalDataAdapter] Mapeamento: ${collaborator.name} (${collaboratorId}) → ${appUser.id}`);
      return appUser.id;
      
    } catch (error) {
      console.error(`❌ [UniversalDataAdapter] Erro ao mapear collaborator_id ${collaboratorId}:`, error);
      return null;
    }
  }

  async createSale(saleData: Omit<Sale, 'id' | 'created_at'>): Promise<DataResponse<Sale>> {
    if (isLocalMode()) {
      return await localDataManager.createSale(saleData)
    }
    
    // ✅ CORREÇÃO: Mapear collaborator_id para app_user_id antes de criar a venda
    let mappedSaleData = { ...saleData };
    
    // Se user_id parece ser um ID de colaborador (não de app_user), mapear
    if (saleData.user_id) {
      // Verificar se é um ID de colaborador consultando a tabela collaborators
      const { data: collaborator } = await supabaseAdmin
        .from('collaborators')
        .select('id')
        .eq('id', saleData.user_id)
        .eq('active', true)
        .single();
      
      if (collaborator) {
        // É um ID de colaborador, mapear para app_user
        const appUserId = await this.mapCollaboratorToAppUser(saleData.user_id);
        mappedSaleData.user_id = appUserId;
        console.log(`🔄 [UniversalDataAdapter] Mapeado collaborator_id ${saleData.user_id} → app_user_id ${appUserId}`);
      }
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.createSale(mappedSaleData)
  }

  async updateSale(id: string, updates: Partial<Omit<Sale, 'id' | 'created_at'>>): Promise<DataResponse<Sale>> {
    if (isLocalMode()) {
      return await localDataManager.updateSale(id, updates)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.updateSale(id, updates)
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
    is_pending_payment?: boolean;
    allow_partial_payment?: boolean;
  }): Promise<DataResponse<{ sale_id: string; total_cents: number; items_count: number; payments_count: number }>> {
    if (isLocalMode()) {
      return await localDataManager.completeRetailSale(saleData)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.completeRetailSale(saleData)
  }

  // MÉTODOS PARA DEVOLUÇÕES
  async createDevolucao(devolucaoData: {
    sale_id: string;
    product_id: string;
    qty: number;
    motivo?: string;
    created_by?: string;
  }): Promise<DataResponse<{ devolucao_id: string; qty: number; product_id: string }>> {
    if (isLocalMode()) {
      // Em modo local, simular devolução
      return { data: { devolucao_id: 'local-' + Date.now(), qty: devolucaoData.qty, product_id: devolucaoData.product_id }, error: null }
    }
    
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('devolucoes')
        .insert({
          sale_id: devolucaoData.sale_id,
          product_id: devolucaoData.product_id,
          qty: devolucaoData.qty,
          motivo: devolucaoData.motivo || null,
          created_by: devolucaoData.created_by || null
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao criar devolução:', error)
        return { data: null, error: new Error(`Erro ao criar devolução: ${error.message}`) }
      }
      
      console.log(`✅ [UniversalDataAdapter] Devolução criada: ${data.qty} unidades do produto ${devolucaoData.product_id}`)
      
      return { 
        data: { 
          devolucao_id: data.id, 
          qty: data.qty, 
          product_id: data.product_id 
        }, 
        error: null 
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao criar devolução:', error)
      return { data: null, error }
    }
  }

  async getDevolucoesBySaleId(saleId: string): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      return { data: [], error: null }
    }
    
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('devolucoes')
        .select(`
          *,
          products:product_id (
            id,
            name,
            short_code
          )
        `)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar devoluções:', error)
        return { data: [], error: new Error(`Erro ao buscar devoluções: ${error.message}`) }
      }
      
      return { data: data || [], error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar devoluções:', error)
      return { data: [], error }
    }
  }

  // ✅ NOVA FUNÇÃO: Processar devolução completa de uma venda (retorna estoque)
  async processarDevolucaoCompleta(saleId: string, motivo?: string): Promise<DataResponse<any>> {
    if (isLocalMode()) {
      // Modo local - simular devolução
      console.log('🔄 [UniversalDataAdapter] Simulando devolução completa em modo local:', saleId)
      return { data: { success: true, sale_id: saleId, items_devolvidos: 0 }, error: null }
    }
    
    try {
      const supabase = supabaseAdmin
      
      console.log('🔄 [UniversalDataAdapter] Processando devolução completa:', { saleId, motivo })
      
      // Chamar função específica do banco para devolução completa
      const { data, error } = await supabase.rpc('fn_processar_devolucao_completa', {
        p_sale_id: saleId,
        p_motivo: motivo || 'Devolução completa da venda'
      })
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao processar devolução completa:', error)
        return { data: null, error: new Error(`Erro ao processar devolução: ${error.message}`) }
      }
      
      console.log('✅ [UniversalDataAdapter] Devolução completa processada:', data)
      
      return { data, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao processar devolução:', error)
      return { data: null, error: error as Error }
    }
  }

  // MÉTODOS PARA EXCLUSÃO DE VENDAS
  async deleteSale(saleId: string): Promise<DataResponse<boolean>> {
    if (isLocalMode()) {
      return await localDataManager.deleteSale(saleId)
    }
    
    // Usar Supabase quando não estiver em modo local
    const { error } = await supabaseSalesAdapter.deleteSale(saleId)
    return { data: !error, error }
  }

  // ADICIONAR PAGAMENTO A VENDA EXISTENTE
  async addPaymentToSale(saleId: string, paymentData: {
    method: string;
    amount_cents: number;
  }): Promise<DataResponse<{ payment_id: string; amount_cents: number; method: string }>> {
    if (isLocalMode()) {
      return await localDataManager.addPaymentToSale(saleId, paymentData)
    }
    
    // Usar Supabase quando não estiver em modo local
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          sale_id: saleId,
          method: paymentData.method,
          amount_cents: paymentData.amount_cents,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao adicionar pagamento à venda:', error)
        return { data: null, error: new Error(`Erro ao adicionar pagamento à venda: ${error.message}`) }
      }
      
      const result = {
        payment_id: data.id,
        amount_cents: data.amount_cents,
        method: data.method
      }
      
      console.log(`✅ [UniversalDataAdapter] Pagamento adicionado à venda: ${result.method} - R$ ${(result.amount_cents / 100).toFixed(2)}`)
      
      // ✅ NOVA FUNCIONALIDADE: Verificar se a venda deve ser finalizada automaticamente
      await this.checkAndFinalizeSaleIfPaid(saleId)
      
      // ✅ NOVA FUNCIONALIDADE: Invalidar cache do React Query para atualizar dados
      try {
        const { queryClient } = await import('@tanstack/react-query')
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['atacado-sales'] })
          console.log('🔄 [UniversalDataAdapter] Cache invalidado para atualizar dados da venda')
        }
      } catch (error) {
        console.warn('⚠️ [UniversalDataAdapter] Não foi possível invalidar cache:', error)
      }
      
      return { data: result, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao adicionar pagamento à venda:', error)
      return { data: null, error }
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Verificar e finalizar venda automaticamente se totalmente paga
  async checkAndFinalizeSaleIfPaid(saleId: string): Promise<void> {
    try {
      const supabase = supabaseAdmin
      
      // Buscar dados da venda
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('id, total_cents, status, channel')
        .eq('id', saleId)
        .single()
      
      if (saleError || !sale) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar venda para verificação:', saleError)
        return
      }
      
      // Só verificar vendas que ainda não foram finalizadas
      if (sale.status === 'FECHADA') {
        console.log(`✅ [UniversalDataAdapter] Venda ${saleId.slice(-8)} já está finalizada`)
        return
      }
      
      // Buscar total de pagamentos da venda
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount_cents')
        .eq('sale_id', saleId)
      
      if (paymentsError) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar pagamentos:', paymentsError)
        return
      }
      
      const totalPaid = payments.reduce((sum, p) => sum + p.amount_cents, 0)
      const isFullyPaid = totalPaid >= sale.total_cents
      
      console.log(`🔍 [UniversalDataAdapter] Verificação de pagamento - Venda ${saleId.slice(-8)}:`, {
        total_cents: sale.total_cents,
        total_paid: totalPaid,
        is_fully_paid: isFullyPaid,
        status: sale.status,
        channel: sale.channel
      })
      
      // Se a venda está totalmente paga, finalizar automaticamente
      if (isFullyPaid && sale.status === 'RASCUNHO') {
        console.log(`🎉 [UniversalDataAdapter] Venda ${saleId.slice(-8)} totalmente paga! Finalizando automaticamente...`)
        
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            status: 'FECHADA',
            closed_at: new Date().toISOString()
          })
          .eq('id', saleId)
        
        if (updateError) {
          console.error('❌ [UniversalDataAdapter] Erro ao finalizar venda automaticamente:', updateError)
        } else {
          console.log(`✅ [UniversalDataAdapter] Venda ${saleId.slice(-8)} finalizada automaticamente!`)
        }
      } else if (totalPaid > 0) {
        console.log(`💰 [UniversalDataAdapter] Venda ${saleId.slice(-8)} com pagamento parcial: R$ ${(totalPaid / 100).toFixed(2)} de R$ ${(sale.total_cents / 100).toFixed(2)}`)
      }
      
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao verificar finalização automática:', error)
    }
  }

  async deleteSales(saleIds: string[]): Promise<DataResponse<{ deleted: number; failed: number }>> {
    if (isLocalMode()) {
      return await localDataManager.deleteSales(saleIds)
    }
    
    // Modo Supabase - implementar exclusão em massa de vendas
    try {
      const supabase = supabaseAdmin
      
      let deleted = 0
      let failed = 0
      
      // Deletar vendas uma por vez para ter controle individual
      for (const saleId of saleIds) {
        try {
          // Primeiro deletar itens da venda
          const { error: itemsError } = await supabase
            .from('sale_items')
            .delete()
            .eq('sale_id', saleId)
          
          if (itemsError) {
            console.error(`❌ [UniversalDataAdapter] Erro ao deletar itens da venda ${saleId}:`, itemsError)
            failed++
            continue
          }
          
          // Depois deletar pagamentos da venda
          const { error: paymentsError } = await supabase
            .from('payments')
            .delete()
            .eq('sale_id', saleId)
          
          if (paymentsError) {
            console.error(`❌ [UniversalDataAdapter] Erro ao deletar pagamentos da venda ${saleId}:`, paymentsError)
            failed++
            continue
          }
          
          // Por último deletar a venda
          const { error } = await supabase
            .from('sales')
            .delete()
            .eq('id', saleId)
          
          if (error) {
            console.error(`❌ [UniversalDataAdapter] Erro ao deletar venda ${saleId}:`, error)
            failed++
          } else {
            deleted++
            console.log(`✅ [UniversalDataAdapter] Venda ${saleId} deletada com sucesso`)
          }
        } catch (err) {
          console.error(`❌ [UniversalDataAdapter] Erro inesperado ao deletar venda ${saleId}:`, err)
          failed++
        }
      }
      
      console.log(`✅ [UniversalDataAdapter] Exclusão em massa concluída: ${deleted} vendas deletadas, ${failed} falharam`)
      return { data: { deleted, failed }, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado na exclusão em massa:', error)
      return { data: { deleted: 0, failed: saleIds.length }, error: error as Error }
    }
  }

  // MÉTODOS PARA ITENS DE VENDA
  async getSaleItems(saleId: string): Promise<DataListResponse<SaleItem>> {
    if (isLocalMode()) {
      return await localDataManager.getSaleItems(saleId)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.getSaleItems(saleId)
  }

  // ✅ OTIMIZAÇÃO EGRESS: Selecionar apenas colunas necessárias
  async getAllSaleItems(): Promise<DataListResponse<SaleItem>> {
    if (isLocalMode()) {
      return await localDataManager.getAllSaleItems()
    }
    
    // Modo Supabase - implementar busca de todos os itens de venda
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('sale_items')
        .select('id, sale_id, product_id, qty, unit_price_cents, discount_percent, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar itens de venda:', error)
        return { data: [], error: new Error(`Erro ao buscar itens de venda: ${error.message}`) }
      }

      const items = (data || []) as SaleItem[]
      console.log(`✅ [UniversalDataAdapter] ${items.length} itens de venda carregados do Supabase`)
      
      return { data: items, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar itens de venda:', error)
      return { data: [], error: error as Error }
    }
  }

  async createSaleItem(itemData: Omit<SaleItem, 'id' | 'created_at'>): Promise<DataResponse<SaleItem>> {
    if (isLocalMode()) {
      return await localDataManager.createSaleItem(itemData)
    }
    
    // Modo Supabase - implementar criação de item de venda
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('sale_items')
        .insert({
          sale_id: itemData.sale_id,
          product_id: itemData.product_id,
          qty: itemData.qty,
          unit_price_cents: itemData.unit_price_cents,
          discount_percent: itemData.discount_percent || 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao criar item de venda:', error)
        return { data: null, error: new Error(`Erro ao criar item de venda: ${error.message}`) }
      }

      console.log(`✅ [UniversalDataAdapter] Item de venda criado: ${data.id}`)
      return { data, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao criar item de venda:', error)
      return { data: null, error: error as Error }
    }
  }

  // MÉTODOS PARA CONSIGNAÇÕES
  async getConsignacoes(): Promise<DataListResponse<Consignacao>> {
    if (isLocalMode()) {
      return await localDataManager.getConsignacoes()
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getConsignacoes()
  }

  async getConsignacaoById(id: string): Promise<DataResponse<Consignacao>> {
    if (isLocalMode()) {
      return await localDataManager.getConsignacaoById(id)
    }
    
    // Modo Supabase - implementar busca por ID
    const { data: consignacoes, error } = await supabaseProductsAdapter.getConsignacoes()
    if (error) return { data: null, error }
    
    const consignacao = consignacoes?.find(c => c.id === id)
    return { data: consignacao || null, error: null }
  }

  async createConsignacao(consignacaoData: Omit<Consignacao, 'id' | 'created_at' | 'updated_at'>): Promise<DataResponse<Consignacao>> {
    if (isLocalMode()) {
      return await localDataManager.createConsignacao(consignacaoData)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.createConsignacao(consignacaoData)
  }

  async updateConsignacao(id: string, updates: Partial<Consignacao>): Promise<DataResponse<Consignacao>> {
    if (isLocalMode()) {
      return await localDataManager.updateConsignacao(id, updates)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateConsignacao(id, updates)
  }

  async reducePhysicalStockForConsignment(consignacaoId: string): Promise<DataResponse<boolean>> {
    if (isLocalMode()) {
      // Modo local - não precisa reduzir estoque físico
      return { data: true, error: null }
    }
    
    // Modo Supabase - reduzir estoque físico
    return await supabaseProductsAdapter.reducePhysicalStockForConsignment(consignacaoId)
  }

  /**
   * Atualiza o estoque físico quando produtos são devolvidos
   * @param devolucoes Array de devoluções com product_id e qty_devolvida
   */
  async updateStockForReturns(devolucoes: Array<{ product_id: string; qty_devolvida: number; product_name: string }>): Promise<void> {
    if (isLocalMode()) {
      // Modo local - implementar lógica similar se necessário
      console.log('📦 [UniversalDataAdapter] Modo local - devoluções não afetam estoque físico')
      return Promise.resolve()
    }
    
    // Modo Supabase - atualizar estoque físico
    return await supabaseProductsAdapter.updateStockForReturns(devolucoes)
  }

  /**
   * Atualiza a quantidade na tabela consignacao_items quando produtos são devolvidos
   * @param consignacaoId ID da consignação
   * @param devolucoes Array de devoluções com product_id e qty_devolvida
   */
  async updateConsignacaoItemsForReturns(consignacaoId: string, devolucoes: Array<{ product_id: string; qty_devolvida: number; product_name: string }>): Promise<void> {
    if (isLocalMode()) {
      // Modo local - implementar lógica similar se necessário
      console.log('📦 [UniversalDataAdapter] Modo local - devoluções não afetam consignacao_items')
      return Promise.resolve()
    }
    
    // Modo Supabase - atualizar consignacao_items
    return await supabaseProductsAdapter.updateConsignacaoItemsForReturns(consignacaoId, devolucoes)
  }

  /**
   * Salva as devoluções na tabela consignacao_items (persistência)
   * @param consignacaoId ID da consignação
   * @param devolucoes Array de devoluções com product_id e qty_devolvida
   */
  async saveReturnsToConsignacaoItems(consignacaoId: string, devolucoes: Array<{ product_id: string; qty_devolvida: number; product_name: string }>): Promise<void> {
    if (isLocalMode()) {
      // Modo local - implementar lógica similar se necessário
      console.log('💾 [UniversalDataAdapter] Modo local - devoluções não são salvas no banco')
      return Promise.resolve()
    }
    
    // Modo Supabase - salvar devoluções
    return await supabaseProductsAdapter.saveReturnsToConsignacaoItems(consignacaoId, devolucoes)
  }

  /**
   * Carrega os produtos salvos de uma consignação com suas quantidades vendidas e devolvidas
   * @param consignacaoId ID da consignação
   */
  async getConsignacaoItemsWithReturns(consignacaoId: string): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      // Modo local - implementar lógica similar se necessário
      return { data: [], error: null }
    }
    
    // Modo Supabase - carregar produtos salvos
    return await supabaseProductsAdapter.getConsignacaoItemsWithReturns(consignacaoId)
  }

  async deleteConsignacao(id: string): Promise<{ error: Error | null }> {
    if (isLocalMode()) {
      return await localDataManager.deleteConsignacao(id)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.deleteConsignacao(id)
  }

  // MÉTODOS PARA ITENS DE CONSIGNAÇÃO
  async getConsignacaoItems(consignacaoId: string): Promise<DataListResponse<ConsignacaoItem>> {
    if (isLocalMode()) {
      return await localDataManager.getConsignacaoItems(consignacaoId)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getConsignacaoItems(consignacaoId)
  }

  async createConsignacaoItem(itemData: Omit<ConsignacaoItem, 'id' | 'created_at'>): Promise<DataResponse<ConsignacaoItem>> {
    if (isLocalMode()) {
      return await localDataManager.createConsignacaoItem(itemData)
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.createConsignacaoItem(itemData)
  }

  async updateConsignacaoItem(itemId: string, updates: Partial<ConsignacaoItem>): Promise<DataResponse<ConsignacaoItem>> {
    if (isLocalMode()) {
      // TODO: Implementar no localDataManager se necessário
      throw new Error('Modo local não implementado ainda - use modo Supabase')
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateConsignacaoItem(itemId, updates)
  }

  async updateConsignacaoItemsByProduct(consignacaoId: string, productId: string, updates: Partial<ConsignacaoItem>): Promise<DataResponse<ConsignacaoItem[]>> {
    if (isLocalMode()) {
      // TODO: Implementar no localDataManager se necessário
      throw new Error('Modo local não implementado ainda - use modo Supabase')
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.updateConsignacaoItemsByProduct(consignacaoId, productId, updates)
  }

  async getConsignacaoItemById(itemId: string): Promise<DataResponse<ConsignacaoItem>> {
    if (isLocalMode()) {
      // TODO: Implementar no localDataManager se necessário
      throw new Error('Modo local não implementado ainda - use modo Supabase')
    }
    
    try {
      console.log('🔍 [UniversalDataAdapter] Buscando item de consignação por ID:', itemId)
      
      const supabase = supabaseAdmin
      const { data, error } = await supabase
        .from('consignacao_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar item de consignação:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [UniversalDataAdapter] Item de consignação encontrado:', data.id)
      return { data, error: null }
    } catch (err) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar item de consignação:', err)
      return { data: null, error: err as Error }
    }
  }

  // ✅ OTIMIZAÇÃO EGRESS: Busca direta por ID com seleção específica de colunas
  async getProductById(productId: string): Promise<DataResponse<Product>> {
    if (isLocalMode()) {
      return await localDataManager.getProductById(productId)
    }
    
    try {
      console.log('🔍 [UniversalDataAdapter] Buscando produto por ID:', productId)
      
      const supabase = supabaseAdmin
      // ✅ OTIMIZAÇÃO: Selecionar apenas colunas necessárias ao invés de '*'
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
          photo_url,
          created_at
        `)
        .eq('id', productId)
        .single()

      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar produto:', error)
        return { data: null, error: new Error(error.message) }
      }

      console.log('✅ [UniversalDataAdapter] Produto encontrado:', data.name)
      return { data, error: null }
    } catch (err) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar produto:', err)
      return { data: null, error: err as Error }
    }
  }

  // MÉTODOS ESPECÍFICOS PARA CONSIGNADO
  async getConsignadoReservas(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      // Para modo local, usar dados locais
      const { data: consignacoes, error } = await localDataManager.getConsignacoes()
      if (error) return { data: null, error }
      
      const reservas = consignacoes?.filter(c => c.status === 'ENTREGUE' || c.status === 'RASCUNHO') || []
      return { data: reservas, error: null }
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getConsignadoReservas()
  }

  async getConsignadoPorProduto(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      // Para modo local, calcular dados localmente
      const { data: consignacoes, error: consignacoesError } = await localDataManager.getConsignacoes()
      if (consignacoesError) return { data: null, error: consignacoesError }
      
      const { data: items, error: itemsError } = await localDataManager.getAllConsignacaoItems()
      if (itemsError) return { data: null, error: itemsError }
      
      // Calcular consignado por produto
      const consignacoesAtivas = consignacoes?.filter(c => c.status === 'ENTREGUE' || c.status === 'RASCUNHO') || []
      const consignacaoIdsAtivas = consignacoesAtivas.map(c => c.id)
      
      const itemsAtivos = items?.filter(item => consignacaoIdsAtivas.includes(item.consignacao_id)) || []
      
      const consignadoPorProduto = itemsAtivos.reduce((acc: any, item) => {
        const existing = acc.find((p: any) => p.product_id === item.product_id)
        if (existing) {
          existing.qty_reservada += item.qty || 0
        } else {
          acc.push({
            product_id: item.product_id,
            qty_reservada: item.qty || 0,
            qty_enviada: 0,
            qty_vendida: 0,
            qty_devolvida: 0,
            qty_perda: 0
          })
        }
        return acc
      }, [])
      
      return { data: consignadoPorProduto, error: null }
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getConsignadoPorProduto()
  }

  async getConsignadoPorCliente(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      // Para modo local, usar dados locais
      const { data: consignacoes, error } = await localDataManager.getConsignacoes()
      if (error) return { data: null, error }
      
      const consignacoesAtivas = consignacoes?.filter(c => c.status === 'ENTREGUE' || c.status === 'RASCUNHO') || []
      return { data: consignacoesAtivas, error: null }
    }
    
    // Modo Supabase - usar dados reais do banco
    return await supabaseProductsAdapter.getConsignadoPorCliente()
  }

  // Método auxiliar para buscar todos os itens de consignação (modo local)
  private async getAllConsignacaoItems(): Promise<DataListResponse<ConsignacaoItem>> {
    if (isLocalMode()) {
      const { data: consignacoes, error } = await localDataManager.getConsignacoes()
      if (error) return { data: null, error }
      
      const allItems: ConsignacaoItem[] = []
      for (const consignacao of consignacoes || []) {
        const { data: items, error: itemsError } = await localDataManager.getConsignacaoItems(consignacao.id)
        if (itemsError) return { data: null, error: itemsError }
        allItems.push(...(items || []))
      }
      
      return { data: allItems, error: null }
    }
    
    throw new Error('Método getAllConsignacaoItems só funciona em modo local')
  }

  // MÉTODOS PARA PAGAMENTOS
  async getPayments(): Promise<DataListResponse<Payment>> {
    if (isLocalMode()) {
      return await localDataManager.getPayments()
    }
    
    // Usar Supabase quando não estiver em modo local
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar pagamentos:', error)
        return { data: [], error: new Error(`Erro ao buscar pagamentos: ${error.message}`) }
      }
      
      const payments = (data || []) as Payment[]
      console.log(`✅ [UniversalDataAdapter] ${payments.length} pagamentos carregados do Supabase`)
      
      return { data: payments, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar pagamentos:', error)
      return { data: [], error }
    }
  }

  async createPayment(paymentData: Omit<Payment, 'id' | 'paid_at'>): Promise<DataResponse<Payment>> {
    if (isLocalMode()) {
      return await localDataManager.createPayment(paymentData)
    }
    
    // Usar Supabase quando não estiver em modo local
    try {
      const supabase = supabaseAdmin
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          sale_id: paymentData.sale_id,
          consignacao_id: paymentData.consignacao_id, // ✅ CORREÇÃO: Incluir consignacao_id
          method: paymentData.method,
          amount_cents: paymentData.amount_cents,
          paid_at: paymentData.paid_at,
          created_at: paymentData.created_at || new Date().toISOString(),
          received_by: paymentData.received_by, // ✅ NOVO: Incluir quem recebeu
          notes: paymentData.notes, // ✅ NOVO: Incluir observações
          collaborator_id: paymentData.collaborator_id // ✅ NOVO: Incluir ID da colaboradora
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ [UniversalDataAdapter] Erro ao criar pagamento:', error)
        return { data: null, error: new Error(`Erro ao criar pagamento: ${error.message}`) }
      }
      
      const payment = {
        id: data.id,
        sale_id: data.sale_id,
        consignacao_id: data.consignacao_id, // ✅ CORREÇÃO: Incluir consignacao_id
        method: data.method,
        amount_cents: data.amount_cents,
        paid_at: data.paid_at || new Date().toISOString(),
        created_at: data.created_at,
        received_by: data.received_by, // ✅ NOVO: Incluir quem recebeu
        notes: data.notes, // ✅ NOVO: Incluir observações
        collaborator_id: data.collaborator_id // ✅ NOVO: Incluir ID da colaboradora
      } as Payment
      
      console.log(`✅ [UniversalDataAdapter] Pagamento criado: ${payment.method} - R$ ${(payment.amount_cents / 100).toFixed(2)}`)
      
      return { data: payment, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao criar pagamento:', error)
      return { data: null, error }
    }
  }

  async getPaymentsBySaleId(saleId: string): Promise<DataListResponse<Payment>> {
    if (isLocalMode()) {
      return await localDataManager.getPaymentsBySaleId(saleId)
    }
    
    // Usar Supabase quando não estiver em modo local
    return await supabaseSalesAdapter.getPaymentsBySaleId(saleId)
  }

  // MÉTODOS PARA PRODUTOS EM CONSIGNAÇÃO
  async getConsignedProducts(): Promise<DataListResponse<any>> {
    if (isLocalMode()) {
      // Modo local - retornar array vazio por enquanto
      return { data: [], error: null }
    }
    
    try {
      const supabase = supabaseAdmin
      
      // Buscar produtos que estão em consignação através das tabelas de consignação
      // Primeiro, buscar IDs de consignações ativas
      const { data: activeConsignacoes, error: consignacoesError } = await supabase
        .from('consignacoes')
        .select('id')
        .in('status', ['RASCUNHO', 'ENTREGUE'])
      
      if (consignacoesError) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar consignações ativas:', consignacoesError)
        return { data: [], error: new Error(`Erro ao buscar consignações ativas: ${consignacoesError.message}`) }
      }
      
      if (!activeConsignacoes || activeConsignacoes.length === 0) {
        console.log('✅ [UniversalDataAdapter] Nenhuma consignação ativa encontrada')
        return { data: [], error: null }
      }
      
      const consignacaoIds = activeConsignacoes.map(c => c.id)
      
      // Buscar IDs de produtos em consignação
      const { data: consignacaoItems, error: itemsError } = await supabase
        .from('consignacao_items')
        .select('product_id')
        .in('consignacao_id', consignacaoIds)
      
      if (itemsError) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar itens de consignação:', itemsError)
        return { data: [], error: new Error(`Erro ao buscar itens de consignação: ${itemsError.message}`) }
      }
      
      if (!consignacaoItems || consignacaoItems.length === 0) {
        return { data: [], error: null }
      }
      
      const productIds = [...new Set(consignacaoItems.map(item => item.product_id))]
      
      // Buscar dados dos produtos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          short_code,
          stock,
          stock_consigned,
          stock_min
        `)
        .in('id', productIds)
      
      if (productsError) {
        console.error('❌ [UniversalDataAdapter] Erro ao buscar produtos em consignação:', productsError)
        return { data: [], error: new Error(`Erro ao buscar produtos em consignação: ${productsError.message}`) }
      }
      
      const consignedProducts = products || []
      
      return { data: consignedProducts, error: null }
    } catch (error) {
      console.error('❌ [UniversalDataAdapter] Erro inesperado ao buscar produtos em consignação:', error)
      return { data: [], error: error as Error }
    }
  }

  // Métodos de utilidade
  getCurrentMode() {
    return DATABASE_CONFIG.mode
  }

  isConnectedToSupabase() {
    return !isLocalMode()
  }

  isUsingLocalData() {
    return isLocalMode()
  }
}

// Instância singleton do adaptador universal
export const universalDataAdapter = new UniversalDataAdapter()

// Exportar para uso global
export default universalDataAdapter

// Log de inicialização
// ✅ Logs desabilitados
// console.log('🔄 Adaptador Universal de Dados inicializado')
// console.log(`📊 Modo atual: ${DATABASE_CONFIG.mode.toUpperCase()}`)
// console.log('🔧 Para alternar modos, use as funções em src/config/database.ts')
