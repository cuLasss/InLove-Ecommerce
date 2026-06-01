import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { universalDataAdapter } from '@/lib/universal-data-adapter';

export interface Sale {
  id: string;
  client_id?: string | null;
  user_id?: string | null;
  channel?: 'VAREJO' | 'ATACADO';
  status?: 'RASCUNHO' | 'FECHADA' | 'CANCELADA';
  discount_total_cents?: number;
  payment_summary?: Record<string, number>;
  created_at: string;
  closed_at?: string | null;
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
  sale_id: string;
  method: string;
  amount_cents: number;
  created_at: string;
}

export interface SaleWithDetails extends Sale {
  items?: SaleItem[];
  payments?: Payment[];
  client?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
  };
  products?: Array<{
    id: string;
    name: string;
    short_code: string;
    brand?: string;
    color?: string;
    size?: string;
  }>;
}

export function useSales() {
  const queryClient = useQueryClient();
  
  // Carrega vendas do sistema local
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
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Carrega itens de venda para cada venda
  const { data: salesWithDetails = [] } = useQuery({
    queryKey: ['sales-with-details', rawSales.length],
    queryFn: async () => {
      if (rawSales.length === 0) return [];
      
      const salesWithDetails: SaleWithDetails[] = [];
      
      for (const sale of rawSales) {
        try {
          // Buscar itens da venda
          const itemsResponse = await universalDataAdapter.getSaleItems(sale.id);
          const items = itemsResponse.data || [];

          // Buscar pagamentos da venda
          const paymentsResponse = await universalDataAdapter.getPaymentsBySaleId(sale.id);
          const payments = paymentsResponse.data || [];

          // Buscar dados do cliente se existir
          let client = null;
          if (sale.client_id) {
            try {
              const clientResponse = await universalDataAdapter.getClientById(sale.client_id);
              client = clientResponse.data;
            } catch (error) {
              console.warn('Cliente não encontrado:', sale.client_id, error);
            }
          }

          // Buscar dados do usuário se existir
          let user = null;
          if (sale.user_id) {
            try {
              const userResponse = await universalDataAdapter.getUserById(sale.user_id);
              user = userResponse.data;
            } catch (error) {
              console.warn('Usuário não encontrado:', sale.user_id, error);
            }
          }

          // Buscar dados dos produtos
          const products = [];
          for (const item of items) {
            try {
              const productResponse = await universalDataAdapter.getProductById(item.product_id);
              if (productResponse.data) {
                products.push({
                  id: productResponse.data.id,
                  name: productResponse.data.name,
                  short_code: productResponse.data.short_code,
                  brand: productResponse.data.brand,
                  color: productResponse.data.color,
                  size: productResponse.data.size
                });
              }
            } catch (error) {
              console.warn('Produto não encontrado:', item.product_id, error);
            }
          }

          salesWithDetails.push({
            ...sale,
            items,
            payments,
            client,
            user,
            products
          });
        } catch (error) {
          console.error('Erro ao carregar detalhes da venda:', sale.id, error);
          // Adicionar venda mesmo sem detalhes
          salesWithDetails.push({
            ...sale,
            items: [],
            payments: [],
            client: null,
            user: null,
            products: []
          });
        }
      }
      
      return salesWithDetails;
    },
    enabled: rawSales.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    gcTime: 10 * 60 * 1000 // 10 minutos
  });

  const refreshSales = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-with-details'] });
  }, [queryClient]);

  return {
    sales: salesWithDetails,
    isLoading,
    error,
    refreshSales,
    refetch: refreshSales
  };
}
