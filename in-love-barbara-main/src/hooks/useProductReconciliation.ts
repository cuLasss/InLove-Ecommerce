import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { universalDataAdapter } from '@/lib/universal-data-adapter';
import { Product as RealProduct } from '@/hooks/useProducts';

// Usa a interface real de produtos do sistema
export type Product = RealProduct & {
  similarity?: number; // Adiciona campo de similaridade para reconciliação
};

// Tipo para produtos temporários criados durante reconciliação
export type TempProduct = {
  id: string;
  name: string;
  short_code: string;
  category: string;
  price: number;
  stock: number; // Quantidade que será adicionada ao estoque
  qr_code: string;
  brand: string;
  supplier: string;
  size: string;
  created_at: string;
  updated_at: string;
  // Campos adicionais para criação
  categories?: any;
  brands?: any;
  suppliers?: any;
  brand_id?: string;
  supplier_id?: string;
  category_id?: string;
  price_cents?: number;
  cost_price_cents?: number;
  stock_min?: number;
  color?: string;
  description?: string;
  photo_url?: string; // ✅ Adicionar photo_url
  // Flag para identificar produtos temporários
  isTemp?: boolean;
  // Quantidade da NF-e que será somada
  nfeQuantity?: number;
  // Dados originais para criação posterior
  tempData?: any;
};

export interface ReconciliationItem {
  id: string;
  nfeItem: any;
  selectedProductId: string | null;
  selectedProduct: Product | TempProduct | null;
  isReconciled: boolean;
  action: 'match' | 'create';
  newProductName?: string;
  newProductSku?: string;
  tempProduct?: TempProduct; // Produto temporário criado
}

// Função para calcular similaridade entre strings
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  // Algoritmo simples de similaridade baseado em palavras comuns
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let commonWords = 0;
    const totalWords = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        commonWords++;
        break;
      }
    }
  }
  
  return commonWords / totalWords;
}

// Hook otimizado para buscar produtos similares para múltiplos itens
export function useSimilarProductsOptimized(searchTerms: string[]) {
  return useQuery({
    queryKey: ['all-products-for-similarity'],
    queryFn: async (): Promise<Product[]> => {
      try {
        console.log('🔍 [Reconciliation] Buscando todos os produtos para cálculo de similaridade');
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na busca de produtos')), 5000)
        );
        
        const response = await Promise.race([
          universalDataAdapter.getProductsWithRelations(),
          timeoutPromise
        ]) as any;
        
        if (response.error) {
          console.error('❌ [Reconciliation] Erro ao buscar produtos:', response.error);
          return [];
        }
        
        const allProducts = response.data || [];
        console.log('📦 [Reconciliation] Produtos encontrados:', allProducts.length);
        
        // Mapeia produtos reais para o formato esperado
        const mappedProducts: Product[] = allProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          short_code: product.short_code || '',
          price: product.price_cents ? product.price_cents / 100 : 0,
          category: product.categories?.name || product.category || 'Sem categoria',
          qr_code: product.qr_code || '',
          stock: product.stock || 0,
          brand: product.brands?.name || product.brand || '',
          supplier: product.suppliers?.name || product.supplier || '',
          size: product.size || '',
          created_at: product.created_at,
          updated_at: product.updated_at || product.created_at,
          // Campos adicionais para compatibilidade
          categories: product.categories,
          brands: product.brands,
          suppliers: product.suppliers,
          brand_id: product.brand_id,
          supplier_id: product.supplier_id,
          category_id: product.category_id,
          price_cents: product.price_cents,
          cost_price_cents: product.cost_price_cents,
          stock_min: product.stock_min,
          color: product.color,
          description: product.description,
          photo_url: product.photo_url,
          similarity: 0 // Será calculado localmente
        }));
        
        return mappedProducts;
      } catch (error) {
        console.error('❌ [Reconciliation] Erro ao buscar produtos:', error);
        return [];
      }
    },
    enabled: searchTerms.length > 0 && searchTerms.some(term => term.trim().length >= 2),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos (substitui cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    retryDelay: 2000,
  });
}

// Hook para buscar produtos similares com porcentagem de similaridade
export function useSimilarProducts(searchTerm: string) {
  // Normaliza o termo de busca para evitar duplicatas
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  
  return useQuery({
    queryKey: ['similar-products', normalizedSearchTerm],
    queryFn: async (): Promise<(Product & { similarity: number })[]> => {
      if (!normalizedSearchTerm || normalizedSearchTerm.length < 2) return [];
      
      try {
        // Busca produtos reais do sistema com timeout reduzido
        console.log('🔍 [Reconciliation] Buscando produtos similares para:', normalizedSearchTerm);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na busca de produtos')), 3000) // Reduzido para 3s
        );
        
        const response = await Promise.race([
          universalDataAdapter.getProductsWithRelations(),
          timeoutPromise
        ]) as any;
        
        if (response.error) {
          console.error('❌ [Reconciliation] Erro ao buscar produtos:', response.error);
          return [];
        }
        
        const allProducts = response.data || [];
        console.log('📦 [Reconciliation] Produtos encontrados:', allProducts.length);
        
        // Mapeia produtos reais para o formato esperado
        const mappedProducts: Product[] = allProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          short_code: product.short_code || '',
          price: product.price_cents ? product.price_cents / 100 : 0,
          category: product.categories?.name || product.category || 'Sem categoria',
          qr_code: product.qr_code || '',
          stock: product.stock || 0,
          brand: product.brands?.name || product.brand || '',
          supplier: product.suppliers?.name || product.supplier || '',
          size: product.size || '',
          created_at: product.created_at,
          updated_at: product.updated_at || product.created_at,
          // Campos adicionais para compatibilidade
          categories: product.categories,
          brands: product.brands,
          suppliers: product.suppliers,
          brand_id: product.brand_id,
          supplier_id: product.supplier_id,
          category_id: product.category_id,
          price_cents: product.price_cents,
          cost_price_cents: product.cost_price_cents,
          stock_min: product.stock_min,
          color: product.color,
          description: product.description,
          photo_url: product.photo_url,
          // Campo para reconciliação
          similarity: 0 // Será calculado abaixo
        }));
        
        // Calcula similaridade e filtra
        const similarProducts = mappedProducts
          .map(product => ({
            ...product,
            similarity: calculateSimilarity(product.name, searchTerm)
          }))
          .filter(product => product.similarity > 0.1) // Mínimo 10% de similaridade
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5); // Máximo 5 produtos similares
        
        console.log('🎯 [Reconciliation] Produtos similares encontrados:', similarProducts.length);
        return similarProducts;
      } catch (error) {
        console.error('❌ [Reconciliation] Erro ao buscar produtos similares:', error);
        if (error instanceof Error && error.message.includes('Timeout')) {
          console.warn('⏰ [Reconciliation] Timeout na busca de produtos');
        }
        return [];
      }
    },
    enabled: !!normalizedSearchTerm && normalizedSearchTerm.length >= 2, // Só busca se tiver pelo menos 2 caracteres
    staleTime: 2 * 60 * 1000, // 2 minutos - aumenta o tempo para evitar buscas desnecessárias
    gcTime: 15 * 60 * 1000, // 15 minutos - aumenta o cache significativamente (substitui cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Evita refetch desnecessário
    retry: 0, // Remove retry para evitar loops
    retryDelay: 0, // Remove delay
  });
}

// Hook para buscar todos os produtos
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      try {
        // Busca produtos reais do sistema
        const response = await universalDataAdapter.getProductsWithRelations();
        
        if (response.error) {
          console.error('Erro ao buscar produtos:', response.error);
          return [];
        }
        
        const allProducts = response.data || [];
        
        // Mapeia produtos reais para o formato esperado
        return allProducts.map((product: any): Product => ({
          id: product.id,
          name: product.name,
          short_code: product.short_code || '',
          price: product.price_cents ? product.price_cents / 100 : 0,
          category: product.categories?.name || product.category || 'Sem categoria',
          qr_code: product.qr_code || '',
          stock: product.stock || 0,
          brand: product.brands?.name || product.brand || '',
          supplier: product.suppliers?.name || product.supplier || '',
          size: product.size || '',
          created_at: product.created_at,
          updated_at: product.updated_at || product.created_at,
          // Campos adicionais para compatibilidade
          categories: product.categories,
          brands: product.brands,
          suppliers: product.suppliers,
          brand_id: product.brand_id,
          supplier_id: product.supplier_id,
          category_id: product.category_id,
          price_cents: product.price_cents,
          cost_price_cents: product.cost_price_cents,
          stock_min: product.stock_min,
          color: product.color,
          description: product.description,
          photo_url: product.photo_url
        }));
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

// Hook principal para reconciliação de produtos
export function useProductReconciliation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Função para criar produtos temporários sequencialmente
  const createTempProductsSequentially = async (tempProducts: TempProduct[]): Promise<TempProduct[]> => {
    console.log('🔄 [Reconciliation] Iniciando criação sequencial de produtos temporários:', tempProducts.length);
    
    const createdProducts: TempProduct[] = [];
    
    for (let i = 0; i < tempProducts.length; i++) {
      const tempProduct = tempProducts[i];
      
      try {
        console.log(`📦 [Reconciliation] Criando produto ${i + 1}/${tempProducts.length}:`, tempProduct.name);
        
        // Gera ID único com timestamp e índice para evitar conflitos
        const uniqueId = `temp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Cria o produto temporário com ID único
        const createdProduct: TempProduct = {
          ...tempProduct,
          id: uniqueId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isTemp: true
        };
        
        createdProducts.push(createdProduct);
        
        console.log(`✅ [Reconciliation] Produto ${i + 1} criado com ID:`, uniqueId);
        
        // Delay entre criações para evitar conflitos (exceto no último)
        if (i < tempProducts.length - 1) {
          console.log('⏳ [Reconciliation] Aguardando 500ms antes da próxima criação...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`❌ [Reconciliation] Erro ao criar produto ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log('🎉 [Reconciliation] Todos os produtos temporários criados com sucesso!');
    return createdProducts;
  };

  return {
    // Funções básicas para reconciliação
    invalidateQueries: () => {
      queryClient.invalidateQueries({ queryKey: ['similar-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    // Função para criação sequencial
    createTempProductsSequentially
  };
}