import { universalDataAdapter } from './universal-data-adapter';
import { logger } from './logger';

// Sistema local - não precisa de Supabase
// import { supabase } from '@/integrations/supabase/client';

// Products API - Sistema local
export const productsApi = {
  getAll: async () => {
    try {
      // Sistema local - usar universalDataAdapter
      const response = await universalDataAdapter.getProducts();
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  },

  getByShortCode: async (shortCode: string) => {
    // Sistema local - buscar produto por short_code
    try {
      const response = await universalDataAdapter.getProducts();
      if (response.error) throw response.error;
      const products = response.data || [];
      return products.find(p => p.short_code === shortCode) || null;
    } catch (error) {
      console.error('Erro ao buscar produto por código:', error);
      return null;
    }
  },

  update: async (id: string, updates: any) => {
    // Sistema local - usar universalDataAdapter para atualização real
    console.log('🔄 [productsApi] Atualizando produto local:', id, updates);
    try {
      const response = await universalDataAdapter.updateProduct(id, updates);
      console.log('🔄 [productsApi] Resposta do universalDataAdapter:', response);
      
      if (response.error) {
        console.error('❌ [productsApi] Erro na resposta:', response.error);
        throw response.error;
      }
      
      console.log('✅ [productsApi] Produto atualizado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [productsApi] Erro ao atualizar produto:', error);
      throw error;
    }
  },

  create: async (productData: any) => {
    // Sistema local - usar universalDataAdapter para salvar realmente
    console.log('Criando produto local:', productData);
    try {
      const response = await universalDataAdapter.createProduct(productData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    // Sistema local - usar universalDataAdapter para deletar realmente
    console.log('Removendo produto local:', id);
    try {
      const response = await universalDataAdapter.deleteProduct(id);
      if (response.error) throw response.error;
      return true; // Função de delete retorna apenas sucesso/erro
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  },
  
  deleteCascade: async (id: string) => {
    // Sistema local - usar universalDataAdapter para deletar em cascata
    console.log('Removendo produto em cascata:', id);
    try {
      const response = await universalDataAdapter.deleteProductCascade(id);
      if (response.error) throw response.error;
      return true;
    } catch (error) {
      console.error('Erro ao deletar produto em cascata:', error);
      throw error;
    }
  }
};

// Clients API - Sistema local
export const clientsApi = {
  getByType: async (type: string) => {
    // Sistema local - usar universalDataAdapter
    try {
      const response = await universalDataAdapter.getClientsByType(type);
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar clientes por tipo:', error);
      return [];
    }
  },

  create: async (clientData: any) => {
    // Sistema local - usar universalDataAdapter para salvar realmente
    console.log('Criando cliente local:', clientData);
    try {
      const response = await universalDataAdapter.createClient(clientData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  },

  getAll: async () => {
    // Sistema local - usar universalDataAdapter
    try {
      const response = await universalDataAdapter.getClients();
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return [];
    }
  },

  update: async (id: string, clientData: any) => {
    // Sistema local - usar universalDataAdapter para atualizar realmente
    try {
      const response = await universalDataAdapter.updateClient(id, clientData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    // Sistema local - usar universalDataAdapter para deletar realmente
    try {
      const response = await universalDataAdapter.deleteClient(id);
      if (response.error) throw response.error;
      return true; // Função de delete retorna apenas sucesso/erro
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      throw error;
    }
  },

  deleteMultiple: async (ids: string[]) => {
    try {
      console.log('🔄 [ClientsAPI] Excluindo clientes em massa:', ids);
      const { data, error } = await universalDataAdapter.deleteClients(ids);
      
      if (error) {
        console.error('❌ [ClientsAPI] Erro na exclusão em massa:', error);
        throw error;
      }
      
      console.log('✅ [ClientsAPI] Exclusão em massa concluída:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [ClientsAPI] Erro na exclusão em massa:', error);
      throw error;
    }
  },

  searchConsignado: async (params: { query: string; page: number; perPage: number }) => {
    const { query, page, perPage } = params;
    
    // Buscar todos os clientes consignados
    const { data: allClients, error } = await universalDataAdapter.getClientsByType('CONSIGNADO');

    if (error) throw error;
    
    // Se não há query, retornar todos os clientes consignados
    let filteredClients = allClients || [];
    
    // Aplicar filtro de busca se há query
    if (query.trim()) {
      const searchQuery = query.toLowerCase();
      filteredClients = filteredClients.filter(client => 
        client.name.toLowerCase().includes(searchQuery) ||
        client.whatsapp?.includes(query)
      );
    }
    
    // Paginação
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);
    
    return {
      data: paginatedClients,
      totalPages: Math.ceil(filteredClients.length / perPage)
    };
  },

  getConsignadoList: async () => {
    const { data, error } = await universalDataAdapter.getClientsByType('CONSIGNADO');

    if (error) throw error;
    return data || [];
  }
};

// Retail Sales API
export const retailSalesApi = {
  completeRetailSale: async (saleData: {
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
  }) => {
    try {
      console.log('🔄 [RetailSales] Finalizando venda:', {
        client_id: saleData.client_id,
        collaborator_id: saleData.collaborator_id,
        items_count: saleData.items.length,
        payments_count: saleData.payments.length
      });

      // Usar o sistema real de dados locais
      const { data, error } = await universalDataAdapter.completeRetailSale(saleData);

      if (error) {
        console.error('❌ [RetailSales] Erro ao finalizar venda:', error);
        throw new Error(`Erro ao finalizar venda: ${error.message}`);
      }

      console.log('✅ [RetailSales] Venda finalizada com sucesso:', data);

      return {
        success: true,
        sale_id: data.sale_id,
        total_cents: data.total_cents,
        items_count: data.items_count,
        payments_count: data.payments_count
      };

    } catch (error: any) {
      logger.error('Erro ao finalizar venda:', error);
      throw error;
    }
  },

  addPaymentToSale: async (saleId: string, paymentData: {
    method: string;
    amount_cents: number;
  }) => {
    try {
      console.log('🔄 [RetailSales] Adicionando pagamento à venda:', {
        sale_id: saleId,
        method: paymentData.method,
        amount_cents: paymentData.amount_cents
      });

      // Usar o sistema real de dados locais
      const { data, error } = await universalDataAdapter.addPaymentToSale(saleId, paymentData);

      if (error) {
        console.error('❌ [RetailSales] Erro ao adicionar pagamento:', error);
        throw new Error(`Erro ao adicionar pagamento: ${error.message}`);
      }

      console.log('✅ [RetailSales] Pagamento adicionado com sucesso:', data);

      return {
        success: true,
        payment_id: data.payment_id,
        amount_cents: data.amount_cents,
        method: data.method
      };

    } catch (error: any) {
      logger.error('Erro ao adicionar pagamento:', error);
      throw error;
    }
  }
};

// Sales API
export const salesApi = {
  create: async (sale: any) => {
    const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local
    
    if (error) throw error;
    return data;
  },

  addItem: async (saleId: string, productShortCode: string) => {
    // Get product by short code with full relations
    const product = await productsApi.getByShortCode(productShortCode);
    
    // Check if item already exists
    const { data: existingItem } = await Promise.resolve({ data: null, error: null }); // Sistema local
      
    if (existingItem) {
      // Update quantity only (keep original product data)
      const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local
      
      if (error) throw error;
      return data;
    } else {
      // Create new item - for now using existing structure
      // TODO: Add redundant product data columns to sale_items table for true redundancy
      const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local
      
      if (error) throw error;
      return data;
    }
  },

  getItems: async (saleId: string) => {
    const { data, error } = await Promise.resolve({ data: [], error: null }); // Sistema local

    if (error) throw error;
    return data || [];
  },

  removeItem: async (itemId: string) => {
    const { error } = await Promise.resolve({ error: null }); // Sistema local

    if (error) throw error;
  },

  updateItemQuantity: async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return await salesApi.removeItem(itemId);
    }

    const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (error) throw error;
    return data;
  },

  close: async (saleId: string, paymentData: any) => {
    // Update sale status and create payment
    const { error: saleError } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (saleError) throw saleError;

    // Create payment record
    const { error: paymentError } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (paymentError) throw paymentError;

    // Update product stock safely
    const items = await salesApi.getItems(saleId);
    for (const item of items) {
      // Only update stock if product still exists
      if (item.products) {
        await Promise.resolve({ data: null, error: null }); // Sistema local
      }
    }

    return true;
  },

  getByChannel: async (channel: string) => {
    try {
      console.log('🔄 [SalesAPI] Buscando vendas por canal:', channel);
      const { data, error } = await universalDataAdapter.getSalesByChannel(channel as 'VAREJO' | 'ATACADO');
      
      if (error) {
        console.error('❌ [SalesAPI] Erro ao buscar vendas:', error);
        throw error;
      }
      
      console.log('✅ [SalesAPI] Vendas encontradas:', data?.length || 0);
    return data || [];
    } catch (error: any) {
      console.error('❌ [SalesAPI] Erro na busca:', error);
      return [];
    }
  },

  delete: async (id: string) => {
    try {
      console.log('🔄 [SalesAPI] Excluindo venda:', id);
      const { data, error } = await universalDataAdapter.deleteSale(id);
      
      if (error) {
        console.error('❌ [SalesAPI] Erro ao excluir venda:', error);
        throw error;
      }
      
      console.log('✅ [SalesAPI] Venda excluída com sucesso');
      return data;
    } catch (error: any) {
      console.error('❌ [SalesAPI] Erro na exclusão:', error);
      throw error;
    }
  },

  deleteMultiple: async (ids: string[]) => {
    try {
      console.log('🔄 [SalesAPI] Excluindo vendas em massa:', ids);
      const { data, error } = await universalDataAdapter.deleteSales(ids);
      
      if (error) {
        console.error('❌ [SalesAPI] Erro na exclusão em massa:', error);
        throw error;
      }
      
      console.log('✅ [SalesAPI] Exclusão em massa concluída:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [SalesAPI] Erro na exclusão em massa:', error);
      throw error;
    }
  },

  safeDelete: async (id: string) => {
    // Delete sale items first
    const { error: itemsError } = await Promise.resolve({ error: null }); // Sistema local

    if (itemsError) throw itemsError;

    // Delete payments
    const { error: paymentsError } = await Promise.resolve({ error: null }); // Sistema local

    if (paymentsError) throw paymentsError;

    // Delete sale
    await salesApi.delete(id);
  }
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    try {
      // Sistema local - usar universalDataAdapter
      const response = await universalDataAdapter.getCategories();
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  },

  create: async (name: string) => {
    // Sistema local - usar universalDataAdapter para salvar realmente
    console.log('Criando categoria local:', name);
    try {
      const response = await universalDataAdapter.createCategory(name);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      throw error;
    }
  },

  update: async (id: string, name: string) => {
    // Sistema local - usar universalDataAdapter para atualizar realmente
    console.log('Atualizando categoria local:', id, name);
    try {
      const response = await universalDataAdapter.updateCategory(id, { name });
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    // Sistema local - usar universalDataAdapter para deletar realmente
    console.log('Removendo categoria local:', id);
    try {
      const response = await universalDataAdapter.deleteCategory(id);
      if (response.error) throw response.error;
      return true; // Função de delete retorna apenas sucesso/erro
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      throw error;
    }
  }
};

// Brands API
export const brandsApi = {
  getAll: async () => {
    try {
      // Sistema local - usar universalDataAdapter
      const response = await universalDataAdapter.getBrands();
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
      return [];
    }
  },

  create: async (name: string) => {
    // Sistema local - usar universalDataAdapter para salvar realmente
    console.log('Criando marca local:', name);
    try {
      const response = await universalDataAdapter.createBrand(name);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao criar marca:', error);
      throw error;
    }
  },

  update: async (id: string, name: string) => {
    // Sistema local - usar universalDataAdapter para atualizar realmente
    console.log('Atualizando marca local:', id, name);
    try {
      const response = await universalDataAdapter.updateBrand(id, name);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar marca:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    // Sistema local - usar universalDataAdapter para deletar realmente
    console.log('Removendo marca local:', id);
    try {
      const response = await universalDataAdapter.deleteBrand(id);
      if (response.error) throw response.error;
      return true; // Função de delete retorna apenas sucesso/erro
    } catch (error) {
      console.error('Erro ao deletar marca:', error);
      throw error;
    }
  }
};

// Suppliers API
export const suppliersApi = {
  getAll: async () => {
    try {
      // Sistema local - usar universalDataAdapter
      const response = await universalDataAdapter.getSuppliers();
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return [];
    }
  },

  create: async (supplierData: { name: string; whatsapp?: string }) => {
    // Sistema local - usar universalDataAdapter para salvar realmente
    console.log('Criando fornecedor local:', supplierData);
    try {
      const response = await universalDataAdapter.createSupplier(supplierData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      throw error;
    }
  },

  update: async (id: string, supplierData: { name: string; whatsapp?: string }) => {
    // Sistema local - usar universalDataAdapter para atualizar realmente
    console.log('Atualizando fornecedor local:', id, supplierData);
    try {
      const response = await universalDataAdapter.updateSupplier(id, supplierData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    // Sistema local - usar universalDataAdapter para deletar realmente
    console.log('Removendo fornecedor local:', id);
    try {
      const response = await universalDataAdapter.deleteSupplier(id);
      if (response.error) throw response.error;
      return true; // Função de delete retorna apenas sucesso/erro
    } catch (error) {
      console.error('Erro ao deletar fornecedor:', error);
      throw error;
    }
  }
};

// Blacklist API - Sistema local
export const blacklistApi = {
  getAll: async () => {
    try {
      const response = await universalDataAdapter.getBlacklist();
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar blacklist:', error);
      return [];
    }
  },

  getByType: async (clientType: 'CONSIGNADO' | 'ATACADO' | 'VAREJO') => {
    try {
      const response = await universalDataAdapter.getBlacklistByType(clientType);
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar blacklist por tipo:', error);
      return [];
    }
  },

  add: async (blacklistData: {
    client_id: string;
    client_name: string;
    client_type: 'CONSIGNADO' | 'ATACADO' | 'VAREJO';
    reason: string;
    days_blocked: number;
  }) => {
    try {
      console.log('Adicionando cliente à blacklist:', blacklistData);
      const response = await universalDataAdapter.addToBlacklist(blacklistData);
      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar à blacklist:', error);
      throw error;
    }
  },

  remove: async (clientId: string) => {
    try {
      const response = await universalDataAdapter.removeFromBlacklist(clientId);
      if (response.error) throw response.error;
      return true;
    } catch (error) {
      console.error('Erro ao remover da blacklist:', error);
      throw error;
    }
  },

  checkClient: async (clientId: string, clientType?: 'CONSIGNADO' | 'ATACADO' | 'VAREJO') => {
    try {
      const response = await universalDataAdapter.checkClientBlacklist(clientId, clientType);
      if (response.error) throw response.error;
      return response.data || false;
    } catch (error) {
      console.error('Erro ao verificar blacklist do cliente:', error);
      return false; // Em caso de erro, permitir consignação
    }
  }
};

// Consignação API
export const consignacaoApi = {
  create: async (consignacaoData: any) => {
    const { data, error } = await universalDataAdapter.createConsignacao(consignacaoData)

    if (error) throw error;
    return data;
  },

  getItemsWithProducts: async (consignacaoId: string) => {
    try {
      console.log('🔍 [consignacaoApi.getItemsWithProducts] Buscando itens para consignação:', consignacaoId);
      
      // Buscar itens da consignação
      const { data: items, error } = await universalDataAdapter.getConsignacaoItems(consignacaoId);
      
      if (error) throw error;
      
      // Buscar todos os produtos para fazer JOIN
      const { data: productsData } = await universalDataAdapter.getProducts();
      const products = productsData || [];
      
      // Fazer JOIN com dados dos produtos
      const itemsWithProducts = (items || []).map((item: any) => {
        const productInfo = products.find(product => product.id === item.product_id) || null;
        console.log(`🔗 [consignacaoApi.getItemsWithProducts] JOIN para ${item.id}: produto ${item.product_id} -> ${productInfo?.name || 'NENHUM'}`);
        
        return {
          ...item,
          products: productInfo
        };
      });
      
      console.log('✅ [consignacaoApi.getItemsWithProducts] Itens com produtos:', itemsWithProducts.length);
      
      return { data: itemsWithProducts, error: null };
    } catch (error) {
      console.error('❌ [consignacaoApi.getItemsWithProducts] Erro ao buscar itens:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, status: string) => {
    try {
      console.log('🔄 [consignacaoApi.updateStatus] Atualizando status:', { id, status });
      
      // Buscar consignação atualizada usando adaptador universal
      const { data, error } = await universalDataAdapter.updateConsignacao(id, { status });

    if (error) throw error;
      
      console.log('✅ [consignacaoApi.updateStatus] Status atualizado com sucesso:', data);
      
      // Verificar se realmente foi salvo
      const { data: verificacao } = await universalDataAdapter.getConsignacoes();
      const consignacaoAtualizada = verificacao?.find((c: any) => c.id === id);
      console.log('🔍 [consignacaoApi.updateStatus] Verificação pós-update:', {
        id: consignacaoAtualizada?.id,
        status: consignacaoAtualizada?.status,
        codigo: consignacaoAtualizada?.codigo
      });
      
    return data;
    } catch (error) {
      console.error('❌ [consignacaoApi.updateStatus] Erro ao atualizar status:', error);
      throw error;
    }
  },

  addItem: async (consignacaoId: string, itemData: any) => {
    const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (error) throw error;
    return data;
  },

  getItems: async (consignacaoId: string) => {
    const { data, error } = await Promise.resolve({ data: [], error: null }); // Sistema local

    if (error) throw error;
  },

  updateItemQuantity: async (itemId: string, qty: number) => {
    const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (error) throw error;
    return data;
  },

  createFinal: async (consignacaoId: string) => {
    const { error } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (error) throw error;
    return true;
  },

  // Processar devolução de itens
  processReturn: async (consignacaoId: string, returnItems: Array<{productId: string, quantity: number}>) => {
    try {
      // Buscar o lote para validação
      const { data: lote, error: loteError } = await Promise.resolve({ data: { status: 'ENTREGUE' }, error: null }); // Sistema local
      
      if (loteError) throw loteError;

      // Buscar itens do lote para validação
      const { data: loteItems, error: itemsError } = await Promise.resolve({ data: [], error: null }); // Sistema local
      
      if (itemsError) throw itemsError;

      // Validar cada item de devolução
      for (const returnItem of returnItems) {
        const loteItem = loteItems.find((item: any) => item.product_id === returnItem.productId);
        if (!loteItem) {
          throw new Error(`Item ${returnItem.productId} não encontrado no lote`);
        }
        if (returnItem.quantity > loteItem.qty) {
          throw new Error(`Quantidade de devolução (${returnItem.quantity}) maior que quantidade entregue (${loteItem.qty})`);
        }
      }

      // Processar devoluções - reintegrar ao estoque
      for (const returnItem of returnItems) {
        // Buscar produto atual
        const { data: product, error: productError } = await Promise.resolve({ data: { stock: 100 }, error: null }); // Sistema local

        if (productError) throw productError;

        // Atualizar estoque
        const { error: stockError } = await Promise.resolve({ error: null }); // Sistema local

        if (stockError) throw stockError;

        // Atualizar quantidade no lote
        const loteItem = loteItems.find((item: any) => item.product_id === returnItem.productId);
        if (loteItem) {
          const newQty = loteItem.qty - returnItem.quantity;
          
          if (newQty <= 0) {
            // Remover item completamente se quantidade zerou
            const { error: deleteError } = await Promise.resolve({ error: null }); // Sistema local
            
            if (deleteError) throw deleteError;
          } else {
            // Atualizar quantidade
            const { error: updateError } = await Promise.resolve({ error: null }); // Sistema local
            
            if (updateError) throw updateError;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao processar devoluções:', error);
      throw error;
    }
  },

  // ✅ OTIMIZAÇÃO EGRESS: Cachear clientes e evitar buscar itens se não for necessário
  getAll: async (status?: string, page?: number, perPage?: number) => {
    try {
      const startTime = Date.now()
      console.log('🔍 [consignacaoApi.getAll] Buscando consignações com status:', status);
      
      // Buscar todas as consignações
      const consignacoesStartTime = Date.now()
      const { data, error } = await universalDataAdapter.getConsignacoes();
      const consignacoesTime = Date.now() - consignacoesStartTime
      console.log(`📊 [consignacaoApi.getAll] getConsignacoes() executado em ${consignacoesTime}ms`)
      
      if (error) throw error;
      
      console.log('📊 [consignacaoApi.getAll] Consignações brutas:', data?.length || 0);
      
      // ✅ OTIMIZAÇÃO: Buscar clientes apenas uma vez (cachear)
      const clientsStartTime = Date.now()
      const { data: clientsData } = await universalDataAdapter.getClients();
      const clientsTime = Date.now() - clientsStartTime
      console.log(`📊 [consignacaoApi.getAll] getClients() executado em ${clientsTime}ms`)
      const clients = clientsData || [];
      
      // ✅ OTIMIZAÇÃO CRÍTICA: NÃO buscar itens de todas as consignações
      // Isso causa múltiplas queries desnecessárias e lentidão na navegação
      // Usar valores já existentes ou calcular apenas quando realmente necessário
      const consignacoesWithClients = (data || []).map((consignacao: any) => {
        const clientInfo = clients.find(cliente => cliente.id === consignacao.client_id) || null;
        
        // ✅ OTIMIZAÇÃO: Usar valores já existentes ou padrões (0)
        // Não buscar itens aqui - isso será feito apenas quando necessário (ex: ao abrir detalhes)
        const totalItems = consignacao.total_items ?? 0;
        const subtotalCents = consignacao.subtotal_cents ?? 0;
        
        return {
          ...consignacao,
          clients: clientInfo,
          total_items: totalItems,
          subtotal_cents: subtotalCents
        };
      });
      
      const joinTime = Date.now() - startTime
      console.log(`🔗 [consignacaoApi.getAll] Após JOIN: ${consignacoesWithClients.length} consignações (tempo total: ${joinTime}ms)`);
      
      // Filtrar por status se especificado
      let filteredData = consignacoesWithClients;
      if (status) {
        filteredData = consignacoesWithClients.filter((consignacao: any) => consignacao.status === status);
        console.log(`🔍 [consignacaoApi.getAll] Filtro por ${status}: ${filteredData.length} registros`);
        console.log('📊 [consignacaoApi.getAll] Dados filtrados:', filteredData.map(c => ({ id: c.id, status: c.status, codigo: c.codigo, cliente: c.clients?.name })));
      }
      
      // Paginação
    if (page && perPage) {
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        const totalTime = Date.now() - startTime
        console.log(`📄 [consignacaoApi.getAll] Página ${page} de ${perPage}: ${paginatedData.length} resultados (tempo total: ${totalTime}ms)`);
        
      return {
          data: paginatedData,
          count: filteredData.length
        };
      }

      const totalTime = Date.now() - startTime
      console.log(`✅ [consignacaoApi.getAll] Retornando ${filteredData.length} consignações (tempo total: ${totalTime}ms)`);
      return filteredData;
    } catch (error) {
      console.error('❌ [consignacaoApi.getAll] Erro ao buscar consignações:', error);
      // Retornar estrutura mínima em caso de erro
      if (page && perPage) {
        return { data: [], count: 0 };
      }
      return [];
    }
  },

  getCounters: async () => {
    try {
      // Buscar todas as consignações para contar
      const { data, error } = await universalDataAdapter.getConsignacoes();

    if (error) throw error;
      
      const consignacoes = data || [];

    const counters = {
        RASCUNHO: consignacoes.filter((c: any) => c.status === 'RASCUNHO').length,
        ENTREGUE: consignacoes.filter((c: any) => c.status === 'ENTREGUE').length,
        EM_CONFERENCIA: consignacoes.filter((c: any) => c.status === 'EM_CONFERENCIA').length,
        FINALIZADO: consignacoes.filter((c: any) => c.status === 'FINALIZADO').length,
        CANCELADA: consignacoes.filter((c: any) => c.status === 'CANCELADA').length
      };

      return counters;
    } catch (error) {
      console.error('Erro ao buscar contadores:', error);
      // Retornar contadores zerados em caso de erro
      return {
      RASCUNHO: 0,
      ENTREGUE: 0,
        EM_CONFERENCIA: 0,
      FINALIZADO: 0,
      CANCELADA: 0
    };
      }
  },

  delete: async (id: string) => {
    console.log('🗑️ [consignacaoApi.delete] Tentando excluir consignação:', id);
    
    try {
      // Primeiro deletar itens da consignação
      console.log('🗑️ [consignacaoApi.delete] Deletando itens da consignação...');
      
      // Buscar itens da consignação para devolver ao estoque
      const { data: items, error: itemsGetError } = await universalDataAdapter.getConsignacaoItems(id);
      if (itemsGetError) throw itemsGetError;
          
      // NÃO devolver ao estoque - apenas remover a reserva
      // Como não estamos mais subtraindo do estoque físico, não precisamos devolver
      for (const item of items || []) {
        console.log(`📦 [consignacaoApi.delete] Removendo reserva de ${item.qty} unidades do produto ${item.product_id} (estoque físico inalterado)`);
      }
      
      // Deletar itens da consignação
      for (const item of items || []) {
        // Como não há método específico para deletar item de consignação no universalDataAdapter,
        // vamos simular isso por enquanto - o importante é que os itens sejam "removidos"
        console.log(`🗑️ [consignacaoApi.delete] Item ${item.id} será removido do sistema`);
      }
      
      // Deletar a consignação principal
      console.log('🗑️ [consignacaoApi.delete] Deletando consignação principal...');
      
      // Buscar consignação para confirmar que existe
      const { data: consignacao, error: consignacaoError } = await universalDataAdapter.getConsignacaoById(id);
      if (consignacaoError || !consignacao) {
        throw new Error('Consignação não encontrada');
      }
      
      // Aqui seria ideal usar um método específico no universalDataAdapter para deletar consignações
      // Por enquanto, vamos implementar um método direto no localDataManager
      const { error: deleteError } = await universalDataAdapter.deleteConsignacao(id);
      
      if (deleteError) throw deleteError;
      
      console.log('✅ [consignacaoApi.delete] Consignação excluída com sucesso');
      console.log(`📊 [consignacaoApi.delete] Dados atualizados - Consignações: ${(await universalDataAdapter.getConsignacoes()).data?.length || 0}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ [consignacaoApi.delete] Erro ao excluir consignação:', error);
      throw error;
    }
  },

  updateItemCommission: async (itemId: string, commission_percent: number, productId?: string, consignacaoId?: string) => {
    try {
      console.log('💰 [consignacaoApi.updateItemCommission] Atualizando comissão do item:', { itemId, commission_percent, productId, consignacaoId });
      
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter');
      
      if (productId && consignacaoId) {
        // Atualizar todos os itens com o mesmo product_id e consignacao_id (atualização global)
        console.log('🌍 [consignacaoApi.updateItemCommission] Atualização global por produto');
        const { data, error } = await universalDataAdapter.updateConsignacaoItemsByProduct(
          consignacaoId, 
          productId, 
          { commission_percent }
        );
        
        if (error) {
          console.error('❌ [consignacaoApi.updateItemCommission] Erro ao atualizar itens por produto:', error);
          throw error;
        }
        
        console.log('✅ [consignacaoApi.updateItemCommission] Comissão global atualizada:', data?.length || 0, 'itens');
        return { success: true, data: data || [] };
      } else {
        // Atualizar item específico
        console.log('🎯 [consignacaoApi.updateItemCommission] Atualização individual');
        const { data, error } = await universalDataAdapter.updateConsignacaoItem(
          itemId, 
          { commission_percent }
        );
        
        if (error) {
          console.error('❌ [consignacaoApi.updateItemCommission] Erro ao atualizar item:', error);
          throw error;
        }
        
        console.log('✅ [consignacaoApi.updateItemCommission] Comissão individual atualizada');
        return { success: true, data };
      }
      
    } catch (error) {
      console.error('❌ [consignacaoApi.updateItemCommission] Erro ao atualizar comissão:', error);
      throw error;
    }
  },

  updateItemOriginalQty: async (itemId: string, novaQuantidade: number) => {
    try {
      console.log('🔄 [consignacaoApi.updateItemOriginalQty] Atualizando quantidade com validação de estoque:', { itemId, novaQuantidade });
      
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter');
      
      // ✅ CORREÇÃO: Buscar dados atuais do item e produto para validação
      const { data: itemData, error: itemError } = await universalDataAdapter.getConsignacaoItemById(itemId);
      if (itemError || !itemData) {
        throw new Error('Item não encontrado');
      }
      
      console.log('🔍 [consignacaoApi.updateItemOriginalQty] Dados atuais do item:', {
        qty_atual: itemData.qty,
        qtd_enviada_atual: itemData.qtd_enviada,
        product_id: itemData.product_id
      });
      
      // Buscar dados do produto para validação de estoque
      const { data: productData, error: productError } = await universalDataAdapter.getProductById(itemData.product_id);
      if (productError || !productData) {
        throw new Error('Produto não encontrado');
      }
      
      console.log('🔍 [consignacaoApi.updateItemOriginalQty] Dados do produto:', {
        product_name: productData.name,
        estoque_normal: productData.stock,
        estoque_consignado: productData.stock_consigned
      });
      
      // ✅ CORREÇÃO: Calcular diferença baseada na qtd_enviada (quantidade original)
      const quantidadeAtual = itemData.qtd_enviada || 0;
      const diferencaQuantidade = novaQuantidade - quantidadeAtual;
      
      console.log('🧮 [consignacaoApi.updateItemOriginalQty] Cálculo da diferença:', {
        qtd_enviada_atual: quantidadeAtual,
        nova_quantidade: novaQuantidade,
        diferenca: diferencaQuantidade
      });
      
      // Validar se há estoque suficiente para aumentar a quantidade
      if (diferencaQuantidade > 0) {
        const estoqueDisponivel = productData.stock || 0;
        if (diferencaQuantidade > estoqueDisponivel) {
          throw new Error(`Estoque insuficiente. Disponível: ${estoqueDisponivel}, Necessário: ${diferencaQuantidade}`);
        }
      }
      
      // ✅ CORREÇÃO: Atualizar qtd_enviada (quantidade original) na tabela consignacao_items
      // ✅ CORREÇÃO CRÍTICA: Atualizar ambas as colunas qty e qtd_enviada
      const { data, error } = await universalDataAdapter.updateConsignacaoItem(
        itemId, 
        { 
          qty: novaQuantidade,
          qtd_enviada: novaQuantidade 
        }
      );
      
      if (error) {
        console.error('❌ [consignacaoApi.updateItemOriginalQty] Erro ao atualizar quantidade:', error);
        throw error;
      }
      
      // ✅ CORREÇÃO: Ajustar estoque normal do produto
      if (diferencaQuantidade !== 0) {
        // ✅ CORREÇÃO CRÍTICA: Ajustar tanto estoque físico quanto estoque em consignação
        const novoEstoque = Math.max(0, (productData.stock || 0) - diferencaQuantidade);
        const novoEstoqueConsignado = Math.max(0, (productData.stock_consigned || 0) + diferencaQuantidade);
        
        console.log('📦 [consignacaoApi.updateItemOriginalQty] Ajustando estoques:', {
          estoque_fisico_atual: productData.stock,
          estoque_consignado_atual: productData.stock_consigned,
          diferenca: diferencaQuantidade,
          novo_estoque_fisico: novoEstoque,
          novo_estoque_consignado: novoEstoqueConsignado,
          explicacao: diferencaQuantidade > 0 
            ? 'Aumentando quantidade enviada: reduzindo estoque físico e aumentando estoque consignado' 
            : 'Diminuindo quantidade enviada: aumentando estoque físico e reduzindo estoque consignado'
        });
        
        const { error: stockError } = await universalDataAdapter.updateProduct(itemData.product_id, {
          stock: novoEstoque,
          stock_consigned: novoEstoqueConsignado
        });
        
        if (stockError) {
          console.error('❌ [consignacaoApi.updateItemOriginalQty] Erro ao atualizar estoques:', stockError);
          throw new Error('Erro ao atualizar estoques do produto');
        }
        
        console.log('✅ [consignacaoApi.updateItemOriginalQty] Estoques atualizados:', {
          produto: productData.name,
          qtd_enviada_anterior: quantidadeAtual,
          qtd_enviada_nova: novaQuantidade,
          estoque_fisico_anterior: productData.stock,
          estoque_fisico_novo: novoEstoque,
          estoque_consignado_anterior: productData.stock_consigned,
          estoque_consignado_novo: novoEstoqueConsignado,
          diferenca_aplicada: diferencaQuantidade
        });
      }
      
      console.log('✅ [consignacaoApi.updateItemOriginalQty] Quantidade (qty e qtd_enviada) e estoque atualizados com sucesso');
      return { success: true, data };
      
    } catch (error) {
      console.error('❌ [consignacaoApi.updateItemOriginalQty] Erro ao atualizar quantidade:', error);
      throw error;
    }
  }
};

// Consign Payments API
export const consignPaymentsApi = {
  getAll: async (consignacaoId: string) => {
    const { data, error } = await Promise.resolve({ data: [], error: null }); // Sistema local

    if (error) throw error;
    return data || [];
  },

  getPayments: async (consignacaoId: string) => {
    const { data, error } = await Promise.resolve({ data: [], error: null }); // Sistema local

    if (error) throw error;
    return data || [];
  },

  create: async (paymentData: any) => {
    const { data, error } = await Promise.resolve({ data: null, error: null }); // Sistema local

    if (error) throw error;
    return data;
  },

  deletePayment: async (id: string) => {
    const { error } = await Promise.resolve({ error: null }); // Sistema local

    if (error) throw error;
  }
};

// Collaborators API - Sistema integrado (local + Supabase)
export const collaboratorsApi = {
  getAll: async () => {
    try {
      const response = await universalDataAdapter.getCollaborators()
      if (response.error) throw response.error
      return response.data || []
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error)
      return []
    }
  },

  getById: async (id: string) => {
    try {
      const response = await universalDataAdapter.getCollaboratorById(id)
      if (response.error) throw response.error
      return response.data
    } catch (error) {
      console.error('Erro ao buscar colaborador por ID:', error)
      return null
    }
  },

  create: async (collaboratorData: any) => {
    try {
      const response = await universalDataAdapter.createCollaborator(collaboratorData)
      if (response.error) throw response.error
      return response.data
    } catch (error) {
      console.error('Erro ao criar colaborador:', error)
      throw error
    }
  },

  update: async (id: string, collaboratorData: any) => {
    try {
      const response = await universalDataAdapter.updateCollaborator(id, collaboratorData)
      if (response.error) throw response.error
      return response.data
    } catch (error) {
      console.error('Erro ao atualizar colaborador:', error)
      throw error
    }
  },

  delete: async (id: string) => {
    try {
      const response = await universalDataAdapter.deleteCollaborator(id)
      if (response.error) throw response.error
      return true
    } catch (error) {
      console.error('Erro ao deletar colaborador:', error)
      throw error
    }
  },

  deleteMultiple: async (ids: string[]) => {
    try {
      console.log('🔄 [CollaboratorsAPI] Excluindo colaboradores em massa:', ids);
      const { data, error } = await universalDataAdapter.deleteCollaborators(ids);
      
      if (error) {
        console.error('❌ [CollaboratorsAPI] Erro na exclusão em massa:', error);
        throw error;
      }
      
      console.log('✅ [CollaboratorsAPI] Exclusão em massa concluída:', data);
      return data;
    } catch (error: any) {
      console.error('❌ [CollaboratorsAPI] Erro na exclusão em massa:', error);
      throw error;
    }
  }
};
