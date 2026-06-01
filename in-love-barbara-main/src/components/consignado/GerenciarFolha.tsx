/**
 * Componente Principal: Gerenciar Folha de Consignação
 * 
 * Este componente integra todas as funcionalidades para gerenciar
 * uma folha específica de consignação com código único.
 */

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatConsignacaoDate } from '@/lib/date-utils'
import { 
  ArrowLeft, 
  Package, 
  Calendar,
  User,
  DollarSign,
  RefreshCw,
  Truck,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AdicionarProduto, DraftItemData } from './AdicionarProduto'
import { ItensRascunho } from './ItensRascunho'
import type { DraftItem } from './ItensRascunho'
import { ItensJaSalvos } from './ItensJaSalvos'
import { useFolhaConsignacao } from '@/hooks/useFolhaConsignacao'
import { useToast } from '@/hooks/use-toast'
import { consignacaoApi } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

// Use the imported DraftItem type from ItensRascunho
// (removed duplicate local interface)

interface GerenciarFolhaProps {
  folhaCodigo: string
  folhaInfo?: {
    id?: string
    cliente_name?: string
    created_at?: string
    prazo?: string
    status?: string
  }
  onBack?: () => void
  onEntregarLote?: () => void
}

export function GerenciarFolha({ 
  folhaCodigo, 
  folhaInfo, 
  onBack, 
  onEntregarLote 
}: GerenciarFolhaProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Mutation para atualizar status para "COM_CLIENTE"
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!folhaInfo?.id) {
        throw new Error('ID da folha não encontrado')
      }
      console.log('🔄 [GerenciarFolha] Atualizando status para ENTREGUE:', folhaInfo.id)
      const result = await consignacaoApi.updateStatus(folhaInfo.id, 'ENTREGUE')
      console.log('✅ [GerenciarFolha] Status atualizado:', result)
      return result
    },
    onSuccess: (data) => {
      console.log('🎉 [GerenciarFolha] Mutation sucesso, invalidando cache...')
      
      // Invalidar cache para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['consignacao-rascunhos'] })
      queryClient.invalidateQueries({ queryKey: ['consignacao-com-cliente'] })
      queryClient.invalidateQueries({ queryKey: ['consignacao-counters'] })
      queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] }) // Adicionar invalidação das reservas
      
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['consignacao-rascunhos'] })
      queryClient.refetchQueries({ queryKey: ['consignacao-com-cliente'] })
      queryClient.refetchQueries({ queryKey: ['consignado-reservas'] }) // Adicionar refetch das reservas
      
      console.log('🔄 [GerenciarFolha] Cache invalidado e refetch executado')
      
      toast({
        title: 'Lote entregue!',
        description: `Folha ${folhaCodigo} foi marcada como "Com Cliente" e atualizada na lista.`
      })
      
      // Redirecionar para página específica de "com a cliente"
      navigate(`/consignado/folha/${folhaCodigo}?status=ENTREGUE`)
    },
    onError: (error: any) => {
      console.error('❌ Erro ao entregar lote:', error)
      toast({
        variant: "destructive",
        title: 'Erro ao entregar lote',
        description: error.message || 'Não foi possível atualizar o status da folha.'
      })
    }
  })

  const handleEntregarLote = () => {
    if (!folhaInfo?.id) {
      toast({
        variant: "destructive",
        title: 'Erro',
        description: 'ID da folha não encontrado. Não é possível entregar o lote.',
        duration: 3000
      })
      return
    }

    // Verificar se há itens salvos na folha
    const hasSavedItems = folhaData?.items && folhaData.items.length > 0
    const hasDraftItems = draftItems.length > 0
    
    if (!hasSavedItems && !hasDraftItems) {
      toast({
        variant: "destructive",
        title: 'Não é possível entregar o lote',
        description: 'Adicione pelo menos um item ao lote antes de entregá-lo.',
        duration: 3000
      })
      return
    }

    // Mostrar modal de aviso sobre atualizar a página para comissões
    setShowDeliveryWarning(true)
  }

  // Função para confirmar a entrega após o aviso
  const confirmDelivery = () => {
    setShowDeliveryWarning(false)
    updateStatusMutation.mutate()
  }

  // Função para recarregar a página
  const reloadPage = () => {
    window.location.reload()
  }
  const [refreshKey, setRefreshKey] = useState(0)
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [isSavingItems, setIsSavingItems] = useState(false)
  const [showDeliveryWarning, setShowDeliveryWarning] = useState(false)
  const { folhaData, isLoading, refreshData, addItem } = useFolhaConsignacao({ folhaCodigo })

  const handleItemUpdated = () => {
    setRefreshKey(prev => prev + 1)
    refreshData()
  }

  // Adicionar produto ao rascunho com validação de estoque
  const handleAddToDraft = async (product: any, requestedQty: number) => {
    try {
      // ✅ CORREÇÃO: Usar estoque físico em vez de estoque disponível
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      const foundProduct = products?.find((p: any) => p.id === product.id)
      const stockFisico = foundProduct?.stock || 0
      
      const existingItem = draftItems.find(item => item.product_id === product.id)
      const currentDraftQty = existingItem ? existingItem.qty : 0
      const newTotalQty = currentDraftQty + requestedQty
      
      // Validar se não excede estoque físico
      if (newTotalQty > stockFisico) {
        toast({
          title: "❌ Estoque insuficiente",
          description: `${product.name}: Estoque físico ${stockFisico}, solicitado ${newTotalQty}`,
          variant: "destructive"
        })
        return
      }
      
      if (existingItem) {
        // Se produto já existe, apenas aumentar quantidade
        setDraftItems(prev => prev.map(item => 
          item.id === existingItem.id
            ? {
                ...item,
                qty: item.qty + requestedQty,
                subtotal_cents: (item.qty + requestedQty) * item.preco_base_cents
              }
            : item
        ))
      } else {
        // Adicionar novo produto ao rascunho (sem comissão - será definida nos itens salvos)
        const newItem: DraftItem = {
          id: `${product.id}-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          product_code: product.short_code || product.id,
          qty: requestedQty,
          preco_base_cents: product.price_cents,
          subtotal_cents: requestedQty * product.price_cents,
          commission_percent: 0 // Sem comissão no rascunho - será definida nos itens salvos
        }
        setDraftItems(prev => [...prev, newItem])
      }
      
      toast({
        title: "✅ Produto adicionado ao rascunho",
        description: `${product.name}: ${requestedQty} unidades (${stockFisico - newTotalQty} restante)`,
      })
    } catch (error: any) {
      console.error('Erro ao adicionar produto:', error)
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      })
    }
  }

  // Remover item do rascunho
  const handleRemoveDraftItem = (itemId: string) => {
    setDraftItems(prev => prev.filter(item => item.id !== itemId))
  }

  // Atualizar quantidade no rascunho
  const handleUpdateDraftQuantity = (itemId: string, qty: number) => {
    setDraftItems(prev => prev.map(item => 
      item.id === itemId
        ? {
            ...item,
            qty: Math.max(0, qty), // Permite quantidade zero (mas item continua na lista)
            subtotal_cents: Math.max(0, qty) * item.preco_base_cents // Subtotal zero quando qty = 0
          }
        : item
    ))
  }

  // Salvar itens do rascunho
  const handleSaveDraftItems = async () => {
    // Filtrar apenas itens com quantidade > 0 para salvar
    const itemsToSave = draftItems.filter(item => item.qty > 0)
    if (itemsToSave.length === 0) {
      toast({
        title: "⚠️ Nenhum item para salvar",
        description: "Todos os itens têm quantidade zero. Remova os itens desnecessários ou adicione quantidade.",
      })
      return
    }

    setIsSavingItems(true)
    try {
      // Salvar cada item do rascunho usando o hook existente (sem comissão - será definida nos itens salvos)
      for (const item of itemsToSave) {
        await addItem(item.product_code, item.qty)
      }

      // ✅ CORREÇÃO: Reduzir estoque físico apenas das quantidades adicionadas
      console.log('📦 [GerenciarFolha] Reduzindo estoque físico apenas das quantidades adicionadas...')
      
      // Reduzir estoque físico apenas dos itens que foram salvos
      for (const item of itemsToSave) {
        try {
          const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
          const { data: products } = await universalDataAdapter.getProducts()
          const product = products?.find((p: any) => p.id === item.product_id)
          
          if (product) {
            const currentStock = product.stock || 0
            const newStock = Math.max(0, currentStock - item.qty)
            
            // Atualizar estoque físico do produto
            await universalDataAdapter.updateProduct(item.product_id, { 
              stock: newStock,
              updated_at: new Date().toISOString()
            })
            
            console.log(`📦 [GerenciarFolha] Produto ${product.name}: ${currentStock} → ${newStock} (redução: ${item.qty})`)
          }
        } catch (error) {
          console.error(`❌ [GerenciarFolha] Erro ao reduzir estoque do produto ${item.product_id}:`, error)
        }
      }
      
      // Limpar apenas os itens salvos, manter na lista os com qty = 0
      setDraftItems(prev => prev.filter(item => item.qty === 0))
      handleItemUpdated()
      
      toast({
        title: "✅ Itens salvos com sucesso",
        description: `${itemsToSave.length} itens foram somados aos salvos na folha e estoque físico reduzido`,
      })
    } catch (error: any) {
      console.error('Erro ao salvar itens:', error)
      toast({
        title: "❌ Erro ao salvar itens",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsSavingItems(false)
    }
  }

  const totalItems = folhaData?.total_items || 0
  const totalValue = folhaData?.total_value_cents || 0

  return (
    <div className="consignado-gerenciar-folha space-y-8 max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 to-white min-h-screen">
      {/* Header da Folha - Design Clean */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 lg:p-6 xl:p-8">
        <div className="flex flex-col xl:flex-row items-start xl:items-center xl:justify-between gap-4 xl:gap-6">
          <div className="space-y-3 sm:space-y-4 w-full xl:w-auto">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-10 sm:h-10 md:w-11 md:h-11 xl:w-12 xl:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 sm:h-5 sm:w-5 md:h-5 md:w-5 xl:h-6 xl:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold text-slate-900 break-words whitespace-normal hyphens-none leading-tight">{folhaCodigo}</h1>
                  <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium break-words whitespace-normal hyphens-none leading-tight">{folhaInfo?.cliente_name || 'Cliente não informado'}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 text-xs sm:text-sm text-slate-500">
                {folhaInfo?.created_at && (
                  <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Criado em {new Date(folhaInfo.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {folhaInfo?.prazo && (
                  <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Prazo: {formatConsignacaoDate(folhaInfo.prazo)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-3 sm:space-y-4 w-full xl:w-auto flex-shrink-0">
            <div className="flex items-center justify-start xl:justify-end gap-2 sm:gap-3 md:gap-4">
              <div className="text-center bg-slate-50 rounded-xl p-2.5 sm:p-3 md:p-3.5 lg:p-4 min-w-[85px] sm:min-w-[90px] md:min-w-[95px] lg:min-w-[100px] flex-1 xl:flex-none">
                <div className="text-[10px] sm:text-xs md:text-sm text-slate-500 mb-1 whitespace-nowrap">Itens</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">{totalItems}</div>
              </div>
              <div className="text-center bg-slate-50 rounded-xl p-2.5 sm:p-3 md:p-3.5 lg:p-4 min-w-[105px] sm:min-w-[110px] md:min-w-[115px] lg:min-w-[120px] flex-1 xl:flex-none">
                <div className="text-[10px] sm:text-xs md:text-sm text-slate-500 mb-1 whitespace-nowrap">Valor Total</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 break-words whitespace-normal">{formatCurrency(totalValue / 100)}</div>
              </div>
            </div>
            
            <div className="consignado-header-actions flex items-center justify-start xl:justify-end gap-2 sm:gap-2.5 md:gap-3 flex-wrap w-full xl:w-auto">
              <Badge variant="outline" className="consignado-status-badge-header px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm text-slate-700 border-slate-300 bg-slate-50 whitespace-nowrap flex-shrink-0">
                {folhaInfo?.status === 'RASCUNHO' && '📝 Rascunho'}
                {folhaInfo?.status === 'ENTREGUE' && '✅ Entregue'}
                {folhaInfo?.status === 'AGUARDANDO_PAGAMENTO' && '⏳ Aguardando Pagamento'}
                {!folhaInfo?.status && '📝 Rascunho'}
              </Badge>
              
              {onEntregarLote && folhaInfo?.status === 'RASCUNHO' && (
                <Button 
                  onClick={handleEntregarLote}
                  disabled={updateStatusMutation.isPending}
                  className="consignado-deliver-button bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs md:text-sm whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                >
                  {updateStatusMutation.isPending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                      <span className="hidden sm:inline">Entregando...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Entregar Lote</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status da Folha */}
      {folhaInfo?.status && (
        <Card className="consignado-status-card">
          <CardContent className="pt-6 consignado-status-content">
            <div className="consignado-status-container flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-wrap sm:flex-nowrap min-w-0">
              <Badge 
                variant={
                  folhaInfo.status === 'RASCUNHO' ? 'secondary' : 
                  folhaInfo.status === 'ENTREGUE' ? 'default' : 
                  folhaInfo.status === 'EM_CONFERENCIA' || folhaInfo.status === 'AGUARDANDO_PAGAMENTO' ? 'outline' :
                  folhaInfo.status === 'FINALIZADO' ? 'outline' : 
                  'secondary'
                }
                className={
                  `consignado-status-badge flex-shrink-0 whitespace-nowrap text-[10px] sm:text-xs md:text-sm ${
                    folhaInfo.status === 'RASCUNHO' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    folhaInfo.status === 'ENTREGUE' ? 'bg-green-100 text-green-800 border-green-200' :
                    folhaInfo.status === 'EM_CONFERENCIA' || folhaInfo.status === 'AGUARDANDO_PAGAMENTO' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    folhaInfo.status === 'FINALIZADO' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`
                }
              >
                {folhaInfo.status === 'RASCUNHO' ? '📝 Rascunho' :
                 folhaInfo.status === 'ENTREGUE' ? '🚚 Com Cliente' :
                 folhaInfo.status === 'EM_CONFERENCIA' ? '⏳ Em Conferência' :
                 folhaInfo.status === 'AGUARDANDO_PAGAMENTO' ? '⏳ Aguardando Pagamento' :
                 folhaInfo.status === 'FINALIZADO' ? '✅ Finalizado' :
                 folhaInfo.status}
              </Badge>
              <span className="consignado-status-text text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-muted-foreground flex-1 min-w-0 break-words">
                {folhaInfo.status === 'RASCUNHO' 
                  ? 'Folha em preparação - você pode adicionar e remover itens'
                  : folhaInfo.status === 'ENTREGUE'
                  ? 'Folha entregue para a cliente - acompanhe o progresso'
                  : folhaInfo.status === 'EM_CONFERENCIA' || folhaInfo.status === 'AGUARDANDO_PAGAMENTO'
                  ? 'Aguardando pagamento da cliente - processo de acerto em andamento'
                  : folhaInfo.status === 'FINALIZADO'
                  ? 'Folha finalizada - consignação concluída'
                  : 'Status desconhecido'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adicionar Produto */}
      {folhaInfo?.status === 'RASCUNHO' && (
        <AdicionarProduto 
          folhaCodigo={folhaCodigo} 
          onItemAdded={handleAddToDraft}
        />
      )}

      {/* Itens em Rascunho */}
      {folhaInfo?.status === 'RASCUNHO' && (
        <ItensRascunho
          folhaCodigo={folhaCodigo}
          draftItems={draftItems}
          onRemoveItem={handleRemoveDraftItem}
          onUpdateQuantity={handleUpdateDraftQuantity}
          onSaveItems={handleSaveDraftItems}
          isSaving={isSavingItems}
        />
      )}

      {/* Itens Já Salvos */}
      <ItensJaSalvos 
        folhaCodigo={folhaCodigo} 
        onItemUpdated={handleItemUpdated}
        key={`saved-${refreshKey}`}
      />

      {/* Modal de Aviso para Entrega */}
      <Dialog open={showDeliveryWarning} onOpenChange={setShowDeliveryWarning}>
        <DialogContent className="consignado-delivery-modal sm:max-w-lg max-w-[calc(100vw-2rem)]">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-slate-900">
              Aviso Importante
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-base leading-relaxed mt-2">
              Para garantir que as comissões estejam corretas, recarregue a página antes de entregar o lote.
            </DialogDescription>
          </DialogHeader>
          
          <div className="consignado-delivery-warning-box bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
              </div>
              <div className="text-amber-800">
                <p className="font-semibold text-sm mb-2">Por que recarregar?</p>
                <p className="text-sm leading-relaxed">
                  As comissões personalizadas podem não estar visíveis corretamente até que a página seja atualizada.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="consignado-delivery-footer flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center pt-6 w-full">
            <Button 
              onClick={reloadPage}
              className="consignado-reload-button w-full sm:flex-1 sm:min-w-0 h-11 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-black font-semibold rounded-lg px-4 sm:px-7 py-2.5 transition-all duration-200 shadow-md hover:shadow-lg border-0 focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Recarregar Agora</span>
            </Button>
            <Button 
              onClick={confirmDelivery}
              className="consignado-continue-button w-full sm:flex-1 sm:min-w-0 h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg px-4 sm:px-7 py-2.5 transition-all duration-200 shadow-md hover:shadow-lg border-0 focus:ring-2 focus:ring-green-300 focus:ring-offset-2"
            >
              <Truck className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="whitespace-nowrap">Continuar Assim Mesmo</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
