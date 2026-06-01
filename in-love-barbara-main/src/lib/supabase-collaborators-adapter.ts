/**
 * Adaptador Supabase para Colaboradores
 * Integração transparente com o sistema existente
 */

import { supabase } from '@/integrations/supabase/client';
import { DATABASE_CONFIG } from '../config/database';

// Interface para resposta do Supabase
interface SupabaseCollaborator {
  id: string
  name: string
  role: string
  whatsapp: string | null
  email: string | null
  active: boolean
  created_at: string
  updated_at: string | null
}

// Interface para colaborador local (compatível com o sistema existente)
export interface Collaborator {
  id: string
  name: string
  role: string
  whatsapp: string
  created_at: string
}

// Função para converter colaborador do Supabase para o formato local
function convertSupabaseCollaboratorToLocal(supabaseCollaborator: SupabaseCollaborator): Collaborator {
  return {
    id: supabaseCollaborator.id,
    name: supabaseCollaborator.name,
    role: supabaseCollaborator.role,
    whatsapp: supabaseCollaborator.whatsapp || '',
    created_at: supabaseCollaborator.created_at
  }
}

// Função para converter colaborador local para o formato do Supabase
function convertLocalCollaboratorToSupabase(localCollaborator: Partial<Collaborator>): Partial<SupabaseCollaborator> {
  return {
    name: localCollaborator.name,
    role: localCollaborator.role,
    whatsapp: localCollaborator.whatsapp || null,
    email: null, // Campo adicional do Supabase
    active: true
  }
}

export class SupabaseCollaboratorsAdapter {
  
  // Buscar todos os colaboradores
  async getCollaborators(): Promise<{ data: Collaborator[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Erro ao buscar colaboradores do Supabase:', error)
        return { data: null, error: new Error(`Erro ao buscar colaboradores: ${error.message}`) }
      }
      
      const collaborators = data?.map(convertSupabaseCollaboratorToLocal) || []
      console.log(`✅ ${collaborators.length} colaboradores carregados do Supabase`)
      
      return { data: collaborators, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao buscar colaboradores:', error)
      return { data: null, error }
    }
  }

  // Buscar colaborador por ID
  async getCollaboratorById(id: string): Promise<{ data: Collaborator | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Erro ao buscar colaborador por ID:', error)
        return { data: null, error: new Error(`Erro ao buscar colaborador: ${error.message}`) }
      }
      
      const collaborator = convertSupabaseCollaboratorToLocal(data)
      return { data: collaborator, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao buscar colaborador por ID:', error)
      return { data: null, error }
    }
  }

  // Criar colaborador
  async createCollaborator(collaboratorData: Omit<Collaborator, 'id' | 'created_at'>): Promise<{ data: Collaborator | null; error: Error | null }> {
    try {
      const supabaseData = convertLocalCollaboratorToSupabase(collaboratorData)
      
      const { data, error } = await supabase
        .from('collaborators')
        .insert([supabaseData])
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar colaborador:', error)
        return { data: null, error: new Error(`Erro ao criar colaborador: ${error.message}`) }
      }
      
      const collaborator = convertSupabaseCollaboratorToLocal(data)
      console.log(`✅ Colaborador "${collaborator.name}" criado no Supabase`)
      
      return { data: collaborator, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao criar colaborador:', error)
      return { data: null, error }
    }
  }

  // Atualizar colaborador
  async updateCollaborator(id: string, updates: Partial<Omit<Collaborator, 'id' | 'created_at'>>): Promise<{ data: Collaborator | null; error: Error | null }> {
    try {
      const supabaseData = convertLocalCollaboratorToSupabase(updates)
      supabaseData.updated_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('collaborators')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar colaborador:', error)
        return { data: null, error: new Error(`Erro ao atualizar colaborador: ${error.message}`) }
      }
      
      const collaborator = convertSupabaseCollaboratorToLocal(data)
      console.log(`✅ Colaborador "${collaborator.name}" atualizado no Supabase`)
      
      return { data: collaborator, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao atualizar colaborador:', error)
      return { data: null, error }
    }
  }

  // Deletar colaborador (soft delete - marca como inativo)
  async deleteCollaborator(id: string): Promise<{ error: Error | null }> {
    try {
      // Em vez de deletar fisicamente, marca como inativo para preservar histórico
      const { error } = await supabase
        .from('collaborators')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) {
        console.error('Erro ao deletar colaborador:', error)
        return { error: new Error(`Erro ao deletar colaborador: ${error.message}`) }
      }
      
      console.log(`✅ Colaborador com ID "${id}" marcado como inativo no Supabase`)
      return { error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado ao deletar colaborador:', error)
      return { error }
    }
  }

  // Deletar múltiplos colaboradores
  async deleteCollaborators(ids: string[]): Promise<{ data: { deleted: number; failed: number } | null; error: Error | null }> {
    try {
      console.log(`🗑️ Marcando ${ids.length} colaboradores como inativos no Supabase...`)
      
      let deleted = 0
      let failed = 0
      
      // Marcar como inativo um por vez para ter controle individual
      for (const id of ids) {
        try {
          const { error } = await supabase
            .from('collaborators')
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq('id', id)
          
          if (error) {
            console.error(`Erro ao marcar colaborador ${id} como inativo:`, error)
            failed++
          } else {
            deleted++
          }
        } catch (err) {
          console.error(`Erro inesperado ao marcar colaborador ${id} como inativo:`, err)
          failed++
        }
      }
      
      console.log(`✅ Exclusão em massa concluída: ${deleted} marcados como inativos, ${failed} falharam`)
      return { data: { deleted, failed }, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('Erro inesperado na exclusão em massa:', error)
      return { data: null, error }
    }
  }
}

// Instância singleton do adaptador Supabase
export const supabaseCollaboratorsAdapter = new SupabaseCollaboratorsAdapter()

