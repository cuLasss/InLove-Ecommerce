/**
 * Adaptador Supabase para Mensagens de Aniversário
 * Sistema completo de histórico de mensagens enviadas
 */

import { supabase } from '@/integrations/supabase/client';

// Interface para mensagem de aniversário no Supabase
export interface SupabaseBirthdayMessage {
  id: string;
  client_id: string;
  client_name: string;
  client_whatsapp: string;
  message: string;
  message_type: string;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

// Interface para mensagem local (compatível com o sistema existente)
export interface BirthdayMessage {
  id: string;
  clientName: string;
  clientWhatsapp: string;
  message: string;
  sentAt: Date;
  type: 'birthday';
}

// Função para converter mensagem do Supabase para o formato local
function convertSupabaseToLocal(supabaseMessage: SupabaseBirthdayMessage): BirthdayMessage {
  return {
    id: supabaseMessage.id,
    clientName: supabaseMessage.client_name,
    clientWhatsapp: supabaseMessage.client_whatsapp,
    message: supabaseMessage.message,
    sentAt: new Date(supabaseMessage.sent_at),
    type: 'birthday'
  };
}

// Função para converter mensagem local para o formato Supabase
function convertLocalToSupabase(localMessage: Omit<BirthdayMessage, 'id'>, clientId: string): Omit<SupabaseBirthdayMessage, 'id' | 'created_at' | 'updated_at'> {
  return {
    client_id: clientId,
    client_name: localMessage.clientName,
    client_whatsapp: localMessage.clientWhatsapp,
    message: localMessage.message,
    message_type: localMessage.type,
    sent_at: localMessage.sentAt.toISOString()
  };
}

/**
 * Classe para gerenciar mensagens de aniversário no Supabase
 */
export class SupabaseBirthdayMessagesAdapter {
  
  /**
   * Salvar uma nova mensagem de aniversário
   */
  async saveMessage(message: Omit<BirthdayMessage, 'id'>, clientId: string): Promise<BirthdayMessage> {
    try {
      console.log('🔄 [BirthdayMessages] Salvando mensagem no Supabase...');
      
      const supabaseData = convertLocalToSupabase(message, clientId);
      
      const { data, error } = await supabase
        .from('birthday_messages')
        .insert(supabaseData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [BirthdayMessages] Erro ao salvar mensagem:', error);
        throw new Error(`Erro ao salvar mensagem: ${error.message}`);
      }
      
      const localMessage = convertSupabaseToLocal(data);
      console.log('✅ [BirthdayMessages] Mensagem salva:', localMessage.id);
      
      return localMessage;
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral ao salvar mensagem:', error);
      throw error;
    }
  }
  
  /**
   * Buscar todas as mensagens de aniversário
   */
  // ✅ OTIMIZAÇÃO EGRESS: Selecionar apenas colunas necessárias
  async getAllMessages(): Promise<BirthdayMessage[]> {
    try {
      console.log('🔄 [BirthdayMessages] Buscando todas as mensagens...');
      
      const { data, error } = await supabase
        .from('birthday_messages')
        .select('id, client_id, client_name, client_whatsapp, message, sent_at, message_type')
        .order('sent_at', { ascending: false });
      
      if (error) {
        console.error('❌ [BirthdayMessages] Erro ao buscar mensagens:', error);
        throw new Error(`Erro ao buscar mensagens: ${error.message}`);
      }
      
      const localMessages = data.map(convertSupabaseToLocal);
      console.log('✅ [BirthdayMessages] Mensagens carregadas:', localMessages.length);
      
      return localMessages;
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral ao buscar mensagens:', error);
      throw error;
    }
  }
  
  /**
   * Buscar mensagens por cliente
   */
  async getMessagesByClient(clientId: string): Promise<BirthdayMessage[]> {
    try {
      console.log('🔄 [BirthdayMessages] Buscando mensagens do cliente:', clientId);
      
      const { data, error } = await supabase
        .from('birthday_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('sent_at', { ascending: false });
      
      if (error) {
        console.error('❌ [BirthdayMessages] Erro ao buscar mensagens do cliente:', error);
        throw new Error(`Erro ao buscar mensagens do cliente: ${error.message}`);
      }
      
      const localMessages = data.map(convertSupabaseToLocal);
      console.log('✅ [BirthdayMessages] Mensagens do cliente carregadas:', localMessages.length);
      
      return localMessages;
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral ao buscar mensagens do cliente:', error);
      throw error;
    }
  }
  
  /**
   * Excluir uma mensagem específica
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      console.log('🔄 [BirthdayMessages] Excluindo mensagem:', messageId);
      
      const { error } = await supabase
        .from('birthday_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) {
        console.error('❌ [BirthdayMessages] Erro ao excluir mensagem:', error);
        throw new Error(`Erro ao excluir mensagem: ${error.message}`);
      }
      
      console.log('✅ [BirthdayMessages] Mensagem excluída:', messageId);
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral ao excluir mensagem:', error);
      throw error;
    }
  }
  
  /**
   * Excluir múltiplas mensagens
   */
  async deleteMultipleMessages(messageIds: string[]): Promise<void> {
    try {
      console.log('🔄 [BirthdayMessages] Excluindo múltiplas mensagens:', messageIds.length);
      
      const { error } = await supabase
        .from('birthday_messages')
        .delete()
        .in('id', messageIds);
      
      if (error) {
        console.error('❌ [BirthdayMessages] Erro ao excluir mensagens:', error);
        throw new Error(`Erro ao excluir mensagens: ${error.message}`);
      }
      
      console.log('✅ [BirthdayMessages] Mensagens excluídas:', messageIds.length);
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral ao excluir mensagens:', error);
      throw error;
    }
  }
  
  /**
   * Limpar todo o histórico de mensagens
   */
  async clearAllMessages(): Promise<void> {
    try {
      console.log('🔄 [BirthdayMessages] Limpando todo o histórico...');
      
      const { error } = await supabase
        .from('birthday_messages')
        .delete()
        .neq('id', ''); // Deleta todos os registros
      
      if (error) {
        console.error('❌ [BirthdayMessages] Erro ao limpar histórico:', error);
        throw new Error(`Erro ao limpar histórico: ${error.message}`);
      }
      
      console.log('✅ [BirthdayMessages] Histórico limpo com sucesso');
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral ao limpar histórico:', error);
      throw error;
    }
  }
  
  /**
   * Migrar mensagens do localStorage para o Supabase
   */
  async migrateFromLocalStorage(): Promise<number> {
    try {
      console.log('🔄 [BirthdayMessages] Iniciando migração do localStorage...');
      
      // Buscar mensagens do localStorage
      const localMessages = localStorage.getItem('sent-birthday-messages');
      if (!localMessages) {
        console.log('ℹ️ [BirthdayMessages] Nenhuma mensagem encontrada no localStorage');
        return 0;
      }
      
      const parsedMessages = JSON.parse(localMessages);
      console.log('📦 [BirthdayMessages] Mensagens encontradas no localStorage:', parsedMessages.length);
      
      let migratedCount = 0;
      
      for (const localMsg of parsedMessages) {
        try {
          // Buscar o cliente pelo nome e WhatsApp para encontrar o ID
          const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('name', localMsg.clientName)
            .eq('whatsapp', localMsg.clientWhatsapp)
            .limit(1);
          
          if (clientError || !clients || clients.length === 0) {
            console.warn('⚠️ [BirthdayMessages] Cliente não encontrado:', localMsg.clientName);
            continue;
          }
          
          const clientId = clients[0].id;
          
          // Converter mensagem local para formato Supabase
          const messageData = {
            clientName: localMsg.clientName,
            clientWhatsapp: localMsg.clientWhatsapp,
            message: localMsg.message,
            sentAt: new Date(localMsg.sentAt),
            type: 'birthday' as const
          };
          
          // Salvar no Supabase
          await this.saveMessage(messageData, clientId);
          migratedCount++;
          
        } catch (error) {
          console.error('❌ [BirthdayMessages] Erro ao migrar mensagem:', localMsg.id, error);
        }
      }
      
      console.log('✅ [BirthdayMessages] Migração concluída:', migratedCount, 'mensagens migradas');
      
      // Limpar localStorage após migração bem-sucedida
      if (migratedCount > 0) {
        localStorage.removeItem('sent-birthday-messages');
        console.log('🗑️ [BirthdayMessages] localStorage limpo após migração');
      }
      
      return migratedCount;
    } catch (error: any) {
      console.error('❌ [BirthdayMessages] Erro geral na migração:', error);
      throw error;
    }
  }
}

// Instância singleton do adaptador
export const birthdayMessagesAdapter = new SupabaseBirthdayMessagesAdapter();
