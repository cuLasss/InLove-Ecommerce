import { useState, useCallback } from 'react';
import { DATABASE_CONFIG } from '@/config/database';
import { universalDataAdapter } from '@/lib/universal-data-adapter';

export interface StockResponse {
  available: number;
}

export function useStockQuery() {
  const [loading, setLoading] = useState(false);

  const getAvailableStock = useCallback(async (productId: string): Promise<number> => {
    if (!productId) return 0;

    setLoading(true);
    try {
      console.log(`🔍 [useStockQuery] Buscando estoque para produto: ${productId}`);
      console.log(`🔧 [useStockQuery] Modo atual: ${DATABASE_CONFIG.mode}`);

      if (DATABASE_CONFIG.mode === 'supabase') {
        // Modo Supabase - buscar dados do banco
        console.log('☁️ [useStockQuery] Modo Supabase - buscando dados do banco...');
        
        const { data: products, error } = await universalDataAdapter.getProducts();
        if (error) {
          console.error('❌ [useStockQuery] Erro ao buscar produtos:', error);
          return 0;
        }

        const product = products?.find((p: any) => p.id === productId);
        if (!product) {
          console.warn(`⚠️ [useStockQuery] Produto não encontrado: ${productId}`);
          return 0;
        }

        // Estoque físico do produto no Supabase
        const stockFisico = product.stock || 0;
        console.log(`📦 [useStockQuery] Estoque físico do produto: ${stockFisico}`);

        // Buscar itens consignados (RASCUNHO + ENTREGUE) para subtrair do estoque disponível
        const { data: consignacoes, error: consignacoesError } = await universalDataAdapter.getConsignacoes();
        if (consignacoesError) {
          console.error('❌ [useStockQuery] Erro ao buscar consignações:', consignacoesError);
          return stockFisico; // Retornar estoque físico se não conseguir buscar consignações
        }

        // Filtrar consignações ativas (RASCUNHO + ENTREGUE)
        const consignacoesAtivas = consignacoes?.filter((c: any) => 
          c.status === 'RASCUNHO' || c.status === 'ENTREGUE'
        ) || [];

        console.log(`📋 [useStockQuery] Consignações ativas encontradas: ${consignacoesAtivas.length}`);

        // Calcular quantidade consignada deste produto
        let quantidadeConsignada = 0;
        for (const consignacao of consignacoesAtivas) {
          const { data: items, error: itemsError } = await universalDataAdapter.getConsignacaoItems(consignacao.id);
          if (!itemsError && items) {
            const itensDoProduto = items.filter((item: any) => item.product_id === productId);
            const qtyConsignada = itensDoProduto.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
            quantidadeConsignada += qtyConsignada;
          }
        }

        // Estoque disponível = estoque físico - quantidade consignada
        const availableStock = Math.max(0, stockFisico - quantidadeConsignada);
        
        console.log(`📊 [useStockQuery] Cálculo de estoque Supabase:`, {
          productId,
          stock_fisico: stockFisico,
          quantidade_consignada: quantidadeConsignada,
          estoque_disponivel: availableStock,
          consignacoes_ativas: consignacoesAtivas.length,
          explicacao: 'Estoque físico - quantidade consignada'
        });

        return availableStock;
      } else {
        // Modo Local - usar localStorage (código original)
        console.log('💾 [useStockQuery] Modo Local - buscando dados do localStorage...');
        
        const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
        const product = savedProducts.find((p: any) => p.id === productId);
        
        if (!product) {
          console.warn(`⚠️ [useStockQuery] Produto não encontrado: ${productId}`);
          return 0;
        }
        
        // Estoque físico do produto
        const stockFisico = product.stock || 0;
        
        // Buscar itens consignados (RASCUNHO + ENTREGUE) para subtrair do estoque disponível
        const consignacaoItems = JSON.parse(localStorage.getItem('consignacao_items') || '[]');
        const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]');
        
        // Filtrar consignações ativas (RASCUNHO + ENTREGUE)
        const consignacoesAtivas = consignacoes.filter((c: any) => 
          c.status === 'RASCUNHO' || c.status === 'ENTREGUE'
        );
        
        const consignacaoIdsAtivas = consignacoesAtivas.map((c: any) => c.id);
        
        // Calcular quantidade consignada deste produto
        const itensConsignados = consignacaoItems.filter((item: any) => 
          item.product_id === productId && 
          consignacaoIdsAtivas.includes(item.consignacao_id)
        );
        
        const quantidadeConsignada = itensConsignados.reduce((sum: number, item: any) => {
          return sum + (item.qty || 0);
        }, 0);
        
        // Estoque disponível = estoque físico - quantidade consignada
        const availableStock = Math.max(0, stockFisico - quantidadeConsignada);
        
        console.log(`📊 [useStockQuery] Cálculo de estoque Local:`, {
          productId,
          stock_fisico: stockFisico,
          quantidade_consignada: quantidadeConsignada,
          estoque_disponivel: availableStock,
          itens_consignados: itensConsignados.length,
          explicacao: 'Estoque físico - quantidade consignada'
        });
        
        return availableStock;
      }
    } catch (error) {
      console.error('❌ [useStockQuery] Erro ao buscar estoque:', error);
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getAvailableStock,
    loading
  };
}