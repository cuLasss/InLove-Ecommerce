import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { useConsignacaoPayments } from './useConsignacaoPayments';
// ✅ OTIMIZAÇÃO: Removido usePageChangeListener - estava invalidando queries desnecessariamente

export interface Sale {
  id: string;
  client_id?: string | null;
  user_id?: string | null;
  channel?: 'VAREJO' | 'ATACADO';
  status?: 'RASCUNHO' | 'FECHADA' | 'CANCELADA';
  discount_total_cents?: number;
  total_cents?: number;
  payment_summary?: Record<string, number>;
  created_at: string;
  closed_at?: string | null;
  items?: Array<SaleItem & { product?: Product }>;
  sale_items?: Array<SaleItem & { product?: Product }>;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  unit_price_cents: number;
  discount_percent?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id?: string | null;
  consignacao_id?: string | null;
  amount_cents: number;
  method?: 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO';
  paid_at?: string;
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birthday?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COLAB';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  short_code: string;
  price_cents: number;
  cost_cents?: number;
  stock?: number;
  category?: string;
  brand?: string;
  supplier?: string;
  color?: string;
  size?: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleWithDetails extends Sale {
  client?: Client;
  user?: User;
  items?: Array<SaleItem & { product?: Product }>;
  payments?: Payment[];
}

export function useSalesOptimized() {
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // ✅ OTIMIZAÇÃO CRÍTICA: Só carregar consignação em páginas que realmente precisam
  // Páginas que precisam: Financeiro, Varejo (para devoluções)
  // Páginas que NÃO precisam: Atacado, NotasFiscais, etc.
  const needsConsignacao = location.pathname === '/financeiro' || location.pathname === '/varejo';
  
  // ✅ OTIMIZAÇÃO: Carregar vendas normais primeiro (mais rápido)
  const { data: rawSales = [], isLoading, error } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      try {
        const response = await universalDataAdapter.getSales();
        if (response.error) throw response.error;
        return response.data || [];
      } catch (error) {
        console.error('Erro ao carregar vendas:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnMount: false, // Evitar refetch desnecessário ao montar
    refetchOnWindowFocus: false, // Evitar refetch desnecessário ao focar na janela
    refetchOnReconnect: false, // Evitar refetch ao reconectar
    gcTime: 30 * 60 * 1000 // ✅ OTIMIZADO: Cache por 30 minutos
  });

  // ✅ OTIMIZAÇÃO CRÍTICA: Carregar consignação apenas quando necessário e quando vendas normais estiverem carregadas
  // Isso evita queries pesadas desnecessárias em páginas que não precisam
  const { salesFormat: consignacaoSales = [], isLoading: consignacaoLoading = false } = useConsignacaoPayments(needsConsignacao);
  
  // ✅ OTIMIZAÇÃO: Log apenas uma vez quando houver mudança significativa
  const logRef = useRef<number>(0)
  
  // Carrega todos os dados necessários em lote para melhor performance
  const { data: salesWithDetails = [] } = useQuery({
    queryKey: ['sales-with-details-optimized', rawSales.length],
    queryFn: async () => {
      const salesWithDetails: SaleWithDetails[] = [];
      
      // ✅ OTIMIZAÇÃO: Log apenas uma vez quando houver mudança significativa
      if (logRef.current !== rawSales.length) {
        console.log('🚀 [useSalesOptimized] Carregando dados em lote para melhor performance...', rawSales.length);
        logRef.current = rawSales.length
      }
      
      // Buscar todos os dados de uma vez (muito mais rápido)
      const [
        allItemsResponse,
        allPaymentsResponse,
        allClientsResponse,
        allUsersResponse,
        allProductsResponse
      ] = await Promise.all([
        universalDataAdapter.getAllSaleItems(),
        universalDataAdapter.getPayments(),
        universalDataAdapter.getClients(),
        universalDataAdapter.getAppUsers(), // Usar getAppUsers para buscar da tabela app_users
        universalDataAdapter.getProducts()
      ]);
      
      const allItems = allItemsResponse.data || [];
      const allPayments = allPaymentsResponse.data || [];
      const allClients = allClientsResponse.data || [];
      const allUsers = allUsersResponse.data || [];
      const allProducts = allProductsResponse.data || [];
      
      console.log(`📊 [useSalesOptimized] Dados carregados em lote:`, {
        vendas: rawSales.length,
        itens: allItems.length,
        pagamentos: allPayments.length,
        clientes: allClients.length,
        usuarios: allUsers.length,
        produtos: allProducts.length
      });
      
      // Processar apenas vendas que têm itens na tabela sale_items
      for (const sale of rawSales) {
        try {
          // Filtrar itens da venda (em memória - muito mais rápido)
          const items = allItems.filter(item => item.sale_id === sale.id);
          
          // Pular vendas que não têm itens na tabela sale_items
          if (items.length === 0) {
            console.log(`⚠️ [useSalesOptimized] Pulando venda ${sale.id} - sem itens na tabela sale_items`);
            continue;
          }

          // Filtrar pagamentos da venda (em memória - muito mais rápido)
          const payments = allPayments.filter(payment => payment.sale_id === sale.id);

          // Buscar dados do cliente (em memória - muito mais rápido)
          let client = null;
          if (sale.client_id) {
            client = allClients.find(c => c.id === sale.client_id) || null;
          }

          // Buscar dados do usuário (em memória - muito mais rápido)
          let user = null;
          if (sale.user_id) {
            user = allUsers.find(u => u.id === sale.user_id) || null;
          }

          // Buscar dados dos produtos para cada item (em memória - muito mais rápido)
          const itemsWithProducts = items.map(item => {
            const product = allProducts.find(p => p.id === item.product_id) || null;
            
            return {
              ...item,
              product
            };
          });

          salesWithDetails.push({
            ...sale,
            items: itemsWithProducts,
            payments,
            client,
            user
          });
        } catch (error) {
          console.error('Erro ao carregar detalhes da venda:', sale.id, error);
          // Adicionar venda mesmo sem detalhes
          salesWithDetails.push({
            ...sale,
            items: [],
            payments: [],
            client: null,
            user: null
          });
        }
      }
      
      console.log(`✅ [useSalesOptimized] Processamento em lote concluído: ${salesWithDetails.length} vendas processadas`);
      return salesWithDetails;
    },
    enabled: rawSales.length > 0,
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnMount: false, // Evitar refetch desnecessário ao montar
    refetchOnWindowFocus: false, // Evitar refetch desnecessário ao focar na janela
    refetchOnReconnect: false, // Evitar refetch ao reconectar
    gcTime: 30 * 60 * 1000 // ✅ OTIMIZADO: Cache por 30 minutos
  });

  const refreshSales = useCallback(async () => {
    console.log('🔄 [useSalesOptimized] Forçando refresh dos dados...');
    
    // Invalidar e forçar refetch imediato
    await queryClient.invalidateQueries({ queryKey: ['sales'] });
    await queryClient.invalidateQueries({ queryKey: ['sales-with-details-optimized'] });
    
    // Forçar refetch imediato
    await queryClient.refetchQueries({ queryKey: ['sales'] });
    await queryClient.refetchQueries({ queryKey: ['sales-with-details-optimized'] });
    
    console.log('✅ [useSalesOptimized] Cache invalidado e refetch forçado com sucesso');
  }, [queryClient]);

  // Mutation para excluir uma venda
  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await universalDataAdapter.deleteSale(saleId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-with-details-optimized'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir venda:', error);
    }
  });

  return {
    sales: [...salesWithDetails, ...consignacaoSales], // ✅ ATUALIZADO: Incluir vendas de consignação do Supabase
    isLoading: isLoading || consignacaoLoading,
    error,
    refreshSales,
    deleteSale: deleteSaleMutation.mutateAsync
  };
}
