/**
 * Hook para gerenciar clientes do Supabase
 */

import { useState, useEffect, useCallback } from 'react'
import { supabaseAdmin } from '@/integrations/supabase/client-with-auth'

// Usar cliente singleton para evitar múltiplas instâncias
const supabase = supabaseAdmin

export interface SupabaseClient {
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

export interface CreateClientData {
  name: string
  whatsapp?: string
  city?: string
  state?: string
  zip?: string
  zip_code?: string
  address?: string
  email?: string
  cpf?: string
  cnpj?: string
  birthday?: string
  birth_date?: string
  notes?: string
  types?: string[]
  active?: boolean
}

export interface UpdateClientData extends Partial<CreateClientData> {
  id: string
}

export interface UseSupabaseClientsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

export interface UseSupabaseClientsReturn {
  clients: SupabaseClient[]
  isLoading: boolean
  error: string | null
  createClient: (data: CreateClientData) => Promise<SupabaseClient | null>
  updateClient: (data: UpdateClientData) => Promise<SupabaseClient | null>
  deleteClient: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
  searchClients: (query: string) => SupabaseClient[]
}

export function useSupabaseClients(options: UseSupabaseClientsOptions = {}): UseSupabaseClientsReturn {
  const { autoRefresh = true, refreshInterval = 30000 } = options
  
  const [clients, setClients] = useState<SupabaseClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Função para buscar clientes
  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      
      if (fetchError) {
        throw new Error(`Erro ao buscar clientes: ${fetchError.message}`)
      }
      
      setClients(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao buscar clientes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Função para criar cliente
  const createClient = useCallback(async (data: CreateClientData): Promise<SupabaseClient | null> => {
    try {
      setError(null)
      
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([{
          name: data.name,
          whatsapp: data.whatsapp || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          zip_code: data.zip_code || null,
          address: data.address || null,
          email: data.email || null,
          cpf: data.cpf || null,
          cnpj: data.cnpj || null,
          birthday: data.birthday || null,
          birth_date: data.birth_date || null,
          notes: data.notes || null,
          types: data.types || [],
          active: data.active !== undefined ? data.active : true
        }])
        .select()
        .single()
      
      if (createError) {
        throw new Error(`Erro ao criar cliente: ${createError.message}`)
      }
      
      // Atualizar lista local
      setClients(prev => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)))
      
      return newClient
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao criar cliente:', err)
      return null
    }
  }, [])

  // Função para atualizar cliente
  const updateClient = useCallback(async (data: UpdateClientData): Promise<SupabaseClient | null> => {
    try {
      setError(null)
      
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients')
        .update({
          name: data.name,
          whatsapp: data.whatsapp,
          city: data.city,
          state: data.state,
          zip: data.zip,
          zip_code: data.zip_code,
          address: data.address,
          email: data.email,
          cpf: data.cpf,
          cnpj: data.cnpj,
          birthday: data.birthday,
          birth_date: data.birth_date,
          notes: data.notes,
          types: data.types,
          active: data.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .select()
        .single()
      
      if (updateError) {
        throw new Error(`Erro ao atualizar cliente: ${updateError.message}`)
      }
      
      // Atualizar lista local
      setClients(prev => 
        prev.map(client => 
          client.id === data.id ? updatedClient : client
        ).sort((a, b) => a.name.localeCompare(b.name))
      )
      
      return updatedClient
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao atualizar cliente:', err)
      return null
    }
  }, [])

  // Função para deletar cliente
  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
      
      if (deleteError) {
        throw new Error(`Erro ao deletar cliente: ${deleteError.message}`)
      }
      
      // Atualizar lista local
      setClients(prev => prev.filter(client => client.id !== id))
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao deletar cliente:', err)
      return false
    }
  }, [])

  // Função para buscar clientes
  const searchClients = useCallback((query: string): SupabaseClient[] => {
    if (!query.trim()) return clients
    
    const lowercaseQuery = query.toLowerCase()
    return clients.filter(client => 
      client.name.toLowerCase().includes(lowercaseQuery) ||
      (client.whatsapp && client.whatsapp.includes(query)) ||
      (client.email && client.email.toLowerCase().includes(lowercaseQuery)) ||
      (client.city && client.city.toLowerCase().includes(lowercaseQuery))
    )
  }, [clients])

  // Função para refresh manual
  const refresh = useCallback(async () => {
    await fetchClients()
  }, [fetchClients])

  // Efeito para carregar clientes inicialmente
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Efeito para auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchClients()
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchClients])

  return {
    clients,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refresh,
    searchClients
  }
}

// Hook específico para buscar um cliente por ID
export function useSupabaseClient(id: string) {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single()
        
        if (fetchError) {
          throw new Error(`Erro ao buscar cliente: ${fetchError.message}`)
        }
        
        setClient(data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(errorMessage)
        console.error('Erro ao buscar cliente:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchClient()
    }
  }, [id])

  return { client, isLoading, error }
}

