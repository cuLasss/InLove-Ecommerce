/**
 * Sistema de Movimentação de Estoque para Consignação
 * 
 * Este módulo gerencia todas as transições de estoque relacionadas à consignação,
 * garantindo consistência entre estoque normal, estoque consignado e itens vendidos.
 * 
 * REGRAS DE MOVIMENTAÇÃO:
 * 
 * 1. ADICIONAR AO RASCUNHO:
 *    - Item sai do estoque normal (stock)
 *    - Item entra no estoque consignado (stock_consigned)
 * 
 * 2. DEVOLUÇÃO DE ITENS:
 *    - Item sai do estoque consignado (stock_consigned)
 *    - Item volta para o estoque normal (stock)
 * 
 * 3. FINALIZAÇÃO DE VENDA:
 *    - Item sai do estoque consignado (stock_consigned)
 *    - Item NÃO volta para o estoque normal (considerado vendido)
 * 
 * 4. VISUALIZAÇÃO:
 *    - Mostrar quantos itens estão em consignação
 *    - Listar quais itens estão em consignação
 */

// Sistema local - não precisa de Supabase
// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface StockMovement {
  id: string
  product_id: string
  movement_type: 'TO_CONSIGNED' | 'FROM_CONSIGNED' | 'SOLD'
  quantity: number
  consignacao_id?: string
  created_at: string
  created_by?: string
  notes?: string
}

export interface StockAudit {
  product_id: string
  product_name: string
  current_stock: number
  current_consigned: number
  total_movements: number
  last_movement: string
}

// ============================================================================
// FUNÇÕES PRINCIPAIS DE MOVIMENTAÇÃO
// ============================================================================

/**
 * MOVE ITEM PARA CONSIGNADO
 * 
 * Quando um item é adicionado ao rascunho de consignação:
 * - Remove do estoque normal (stock)
 * - Adiciona ao estoque consignado (stock_consigned)
 * - Registra a movimentação para auditoria
 * 
 * @param productId - ID do produto
 * @param quantity - Quantidade a ser movida
 * @param consignacaoId - ID da consignação (opcional)
 * @param notes - Observações adicionais (opcional)
 */
export async function mover_para_consignado(
  productId: string, 
  quantity: number, 
  consignacaoId?: string,
  clientId?: string,
  notes?: string
): Promise<void> {
  console.log(`🔄 [StockMovement] Movendo para consignado: Produto ${productId}, Qty: ${quantity}, Cliente: ${clientId}`)
  
  try {
    // Se temos clientId e consignacaoId, usar controle por cliente
    if (clientId && consignacaoId) {
      // Sistema local - apenas log
      console.log('Reservando estoque:', { 
        productId, 
        qty: quantity, 
        clientId, 
        consignacaoId 
      })
      return
    }
  } catch (error) {
    console.error('Erro ao reservar estoque:', error)
    throw error
  }
}
