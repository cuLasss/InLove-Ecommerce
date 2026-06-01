/**
 * Adaptador Supabase para Clientes
 * Integração transparente com o sistema existente
 */

import { supabaseAdmin } from '../integrations/supabase/client-with-auth'
import type { Client } from './local-only-data-manager'

// Usar cliente singleton para evitar múltiplas instâncias
const supabase = supabaseAdmin

// Interface para resposta do Supabase
interface SupabaseClient {
  id: string
  name: string
  whatsapp: string | null
  city: string | null
  state: string | null
  zip: string | null
  zip_code: string | null
  address: string | null
  email: string | null
  cpf: string | null
  cnpj: string | null
  birthday: string | null
  birth_date: string | null
  notes: string | null
  types: string[]
  active: boolean
  created_at: string
  updated_at: string | null
}

// Função para converter cliente do Supabase para o formato local
function convertSupabaseClientToLocal(supabaseClient: SupabaseClient): Client {
  return {
    id: supabaseClient.id,
    name: supabaseClient.name,
    whatsapp: supabaseClient.whatsapp || undefined,
    city: supabaseClient.city || undefined,
    state: supabaseClient.state || undefined,
    zip: supabaseClient.zip || undefined,
    zip_code: supabaseClient.zip_code || undefined,
    address: supabaseClient.address || undefined,
    email: supabaseClient.email || undefined,
    cpf: supabaseClient.cpf || undefined,
    cnpj: supabaseClient.cnpj || undefined,
    birthday: supabaseClient.birthday || supabaseClient.birth_date || undefined,
    notes: supabaseClient.notes || undefined,
    types: supabaseClient.types || [],
    active: supabaseClient.active,
    created_at: supabaseClient.created_at
  }
}

// Função para converter cliente local para o formato do Supabase
function convertLocalClientToSupabase(localClient: Partial<Client>): Partial<SupabaseClient> {
  return {
    name: localClient.name,
    whatsapp: localClient.whatsapp || null,
    city: localClient.city || null,
    state: localClient.state || null,
    zip: localClient.zip || null,
    zip_code: localClient.zip_code || null,
    address: localClient.address || null,
    email: localClient.email || null,
    cpf: localClient.cpf || null,
    cnpj: localClient.cnpj || null,
    birthday: localClient.birthday || null,
    birth_date: localClient.birthday || null,
    notes: localClient.notes || null,
    types: localClient.types || [],
    active: localClient.active !== undefined ? localClient.active : true
  }
}

export class SupabaseClientsAdapter {
  
  // Buscar todos os clientes
  async getClients(): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Erro ao buscar clientes do Supabase:', error)
        return { data: null, error: new Error(`Erro ao buscar clientes: ${error.message}`) }
      }
      
      const clients = data?.map(convertSupabaseClientToLocal) || []
      console.log(`✅ ${clients.length} clientes carregados do Supabase`)
      
      return { data: clients, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao buscar clientes:', error)
      return { data: null, error }
    }
  }

  // Buscar cliente por ID
  async getClientById(id: string): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Erro ao buscar cliente por ID:', error)
        return { data: null, error: new Error(`Erro ao buscar cliente: ${error.message}`) }
      }
      
      const client = convertSupabaseClientToLocal(data)
      return { data: client, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao buscar cliente por ID:', error)
      return { data: null, error }
    }
  }

  // Buscar clientes por tipo
  async getClientsByType(type: string): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseClientsAdapter] Buscando clientes do tipo: ${type}`)
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .contains('types', [type])
        .order('name', { ascending: true })
      
      if (error) {
        console.error('❌ [SupabaseClientsAdapter] Erro ao buscar clientes por tipo:', error)
        return { data: null, error: new Error(`Erro ao buscar clientes por tipo: ${error.message}`) }
      }
      
      const clients = data?.map(convertSupabaseClientToLocal) || []
      console.log(`✅ [SupabaseClientsAdapter] ${clients.length} clientes do tipo "${type}" carregados do Supabase`)
      
      // Log dos clientes encontrados para debug
      clients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.name} (${client.types?.join(', ')})`)
      })
      
      return { data: clients, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseClientsAdapter] Erro inesperado ao buscar clientes por tipo:', error)
      return { data: null, error }
    }
  }

  // Buscar clientes por texto
  async searchClients(query: string): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`name.ilike.%${query}%,whatsapp.ilike.%${query}%,city.ilike.%${query}%,email.ilike.%${query}%`)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Erro ao buscar clientes:', error)
        return { data: null, error: new Error(`Erro ao buscar clientes: ${error.message}`) }
      }
      
      const clients = data?.map(convertSupabaseClientToLocal) || []
      console.log(`✅ ${clients.length} clientes encontrados para "${query}"`)
      
      return { data: clients, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao buscar clientes:', error)
      return { data: null, error }
    }
  }

  // Criar cliente
  async createClient(clientData: Omit<Client, 'id' | 'created_at'>): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const supabaseData = convertLocalClientToSupabase(clientData)
      
      const { data, error } = await supabase
        .from('clients')
        .insert([supabaseData])
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar cliente:', error)
        return { data: null, error: new Error(`Erro ao criar cliente: ${error.message}`) }
      }
      
      const client = convertSupabaseClientToLocal(data)
      console.log(`✅ Cliente "${client.name}" criado no Supabase`)
      
      return { data: client, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao criar cliente:', error)
      return { data: null, error }
    }
  }

  // Atualizar cliente
  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'created_at'>>): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const supabaseData = convertLocalClientToSupabase(updates)
      supabaseData.updated_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('clients')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar cliente:', error)
        return { data: null, error: new Error(`Erro ao atualizar cliente: ${error.message}`) }
      }
      
      const client = convertSupabaseClientToLocal(data)
      console.log(`✅ Cliente "${client.name}" atualizado no Supabase`)
      
      return { data: client, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao atualizar cliente:', error)
      return { data: null, error }
    }
  }

  // Deletar cliente
  async deleteClient(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Erro ao deletar cliente:', error)
        return { error: new Error(`Erro ao deletar cliente: ${error.message}`) }
      }
      
      console.log(`✅ Cliente com ID "${id}" deletado do Supabase`)
      return { error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao deletar cliente:', error)
      return { error }
    }
  }

  // Deletar múltiplos clientes
  async deleteClients(ids: string[]): Promise<{ data: { deleted: number; failed: number } | null; error: Error | null }> {
    try {
      console.log(`🗑️ Deletando ${ids.length} clientes do Supabase...`)
      
      let deleted = 0
      let failed = 0
      const failedClients: string[] = []
      
      // Deletar um por vez para ter controle individual
      for (const id of ids) {
        try {
          const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id)
          
          if (error) {
            console.error(`Erro ao deletar cliente ${id}:`, error)
            
            // Verificar se é erro de foreign key constraint
            if (error.message.includes('foreign key constraint') || 
                error.message.includes('referenced by')) {
              console.log(`⚠️ Cliente ${id} tem consignações associadas - pulando exclusão`)
              failedClients.push(id)
            }
            
            failed++
          } else {
            deleted++
          }
        } catch (err) {
          console.error(`Erro inesperado ao deletar cliente ${id}:`, err)
          failed++
        }
      }
      
      console.log(`✅ Exclusão em massa concluída: ${deleted} deletados, ${failed} falharam`)
      
      // Se houve falhas por foreign key, adicionar informação adicional
      if (failedClients.length > 0) {
        console.log(`⚠️ ${failedClients.length} clientes não puderam ser excluídos por terem consignações associadas`)
      }
      
      return { data: { deleted, failed }, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado na exclusão em massa:', error)
      return { data: null, error }
    }
  }
}

// Instância singleton do adaptador Supabase
export const supabaseClientsAdapter = new SupabaseClientsAdapter()
