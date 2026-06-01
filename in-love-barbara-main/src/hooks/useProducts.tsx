import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { productCache } from '@/lib/product-cache';

export interface Product {
  id: string;
  name: string;
  short_code?: string | null;
  price?: number;
  category?: string;
  qr_code?: string;
  stock?: number;
  brand?: string;
  supplier?: string;
  size?: string;
  created_at?: string;
  updated_at?: string;
  // Relations from API joins
  categories?: {
    id: string;
    name: string;
  };
  brands?: {
    id: string;
    name: string;
  };
  suppliers?: {
    id: string;
    name: string;
    whatsapp?: string;
  };
  // Campos adicionais para edição
  brand_id?: string;
  supplier_id?: string;
  category_id?: string;
  price_cents?: number;
  cost_price_cents?: number;
  cost_cents?: number;
  stock_min?: number;
  stock_quantity?: number;
  stock_consigned?: number;
  stock_physical?: number;
  min_stock?: number;
  cost_price?: number;
  color?: string;
  description?: string;
  active?: boolean;
  photo_url?: string;
}

export function useProducts() {
  const queryClient = useQueryClient();
  
  // Carrega produtos do sistema (Supabase ou Local) - VERSÃO ULTRA RÁPIDA COM CACHE
  const { data: rawProducts = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const startTime = Date.now()
        
        // Verificar cache primeiro
        const cachedProducts = productCache.get('products')
        if (cachedProducts) {
          console.log(`⚡ [useProducts] Produtos carregados do cache em ${Date.now() - startTime}ms`)
          return cachedProducts
        }
        
        // Usar método mais simples primeiro para carregamento rápido
        const response = await universalDataAdapter.getProducts()
        
        const endTime = Date.now()
        
        if (response.error) {
          console.error('❌ [useProducts] Erro no getProducts:', response.error)
          return []
        }
        
        const products = response.data || []
        
        // Salvar no cache
        productCache.set('products', products)
        
        console.log(`⚡ [useProducts] ${products.length} produtos carregados do Supabase em ${endTime - startTime}ms`)
        return products
      } catch (error) {
        console.error('❌ [useProducts] Erro ao carregar produtos:', error)
        return []
      }
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnMount: false, // Não recarregar se já tem cache
    refetchOnWindowFocus: false, // Não refaz fetch ao focar na janela
    refetchOnReconnect: false, // Não refaz fetch ao reconectar
    gcTime: 30 * 60 * 1000, // ✅ OTIMIZADO: Cache por 30 minutos
    retry: 1, // Apenas 1 tentativa para ser mais rápido
    retryDelay: 200 // Delay mínimo entre tentativas
  });

  // Sistema local não precisa de real-time subscriptions
  // Os dados são atualizados via Context quando necessário

  // Mapeia os dados para o formato esperado - VERSÃO SIMPLIFICADA
  const products: Product[] = Array.isArray(rawProducts) ? rawProducts.map((product: any) => ({
    id: product.id,
    name: product.name,
    short_code: product.short_code || '',
    price: product.price_cents ? product.price_cents / 100 : (product.price || 0),
    category: product.category || 'Sem categoria',
    qr_code: product.qr_code || '',
    stock: product.stock || 0, // ✅ Estoque disponível (físico - consignado)
    brand: product.brand || '',
    supplier: product.supplier || '',
    size: product.size || '',
    created_at: product.created_at,
    updated_at: product.updated_at || product.created_at,
    // Campos adicionais para compatibilidade
    brand_id: product.brand_id,
    supplier_id: product.supplier_id,
    category_id: product.category_id,
    price_cents: product.price_cents,
    cost_price_cents: product.cost_price_cents,
    cost_price: product.cost_price_cents ? product.cost_price_cents / 100 : 0,
    stock_min: product.stock_min,
    color: product.color,
    description: product.description,
    active: product.active,
    photo_url: product.photo_url,
    // ✅ Novos campos para estoque consignado
    stock_consigned: product.stock_consigned || 0,
    stock_physical: product.stock_physical || (product.stock || 0)
  })) : [];

  const generateQRCode = async (productId: string, shortCode: string): Promise<string> => {
    try {
      // Gera o conteúdo do QR Code no formato esperado
      const qrContent = `inlove_product:${shortCode}`;
      
      // Usando a API do QR Server (gratuita)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}`;
      
      return qrUrl;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw error;
    }
  };

  const findProductByQR = (qrCode: string): Product | null => {
    // Procura produto pelo QR code exato
    let product = products.find(p => p.qr_code === qrCode) || null;

    if (!product) {
      // Tenta fazer parse do formato inlove_product:shortCode
      const parts = qrCode.split(':');
      if (parts.length === 2 && parts[0] === 'inlove_product') {
        const [, shortCode] = parts;
        product = products.find(p => p.short_code === shortCode) || null;
      }
    }

    if (!product) {
      // Busca por conteúdo parcial
      product = products.find(p =>
        qrCode.includes(p.short_code) ||
        qrCode.includes(p.id) ||
        p.qr_code.includes(qrCode)
      ) || null;
    }

    if (!product) {
      // Busca por nome (parcial)
      const lc = qrCode.toLowerCase();
      product = products.find(p =>
        p.name.toLowerCase().includes(lc) ||
        lc.includes(p.name.toLowerCase().substring(0, 5))
      ) || null;
    }

    return product;
  };

  const findProductByCode = (code: string): Product | null => {
    // Normalizar entrada removendo espaços extras
    const normalizedCode = code.trim();
    
    console.log(`[findProductByCode] Buscando produto com código: "${normalizedCode}"`);
    
    // 1. Buscar por short_code exato (prioridade máxima para códigos de barras)
    let product = products.find(p => p.short_code === normalizedCode) || null;
    if (product) {
      console.log(`[findProductByCode] Encontrado por short_code: ${product.name}`);
      return product;
    }
    
    // 2. Buscar por QR code completo (prioridade alta para QR codes)
    product = products.find(p => p.qr_code === normalizedCode) || null;
    if (product) {
      console.log(`[findProductByCode] Encontrado por QR code: ${product.name}`);
      return product;
    }
    
    // 3. Tentar parse de formato inlove_product:shortCode (formato padrão de QR codes)
    const parts = normalizedCode.split(':');
    if (parts.length === 2 && parts[0] === 'inlove_product') {
      const [, shortCode] = parts;
      console.log(`[findProductByCode] Tentando buscar por short_code extraído: "${shortCode}"`);
      product = products.find(p => p.short_code === shortCode) || null;
      if (product) {
        console.log(`[findProductByCode] Encontrado por formato inlove_product: ${product.name}`);
        return product;
      }
    }
    
    // 4. Buscar por ID exato
    product = products.find(p => p.id === normalizedCode) || null;
    if (product) {
      console.log(`[findProductByCode] Encontrado por ID: ${product.name}`);
      return product;
    }
    
    // 5. Busca por conteúdo parcial em QR codes (para QR codes customizados)
    if (normalizedCode.length > 10) {
      product = products.find(p =>
        p.qr_code && p.qr_code.includes(normalizedCode) ||
        normalizedCode.includes(p.short_code) ||
        normalizedCode.includes(p.id)
      ) || null;
      if (product) {
        console.log(`[findProductByCode] Encontrado por conteúdo parcial: ${product.name}`);
        return product;
      }
    }
    
    // 6. Busca parcial por nome (case-insensitive) - apenas se código for curto
    if (normalizedCode.length <= 20) {
      const lc = normalizedCode.toLowerCase();
      product = products.find(p =>
        p.name.toLowerCase().includes(lc) ||
        lc.includes(p.name.toLowerCase().substring(0, 5))
      ) || null;
      if (product) {
        console.log(`[findProductByCode] Encontrado por nome parcial: ${product.name}`);
        return product;
      }
    }
    
    console.log(`[findProductByCode] Produto não encontrado para código: "${normalizedCode}"`);
    console.log(`[findProductByCode] Produtos disponíveis:`, products.map(p => ({ short_code: p.short_code, qr_code: p.qr_code, name: p.name })));
    return null;
  };

  const findProductsByCode = (code: string): Product[] => {
    // Normalizar entrada removendo espaços extras
    const normalizedCode = code.trim();
    
    console.log(`[findProductsByCode] Buscando produtos com código: "${normalizedCode}"`);
    
    // 1. Buscar por short_code exato (prioridade máxima para códigos de barras)
    let foundProducts = products.filter(p => p.short_code === normalizedCode);
    if (foundProducts.length > 0) {
      console.log(`[findProductsByCode] Encontrados ${foundProducts.length} por short_code`);
      return foundProducts;
    }
    
    // 2. Buscar por QR code completo (prioridade alta para QR codes)
    foundProducts = products.filter(p => p.qr_code === normalizedCode);
    if (foundProducts.length > 0) {
      console.log(`[findProductsByCode] Encontrados ${foundProducts.length} por QR code`);
      return foundProducts;
    }
    
    // 3. Tentar parse de formato inlove_product:shortCode (formato padrão de QR codes)
    const parts = normalizedCode.split(':');
    if (parts.length === 2 && parts[0] === 'inlove_product') {
      const [, shortCode] = parts;
      console.log(`[findProductsByCode] Tentando buscar por short_code extraído: "${shortCode}"`);
      foundProducts = products.filter(p => p.short_code === shortCode);
      if (foundProducts.length > 0) {
        console.log(`[findProductsByCode] Encontrados ${foundProducts.length} por formato inlove_product`);
        return foundProducts;
      }
    }
    
    // 4. Buscar por ID exato
    foundProducts = products.filter(p => p.id === normalizedCode);
    if (foundProducts.length > 0) {
      console.log(`[findProductsByCode] Encontrados ${foundProducts.length} por ID`);
      return foundProducts;
    }
    
    // 5. Busca por conteúdo parcial em QR codes (para QR codes customizados)
    if (normalizedCode.length > 10) {
      foundProducts = products.filter(p =>
        p.qr_code && p.qr_code.includes(normalizedCode) ||
        normalizedCode.includes(p.short_code) ||
        normalizedCode.includes(p.id)
      );
      if (foundProducts.length > 0) {
        console.log(`[findProductsByCode] Encontrados ${foundProducts.length} por conteúdo parcial`);
        return foundProducts;
      }
    }
    
    // 6. Busca parcial por nome (case-insensitive) - apenas se código for curto
    if (normalizedCode.length <= 20) {
      const lc = normalizedCode.toLowerCase();
      foundProducts = products.filter(p =>
        p.name.toLowerCase().includes(lc) ||
        lc.includes(p.name.toLowerCase().substring(0, 5))
      );
      if (foundProducts.length > 0) {
        console.log(`[findProductsByCode] Encontrados ${foundProducts.length} por nome parcial`);
        return foundProducts;
      }
    }
    
    console.log(`[findProductsByCode] Nenhum produto encontrado para código: "${normalizedCode}"`);
    return [];
  };

  const forceRefresh = () => {
    console.log('🔄 [Products] Forcing products refresh...');
    productCache.clear() // Limpar cache local
    // Invalidate all product-related queries
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-availability'] });
    // Also trigger refetch immediately
    queryClient.refetchQueries({ queryKey: ['products'] });
    queryClient.refetchQueries({ queryKey: ['products-availability'] });
    console.log('✅ [Products] Cache invalidated and refetch triggered');
  };

  // Função para buscar produtos com relações (para atacado)
  const getProductsWithRelations = async () => {
    try {
      const response = await universalDataAdapter.getProductsWithRelations();
      if (response.error) {
        console.error('Erro ao buscar produtos com relações:', response.error);
        return [];
      }
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar produtos com relações:', error);
      return [];
    }
  };

  return {
    products,
    isLoading,
    error,
    generateQRCode,
    findProductByQR,
    findProductByCode,
    findProductsByCode,
    getProductsWithRelations,
    forceRefresh
  };
}