/**
 * Adaptador Supabase para Vendas
 * Implementação completa para vendas do varejo e atacado
 */

import { supabase } from '@/integrations/supabase/client';
import { DATABASE_CONFIG } from '../config/database';

// Interface para resposta do Supabase
interface SupabaseSale {
  id: string
  client_id: string | null
  user_id: string | null
  channel: 'VAREJO' | 'ATACADO'
  status: 'RASCUNHO' | 'FECHADA' | 'CANCELADA'
  discount_total_cents: number
  total_cents: number
  payment_summary: any
  created_at: string
  closed_at: string | null
}

interface SupabaseSaleItem {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  discount_percent: number
  created_at: string
}

interface SupabasePayment {
  id: string
  sale_id: string
  method: string
  amount_cents: number
  created_at: string
}

// Interface para venda local (compatível com o sistema existente)
export interface Sale {
  id: string
  client_id?: string | null
  user_id?: string | null
  channel: 'VAREJO' | 'ATACADO'
  status: 'RASCUNHO' | 'FECHADA' | 'CANCELADA'
  discount_total_cents: number
  total_cents: number
  payment_summary: Record<string, number>
  created_at: string
  closed_at?: string | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price_cents: number
  discount_percent: number
  created_at: string
}

export interface Payment {
  id: string
  sale_id: string
  method: string
  amount_cents: number
  created_at: string
}

// Função para converter venda do Supabase para formato local
function convertSupabaseSaleToLocal(supabaseSale: SupabaseSale): Sale {
  return {
    id: supabaseSale.id,
    client_id: supabaseSale.client_id,
    user_id: supabaseSale.user_id,
    channel: supabaseSale.channel,
    status: supabaseSale.status,
    discount_total_cents: supabaseSale.discount_total_cents,
    total_cents: supabaseSale.total_cents,
    payment_summary: supabaseSale.payment_summary || {},
    created_at: supabaseSale.created_at,
    closed_at: supabaseSale.closed_at
  }
}

// Função para converter venda local para formato Supabase
function convertLocalSaleToSupabase(localSale: Partial<Sale>): Partial<SupabaseSale> {
  const result: Partial<SupabaseSale> = {
    client_id: localSale.client_id || null,
    user_id: localSale.user_id || null,
    channel: localSale.channel || 'VAREJO',
    status: localSale.status || 'RASCUNHO',
    discount_total_cents: localSale.discount_total_cents || 0,
    total_cents: localSale.total_cents || 0,
    payment_summary: localSale.payment_summary || {},
    created_at: localSale.created_at || new Date().toISOString(),
    closed_at: localSale.closed_at || null
  }
  
  // Só incluir ID se estiver definido (para updates)
  if (localSale.id) {
    result.id = localSale.id
  }
  
  return result
}

export class SupabaseSalesAdapter {
  
  // Função para mapear collaborator_id para app_user_id
  private async mapCollaboratorToAppUser(collaboratorId: string | null): Promise<string | null> {
    if (!collaboratorId) return null;
    
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Mapeando collaborator_id ${collaboratorId} para app_user_id`);
      
      // ✅ CORREÇÃO: Mapear da tabela collaborators para app_users
      // Buscar colaborador pelo ID na tabela collaborators
      const { data: collaborator, error: collaboratorError } = await supabase
        .from('collaborators')
        .select('id, name, email')
        .eq('id', collaboratorId)
        .eq('active', true)
        .single();
      
      if (collaboratorError || !collaborator) {
        console.warn(`⚠️ [SupabaseSalesAdapter] Colaborador ${collaboratorId} não encontrado na tabela collaborators`);
        return null;
      }
      
      console.log(`🔍 [SupabaseSalesAdapter] Colaborador encontrado: ${collaborator.name}`);
      
      // ✅ MELHORIA: Buscar usuário correspondente pelo nome E email para maior precisão
      let appUser = null;
      
      // Primeiro tentar buscar pelo nome exato
      const { data: appUserByName, error: appUserByNameError } = await supabase
        .from('app_users')
        .select('id, name, email')
        .eq('name', collaborator.name)
        .eq('active', true)
        .single();
      
      if (!appUserByNameError && appUserByName) {
        appUser = appUserByName;
        console.log(`✅ [SupabaseSalesAdapter] Usuário encontrado pelo nome: ${appUser.name}`);
      } else if (collaborator.email) {
        // Se não encontrou pelo nome e tem email, tentar pelo email
        const { data: appUserByEmail, error: appUserByEmailError } = await supabase
          .from('app_users')
          .select('id, name, email')
          .eq('email', collaborator.email)
          .eq('active', true)
          .single();
        
        if (!appUserByEmailError && appUserByEmail) {
          appUser = appUserByEmail;
          console.log(`✅ [SupabaseSalesAdapter] Usuário encontrado pelo email: ${appUser.name}`);
        }
      }
      
      if (!appUser) {
        console.warn(`⚠️ [SupabaseSalesAdapter] Usuário correspondente não encontrado para colaborador ${collaborator.name}`);
        
        // ✅ NOVA FUNCIONALIDADE: Criar usuário automaticamente se não existir
        console.log(`🔄 [SupabaseSalesAdapter] Criando usuário automaticamente para colaborador ${collaborator.name}`);
        
        const { data: newAppUser, error: createError } = await supabase
          .from('app_users')
          .insert([{
            name: collaborator.name,
            email: collaborator.email,
            role: 'COLAB',
            whatsapp: collaborator.whatsapp,
            active: true
          }])
          .select('id, name, email')
          .single();
        
        if (createError || !newAppUser) {
          console.error(`❌ [SupabaseSalesAdapter] Erro ao criar usuário para colaborador ${collaborator.name}:`, createError);
          return null;
        }
        
        appUser = newAppUser;
        console.log(`✅ [SupabaseSalesAdapter] Usuário criado automaticamente: ${appUser.name} (${appUser.id})`);
      }
      
      console.log(`✅ [SupabaseSalesAdapter] Mapeamento: ${collaborator.name} (${collaboratorId}) → ${appUser.id}`);
      return appUser.id;
      
    } catch (error) {
      console.error(`❌ [SupabaseSalesAdapter] Erro ao mapear collaborator_id ${collaboratorId}:`, error);
      return null;
    }
  }
  
  // Buscar todas as vendas
  // ✅ OTIMIZAÇÃO EGRESS: Selecionar apenas colunas necessárias ao invés de '*'
  async getSales(): Promise<{ data: Sale[] | null; error: Error | null }> {
    try {
      console.log('🔍 [SupabaseSalesAdapter] Buscando vendas...')
      
      const { data, error } = await supabase
        .from('sales')
        .select('id, client_id, user_id, total_cents, status, channel, created_at')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao buscar vendas:', error)
        return { data: null, error: new Error(`Erro ao buscar vendas: ${error.message}`) }
      }
      
      const sales = data?.map(convertSupabaseSaleToLocal) || []
      console.log(`✅ [SupabaseSalesAdapter] ${sales.length} vendas carregadas do Supabase`)
      
      return { data: sales, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao buscar vendas:', error)
      return { data: null, error }
    }
  }

  // Buscar vendas por canal
  async getSalesByChannel(channel: 'VAREJO' | 'ATACADO'): Promise<{ data: Sale[] | null; error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Buscando vendas do canal: ${channel}`)
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('channel', channel)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao buscar vendas por canal:', error)
        return { data: null, error: new Error(`Erro ao buscar vendas por canal: ${error.message}`) }
      }
      
      const sales = data?.map(convertSupabaseSaleToLocal) || []
      console.log(`✅ [SupabaseSalesAdapter] ${sales.length} vendas do canal "${channel}" carregadas`)
      
      return { data: sales, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao buscar vendas por canal:', error)
      return { data: null, error }
    }
  }

  // Buscar venda por ID
  async getSaleById(id: string): Promise<{ data: Sale | null; error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Buscando venda por ID: ${id}`)
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao buscar venda por ID:', error)
        return { data: null, error: new Error(`Erro ao buscar venda por ID: ${error.message}`) }
      }
      
      const sale = convertSupabaseSaleToLocal(data)
      console.log(`✅ [SupabaseSalesAdapter] Venda encontrada: ${sale.id}`)
      
      return { data: sale, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao buscar venda por ID:', error)
      return { data: null, error }
    }
  }

  // Criar nova venda
  async createSale(saleData: Omit<Sale, 'id' | 'created_at'>): Promise<{ data: Sale | null; error: Error | null }> {
    try {
      console.log('🔍 [SupabaseSalesAdapter] Criando nova venda...')
      
      const supabaseSaleData = convertLocalSaleToSupabase(saleData)
      
      const { data, error } = await supabase
        .from('sales')
        .insert([supabaseSaleData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao criar venda:', error)
        return { data: null, error: new Error(`Erro ao criar venda: ${error.message}`) }
      }
      
      const sale = convertSupabaseSaleToLocal(data)
      console.log(`✅ [SupabaseSalesAdapter] Venda criada: ${sale.id}`)
      
      return { data: sale, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao criar venda:', error)
      return { data: null, error }
    }
  }

  // Atualizar venda
  async updateSale(id: string, saleData: Partial<Sale>): Promise<{ data: Sale | null; error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Atualizando venda: ${id}`)
      
      const supabaseSaleData = convertLocalSaleToSupabase(saleData)
      
      const { data, error } = await supabase
        .from('sales')
        .update(supabaseSaleData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao atualizar venda:', error)
        return { data: null, error: new Error(`Erro ao atualizar venda: ${error.message}`) }
      }
      
      const sale = convertSupabaseSaleToLocal(data)
      console.log(`✅ [SupabaseSalesAdapter] Venda atualizada: ${sale.id}`)
      
      return { data: sale, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao atualizar venda:', error)
      return { data: null, error }
    }
  }

  // Deletar venda
  async deleteSale(id: string): Promise<{ error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Deletando venda: ${id}`)
      
      // Primeiro deletar itens da venda
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id)
      
      if (itemsError) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao deletar itens da venda:', itemsError)
        return { error: new Error(`Erro ao deletar itens da venda: ${itemsError.message}`) }
      }
      
      // Depois deletar pagamentos da venda
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('sale_id', id)
      
      if (paymentsError) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao deletar pagamentos da venda:', paymentsError)
        return { error: new Error(`Erro ao deletar pagamentos da venda: ${paymentsError.message}`) }
      }
      
      // Por último deletar a venda
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao deletar venda:', error)
        return { error: new Error(`Erro ao deletar venda: ${error.message}`) }
      }
      
      console.log(`✅ [SupabaseSalesAdapter] Venda deletada: ${id}`)
      return { error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao deletar venda:', error)
      return { error }
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
    is_pending_payment?: boolean;
    allow_partial_payment?: boolean;
  }): Promise<{ data: { sale_id: string; total_cents: number; items_count: number; payments_count: number } | null; error: Error | null }> {
    try {
      console.log('🔍 [SupabaseSalesAdapter] Finalizando venda do varejo...')
      
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

      // Mapear collaborator_id para app_user_id
      console.log('🔍 [SupabaseSalesAdapter] Iniciando mapeamento de colaborador:', {
        collaborator_id: saleData.collaborator_id,
        has_collaborator: !!saleData.collaborator_id
      });
      
      let appUserId = await this.mapCollaboratorToAppUser(saleData.collaborator_id);
      
      // ✅ NOVA FUNCIONALIDADE: Se não há colaborador selecionado, usar colaborador padrão
      if (!appUserId) {
        console.log('🔄 [SupabaseSalesAdapter] Nenhum colaborador selecionado, buscando colaborador padrão...');
        
        // Buscar colaborador ativo padrão
        const { data: defaultCollaborator, error: defaultError } = await supabase
          .from('collaborators')
          .select('id, name, email, whatsapp')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!defaultError && defaultCollaborator) {
          console.log(`🔄 [SupabaseSalesAdapter] Usando colaborador padrão: ${defaultCollaborator.name}`);
          appUserId = await this.mapCollaboratorToAppUser(defaultCollaborator.id);
        } else {
          console.warn('⚠️ [SupabaseSalesAdapter] Nenhum colaborador ativo encontrado');
        }
      }
      
      console.log('🔍 [SupabaseSalesAdapter] Resultado do mapeamento:', {
        collaborator_id: saleData.collaborator_id,
        app_user_id: appUserId,
        mapping_successful: !!appUserId
      });
      
      // Criar venda
      const sale: Omit<Sale, 'id' | 'created_at'> = {
        client_id: saleData.client_id,
        user_id: appUserId, // Usar app_user_id mapeado
        channel: 'VAREJO',
        status: 'FECHADA',
        discount_total_cents,
        total_cents,
        payment_summary: saleData.payments.reduce((acc, payment) => {
          acc[payment.method] = (acc[payment.method] || 0) + payment.amount_cents;
          return acc;
        }, {} as Record<string, number>),
        closed_at: new Date().toISOString()
      };

      console.log('🔄 [SupabaseSalesAdapter] Criando venda:', {
        client_id: sale.client_id,
        user_id: sale.user_id,
        total_cents: sale.total_cents,
        items_count: saleData.items.length,
        payments_count: saleData.payments.length
      });

      // Inserir venda no Supabase
      const { data: createdSale, error: saleError } = await supabase
        .from('sales')
        .insert([convertLocalSaleToSupabase(sale)])
        .select()
        .single();

      if (saleError) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao criar venda:', saleError);
        return { data: null, error: new Error(`Erro ao criar venda: ${saleError.message}`) };
      }

      console.log(`✅ [SupabaseSalesAdapter] Venda criada: ${createdSale.id}`);

      // Criar itens da venda
      const saleItems = saleData.items.map(item => ({
        sale_id: createdSale.id,
        product_id: item.product_id,
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
        discount_percent: item.discount_percent
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao criar itens da venda:', itemsError);
        // Tentar deletar a venda criada
        await supabase.from('sales').delete().eq('id', createdSale.id);
        return { data: null, error: new Error(`Erro ao criar itens da venda: ${itemsError.message}`) };
      }

      console.log(`✅ [SupabaseSalesAdapter] ${saleItems.length} itens criados para venda ${createdSale.id}`);

      // Criar pagamentos se houver
      if (saleData.payments.length > 0) {
        const payments = saleData.payments.map(payment => ({
          sale_id: createdSale.id,
          method: payment.method,
          amount_cents: payment.amount_cents
        }));

        const { error: paymentsError } = await supabase
          .from('payments')
          .insert(payments);

        if (paymentsError) {
          console.error('❌ [SupabaseSalesAdapter] Erro ao criar pagamentos:', paymentsError);
          // Tentar deletar a venda e itens criados
          await supabase.from('sale_items').delete().eq('sale_id', createdSale.id);
          await supabase.from('sales').delete().eq('id', createdSale.id);
          return { data: null, error: new Error(`Erro ao criar pagamentos: ${paymentsError.message}`) };
        }

        console.log(`✅ [SupabaseSalesAdapter] ${payments.length} pagamentos criados para venda ${createdSale.id}`);
      }

      // ✅ CORREÇÃO: Estoque é reduzido automaticamente pelo trigger do banco de dados
      // quando os itens são inseridos na tabela sale_items (trigger: trg_baixa_estoque_venda)
      // Não é necessário reduzir manualmente aqui para evitar redução dupla
      
      console.log(`📦 [SupabaseSalesAdapter] Estoque será reduzido automaticamente pelo trigger do banco para ${saleData.items.length} produtos`);
      
      // Log dos produtos que terão estoque reduzido pelo trigger
      for (const item of saleData.items) {
        console.log(`📦 [SupabaseSalesAdapter] Produto ${item.product_id}: ${item.qty} unidades serão reduzidas pelo trigger`);
      }

      console.log(`✅ [SupabaseSalesAdapter] Venda do varejo finalizada com sucesso: ${createdSale.id}`);

      return {
        data: {
          sale_id: createdSale.id,
          total_cents,
          items_count: saleData.items.length,
          payments_count: saleData.payments.length
        },
        error: null
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao finalizar venda:', error);
      return { data: null, error };
    }
  }

  // Buscar itens de uma venda
  async getSaleItems(saleId: string): Promise<{ data: SaleItem[] | null; error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Buscando itens da venda: ${saleId}`)
      
      const { data, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao buscar itens da venda:', error)
        return { data: null, error: new Error(`Erro ao buscar itens da venda: ${error.message}`) }
      }
      
      const items = (data || []) as SaleItem[]
      console.log(`✅ [SupabaseSalesAdapter] ${items.length} itens encontrados para venda ${saleId}`)
      
      return { data: items, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao buscar itens da venda:', error)
      return { data: null, error }
    }
  }

  // Buscar pagamentos de uma venda
  async getPaymentsBySaleId(saleId: string): Promise<{ data: Payment[] | null; error: Error | null }> {
    try {
      console.log(`🔍 [SupabaseSalesAdapter] Buscando pagamentos da venda: ${saleId}`)
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('❌ [SupabaseSalesAdapter] Erro ao buscar pagamentos da venda:', error)
        return { data: null, error: new Error(`Erro ao buscar pagamentos da venda: ${error.message}`) }
      }
      
      const payments = (data || []) as Payment[]
      console.log(`✅ [SupabaseSalesAdapter] ${payments.length} pagamentos encontrados para venda ${saleId}`)
      
      return { data: payments, error: null }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido')
      console.error('❌ [SupabaseSalesAdapter] Erro inesperado ao buscar pagamentos da venda:', error)
      return { data: null, error }
    }
  }
}

// Exportar instância da classe
export const supabaseSalesAdapter = new SupabaseSalesAdapter()
