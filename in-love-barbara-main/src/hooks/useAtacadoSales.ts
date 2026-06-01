import { useState, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { useToast } from '@/hooks/use-toast';

// Interfaces para vendas de atacado
export interface AtacadoSale {
  id: string;
  client_id?: string | null;
  user_id?: string | null;
  channel: 'ATACADO';
  status: 'RASCUNHO' | 'FECHADA' | 'CANCELADA';
  discount_total_cents?: number;
  total_cents?: number;
  payment_summary?: Record<string, number>;
  created_at: string;
  closed_at?: string | null;
  // Campos específicos do atacado removidos - não existem na tabela sales
  // batch_discount_percent, profit_margin_percent, etc. são apenas para cálculo local
}

export interface AtacadoSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  unit_price_cents: number;
  discount_percent?: number;
  created_at: string;
  // Campos específicos do atacado removidos - não existem na tabela sale_items
  // batch_quantity, profit_per_unit_cents, cost_price_cents, margin_percent são apenas para cálculo local
}

export interface AtacadoSaleWithDetails extends AtacadoSale {
  items: (AtacadoSaleItem & { product?: any })[];
  payments: any[];
  client?: any;
  user?: any;
}

// Hook para vendas de atacado
export function useAtacadoSales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query para buscar vendas de atacado
  const { data: atacadoSales = [], isLoading, refetch } = useQuery({
    queryKey: ['atacado-sales'],
    queryFn: async (): Promise<AtacadoSaleWithDetails[]> => {
      try {
        // Buscar vendas de atacado
        const salesResponse = await universalDataAdapter.getSales();
        if (salesResponse.error) {
          console.error('Erro ao buscar vendas:', salesResponse.error);
          return [];
        }

        const rawSales = (salesResponse.data || []).filter(
          (sale: any) => sale.channel === 'ATACADO'
        );

        // Buscar dados relacionados em paralelo
        const [itemsResponse, paymentsResponse, clientsResponse, usersResponse, productsResponse] = await Promise.all([
          universalDataAdapter.getAllSaleItems(),
          universalDataAdapter.getPayments(),
          universalDataAdapter.getClients(),
          universalDataAdapter.getUsers(),
          universalDataAdapter.getProductsWithRelations()
        ]);

        const allItems = itemsResponse.data || [];
        const allPayments = paymentsResponse.data || [];
        const allClients = clientsResponse.data || [];
        const allUsers = usersResponse.data || [];
        const allProducts = productsResponse.data || [];

        console.log('🔍 [useAtacadoSales] Dados carregados:', {
          sales: rawSales.length,
          items: allItems.length,
          payments: allPayments.length,
          clients: allClients.length,
          users: allUsers.length,
          products: allProducts.length,
          allItems: allItems,
          rawSales: rawSales,
          allProducts: allProducts
        });

        // Processar vendas com detalhes
        const salesWithDetails: AtacadoSaleWithDetails[] = [];

        for (const sale of rawSales) {
          try {
            // Filtrar itens da venda
            const items = allItems.filter((item: any) => item.sale_id === sale.id);
            console.log(`🔍 [useAtacadoSales] Venda ${sale.id.slice(-8)}:`, {
              saleId: sale.id,
              itemsFound: items.length,
              items: items,
              allItemsCount: allItems.length,
              allItemsSample: allItems.slice(0, 3) // Mostrar primeiros 3 itens para debug
            });

            // Filtrar pagamentos da venda
            const payments = allPayments.filter((payment: any) => payment.sale_id === sale.id);
            
            // Debug específico para a venda problemática
            if (sale.id.includes('06befdd0')) {
              console.log(`🔍 [useAtacadoSales] DEBUG VENDA 06befdd0:`, {
                saleId: sale.id,
                saleStatus: sale.status,
                saleTotal: sale.total_cents,
                paymentsFound: payments.length,
                payments: payments,
                allPaymentsCount: allPayments.length,
                allPaymentsSample: allPayments.slice(0, 3)
              });
            }

            // Buscar dados do cliente
            let client = null;
            if (sale.client_id) {
              client = allClients.find((c: any) => c.id === sale.client_id) || null;
            }

            // Buscar dados do usuário
            let user = null;
            if (sale.user_id) {
              user = allUsers.find((u: any) => u.id === sale.user_id) || null;
            }

            // Buscar dados dos produtos para cada item
            const itemsWithProducts = items.map((item: any) => {
              const product = allProducts.find((p: any) => p.id === item.product_id) || null;
              
              console.log(`🔍 [useAtacadoSales] Item ${item.id.slice(-8)}:`, {
                itemId: item.id,
                productId: item.product_id,
                productFound: !!product,
                productName: product?.name || 'Produto não encontrado',
                allProductsCount: allProducts.length
              });
              
              return {
                ...item,
                product
              };
            });

            const saleWithDetails = {
              ...sale,
              items: itemsWithProducts,
              payments,
              client,
              user
            };

            console.log(`✅ [useAtacadoSales] Venda ${sale.id.slice(-8)} processada:`, {
              saleId: sale.id,
              itemsCount: itemsWithProducts.length,
              items: itemsWithProducts,
              paymentsCount: payments.length,
              totalCents: sale.total_cents
            });

            salesWithDetails.push(saleWithDetails);
          } catch (error) {
            console.error('Erro ao carregar detalhes da venda:', sale.id, error);
            salesWithDetails.push({
              ...sale,
              channel: 'ATACADO' as const,
              items: [],
              payments: [],
              client: null,
              user: null
            } as any);
          }
        }

        return salesWithDetails;
      } catch (error) {
        console.error('Erro ao buscar vendas de atacado:', error);
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minuto
    refetchOnWindowFocus: false
  });

  // Mutation para criar nova venda de atacado
  const createAtacadoSaleMutation = useMutation({
    mutationFn: async (saleData: Partial<AtacadoSale>) => {
      const response = await universalDataAdapter.createSale({
        ...saleData,
        channel: 'ATACADO',
        status: saleData.status || 'FECHADA' // Usar status fornecido ou FECHADA por padrão
      });

      if (response.error) {
        throw new Error(String(response.error));
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
      toast({
        title: "Sucesso",
        description: "Venda de atacado criada com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar venda de atacado",
        variant: "destructive"
      });
    }
  });

  // Mutation para adicionar item à venda
  const addItemToSaleMutation = useMutation({
    mutationFn: async ({ saleId, itemData }: { saleId: string; itemData: Partial<AtacadoSaleItem> }) => {
      const response = await universalDataAdapter.createSaleItem({
        sale_id: saleId,
        product_id: itemData.product_id!,
        qty: itemData.qty!,
        unit_price_cents: itemData.unit_price_cents!,
        discount_percent: itemData.discount_percent || 0
      } as any);

      if (response.error) {
        throw new Error(String(response.error));
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar item à venda",
        variant: "destructive"
      });
    }
  });

  // Mutation para finalizar venda
  const finalizeSaleMutation = useMutation({
    mutationFn: async ({ saleId, paymentData }: { saleId: string; paymentData?: any }) => {
      // Atualizar status da venda
      const saleResponse = await universalDataAdapter.updateSale(saleId, {
        status: 'FECHADA',
        closed_at: new Date().toISOString()
      });

      if (saleResponse.error) {
        throw new Error(String(saleResponse.error));
      }

      // Se houver dados de pagamento, criar pagamento
      if (paymentData) {
        const paymentResponse = await universalDataAdapter.createPayment({
          sale_id: saleId,
          ...paymentData
        });

        if (paymentResponse.error) {
          throw new Error(String(paymentResponse.error));
        }
      }

      return saleResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
      toast({
        title: "Sucesso",
        description: "Venda de atacado finalizada com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao finalizar venda",
        variant: "destructive"
      });
    }
  });

  // Função para calcular métricas de atacado
  const calculateAtacadoMetrics = useCallback(() => {
    const closedSales = atacadoSales.filter(sale => sale.status === 'FECHADA');
    
    const totalRevenue = closedSales.reduce((sum, sale) => {
      return sum + (sale.total_cents || 0);
    }, 0);

    const totalItems = closedSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + item.qty, 0);
    }, 0);

    const totalProfit = closedSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item: any) => {
        const profitPerUnit = item.profit_per_unit_cents || ((item.unit_price_cents || 0) - (item.product?.cost_cents || 0));
        return itemSum + (profitPerUnit * item.qty);
      }, 0);
    }, 0);

    const averageOrderValue = closedSales.length > 0 ? totalRevenue / closedSales.length : 0;

    return {
      totalSales: closedSales.length,
      totalRevenue,
      totalItems,
      totalProfit,
      averageOrderValue
    };
  }, [atacadoSales]);

  // Mutação para excluir uma venda
  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return await universalDataAdapter.deleteSale(saleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir venda:', error);
    }
  });

  // Mutação para excluir múltiplas vendas
  const deleteSalesMutation = useMutation({
    mutationFn: async (saleIds: string[]) => {
      return await universalDataAdapter.deleteSales(saleIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atacado-sales'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir vendas:', error);
    }
  });

  return {
    atacadoSales,
    isLoading,
    refreshSales: refetch,
    createAtacadoSale: createAtacadoSaleMutation.mutateAsync,
    addItemToSale: addItemToSaleMutation.mutateAsync,
    finalizeSale: finalizeSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
    deleteSales: deleteSalesMutation.mutateAsync,
    calculateAtacadoMetrics,
    isCreating: createAtacadoSaleMutation.isPending,
    isAddingItem: addItemToSaleMutation.isPending,
    isFinalizing: finalizeSaleMutation.isPending
  };
}
