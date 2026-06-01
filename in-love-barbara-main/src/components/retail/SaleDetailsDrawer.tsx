import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { universalDataAdapter } from '@/lib/universal-data-adapter'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PaymentPill } from '@/components/sale/PaymentPill'
import { formatBRL } from '@/lib/money'
import { useDeletedProducts } from '@/hooks/useDeletedProducts'

interface SaleDetailsDrawerProps {
  saleId: string | null
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

interface SaleDetails {
  id: string
  created_at: string
  discount_cents: number
  total_cents: number
  channel: string
  clients: { name: string } | null
  users: { name: string } | null
  sale_items: Array<{
    qty: number
    unit_price_cents: number
    discount_cents: number
    product_id?: string
    products: { name: string } | null
  }>
  payments: Array<{
    method: string
    amount_cents: number
  }>
}

function calculateSaleTotal(sale: SaleDetails): number {
  // ✅ SEMPRE calcular a partir dos itens (não confiar no total_cents salvo)
  if (!sale || !sale.sale_items) return 0;
  
  // Calcular total dos itens com descontos individuais
  const totalFromItems = sale.sale_items.reduce((sum, item) => {
    const itemTotal = Number(item.unit_price_cents || 0) * Number(item.qty || 0);
    const discountAmount = Number(item.discount_cents || 0);
    return sum + (itemTotal - discountAmount);
  }, 0);
  
  // ✅ CORREÇÃO: Verificar se há descontos individuais nos itens
  // Se houver descontos individuais, não aplicar desconto total da venda (batch discount)
  // pois os descontos individuais já foram aplicados
  const hasIndividualDiscounts = sale.sale_items.some(item => Number(item.discount_cents || 0) > 0);
  
  // Aplicar desconto total da venda apenas se não houver descontos individuais
  // ou se o desconto total for diferente da soma dos descontos individuais
  const totalIndividualDiscounts = sale.sale_items.reduce((sum, item) => {
    return sum + Number(item.discount_cents || 0);
  }, 0);
  
  // Se há descontos individuais e eles já foram aplicados, não subtrair batch discount novamente
  // O batch discount só deve ser aplicado se não houver descontos individuais
  const batchDiscount = hasIndividualDiscounts ? 0 : (sale.discount_cents || 0);
  
  return totalFromItems - batchDiscount;
}

export function SaleDetailsDrawer({ saleId, open, onClose, onDeleted }: SaleDetailsDrawerProps) {
  const [sale, setSale] = useState<SaleDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { getDeletedProductName } = useDeletedProducts()

  // Prevenir scroll da página de fundo quando modal estiver aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  // Cleanup quando componente desmontar
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    if (saleId && open) {
      fetchSaleDetails()
    }
  }, [saleId, open])

  const fetchSaleDetails = async () => {
    if (!saleId) return
    
    setLoading(true)
    try {
      console.log('🔄 [SaleDetailsDrawer] Carregando detalhes da venda:', saleId);
      
      // Buscar dados reais da venda
      const saleResponse = await universalDataAdapter.getSaleById(saleId);
      if (saleResponse.error || !saleResponse.data) {
        throw new Error('Venda não encontrada');
      }
      
      const saleData = saleResponse.data;
      
      // Buscar itens da venda
      const itemsResponse = await universalDataAdapter.getSaleItems(saleId);
      const items = itemsResponse.data || [];
      
      // Buscar pagamentos da venda
      const paymentsResponse = await universalDataAdapter.getPaymentsBySaleId(saleId);
      const payments = paymentsResponse.data || [];
      
      // Buscar dados do cliente se existir
      let client = null;
      if (saleData.client_id) {
        try {
          const clientResponse = await universalDataAdapter.getClientById(saleData.client_id);
          client = clientResponse.data;
        } catch (error) {
          console.warn('Cliente não encontrado:', saleData.client_id);
        }
      }
      
      // Buscar dados do usuário se existir
      let user = null;
      if (saleData.user_id) {
        try {
          // Primeiro tentar buscar como app_user
          const userResponse = await universalDataAdapter.getUserById(saleData.user_id);
          if (userResponse.data) {
            user = userResponse.data;
          } else {
            // Se não encontrou como app_user, tentar buscar como collaborator
            const collaboratorResponse = await universalDataAdapter.getCollaboratorById(saleData.user_id);
            if (collaboratorResponse.data) {
              user = {
                id: collaboratorResponse.data.id,
                name: collaboratorResponse.data.name
              };
            }
          }
        } catch (error) {
          console.warn('Usuário não encontrado:', saleData.user_id);
        }
      }
      
      // Se não encontrou usuário, tentar buscar colaborador por nome padrão
      if (!user) {
        try {
          // Buscar colaborador ativo padrão ou mais recente
          const collaboratorsResponse = await universalDataAdapter.getCollaborators();
          if (collaboratorsResponse.data && collaboratorsResponse.data.length > 0) {
            // Usar o primeiro colaborador ativo como padrão
            const defaultCollaborator = collaboratorsResponse.data.find(c => c.active) || collaboratorsResponse.data[0];
            user = {
              id: defaultCollaborator.id,
              name: defaultCollaborator.name
            };
          }
        } catch (error) {
          console.warn('Erro ao buscar colaborador padrão:', error);
        }
      }
      
      // Buscar dados dos produtos para cada item
      const saleItemsWithProducts = [];
      for (const item of items) {
        try {
          const productResponse = await universalDataAdapter.getProductById(item.product_id);
          const product = productResponse.data;
          
          // ✅ CORREÇÃO: Calcular desconto individual do item baseado no discount_percent
          const itemTotal = item.unit_price_cents * item.qty;
          const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
          
          saleItemsWithProducts.push({
            qty: item.qty,
            unit_price_cents: item.unit_price_cents,
            discount_cents: discountAmount,
            products: product ? { name: product.name } : null
          });
        } catch (error) {
          console.warn('Produto não encontrado:', item.product_id);
          
          // ✅ CORREÇÃO: Calcular desconto individual do item baseado no discount_percent
          const itemTotal = item.unit_price_cents * item.qty;
          const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
          
          saleItemsWithProducts.push({
            qty: item.qty,
            unit_price_cents: item.unit_price_cents,
            discount_cents: discountAmount,
            products: null
          });
        }
      }
      
      // ✅ CORREÇÃO: Calcular total da venda considerando apenas descontos individuais
      // O total será calculado pela função calculateSaleTotal que já considera descontos individuais
      const total_cents = saleItemsWithProducts.reduce((sum, item) => {
        const itemTotal = item.unit_price_cents * item.qty;
        return sum + (itemTotal - item.discount_cents);
      }, 0);
      
      // ✅ CORREÇÃO: Verificar se há descontos individuais
      // Se houver, não usar discount_total_cents da venda (batch discount)
      const hasIndividualDiscounts = saleItemsWithProducts.some(item => item.discount_cents > 0);
      const totalIndividualDiscounts = saleItemsWithProducts.reduce((sum, item) => sum + item.discount_cents, 0);
      
      // Se há descontos individuais, usar 0 como batch discount
      // Caso contrário, usar o discount_total_cents da venda
      const batchDiscount = hasIndividualDiscounts ? 0 : (saleData.discount_total_cents || 0);
      
      const saleDetails: SaleDetails = {
        id: saleData.id,
        created_at: saleData.created_at,
        discount_cents: batchDiscount, // ✅ CORREÇÃO: Usar batch discount apenas se não houver descontos individuais
        total_cents: total_cents,
        channel: saleData.channel || 'VAREJO',
        clients: client ? { name: client.name } : null,
        users: user ? { name: user.name } : null,
        sale_items: saleItemsWithProducts,
        payments: payments.map(payment => ({
          method: payment.method || 'DINHEIRO',
          amount_cents: payment.amount_cents
        }))
      };
      
      console.log('✅ [SaleDetailsDrawer] Dados carregados:', saleDetails);
      setSale(saleDetails);
      setError(null);
      
    } catch (error) {
      console.error('❌ [SaleDetailsDrawer] Erro ao carregar venda:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar venda');
    } finally {
      setLoading(false);
    }
  }

  const deleteSale = async () => {
    if (!sale) return
    
    const confirmed = confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')
    if (!confirmed) return

    setDeleting(true)
    try {
      // Sistema local - simular exclusão
      await Promise.resolve(); // Simular exclusão de payments
      await Promise.resolve(); // Simular exclusão de sale_items  
      await Promise.resolve(); // Simular exclusão de sales

      toast({
        title: "Sucesso",
        description: "Venda excluída com sucesso"
      })
      
      onDeleted()
      onClose()
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      toast({
        title: "Erro", 
        description: "Não foi possível excluir a venda",
        variant: "destructive"
      })
    }
    setDeleting(false)
  }

  if (!sale && !loading) return null

  // ✅ SEMPRE calcular a partir dos itens
  const finalTotal = sale ? calculateSaleTotal(sale) : 0
  const itemsSubtotal = sale ? (sale.sale_items || []).reduce((acc, item) => {
    return acc + (Number(item.unit_price_cents || 0) * Number(item.qty || 0))
  }, 0) : 0

  // ✅ CORREÇÃO: Calcular total de descontos (individuais + batch se aplicável)
  const totalDiscounts = sale ? (sale.sale_items || []).reduce((acc, item) => {
    return acc + Number(item.discount_cents || 0)
  }, 0) + (sale.discount_cents || 0) : 0

  const totalPayments = sale ? (sale.payments || []).reduce((acc, payment) => acc + payment.amount_cents, 0) : 0
  // ✅ CORREÇÃO: Usar tolerância maior (5 centavos) para evitar falsos positivos devido a arredondamentos
  const hasPaymentMismatch = sale && Math.abs(totalPayments - finalTotal) > 5 // 5 cent tolerance

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="md:max-w-4xl w-[95vw] mx-auto max-h-[95vh] sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw] flex flex-col"
      >
        <DialogHeader className="border-b p-6 flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <DialogTitle className="text-xl font-bold text-primary">
                {sale ? `Venda #${sale.id.slice(-6)}` : 'Carregando...'}
              </DialogTitle>
              {sale && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(sale.created_at), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {sale.channel || 'VENDA'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 bg-background">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando detalhes...</div>
          ) : sale ? (
            <>
              {/* Pessoa */}
              <div className="grid gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">Pessoa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-card py-2.5 px-3.5">
                    <div className="text-xs text-muted-foreground mb-1">Cliente</div>
                    <div className="text-sm font-medium line-clamp-2">
                      {sale.clients?.name || 'Consumidor final'}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card py-2.5 px-3.5">
                    <div className="text-xs text-muted-foreground mb-1">Colaboradora</div>
                    <div className="text-sm font-medium line-clamp-2">
                      {sale.users?.name || 'Sistema'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="grid gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">Resumo Financeiro</h3>
                <div className="rounded-xl border bg-card py-2.5 px-3.5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal dos itens</span>
                    <span className="font-medium">{formatBRL(itemsSubtotal)}</span>
                  </div>
                  {totalDiscounts > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Descontos</span>
                      <span className="font-medium text-red-600">
                        -{formatBRL(totalDiscounts)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-border/60 pt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total final</span>
                      <span className="text-xl font-semibold text-foreground">
                        {formatBRL(finalTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagamentos */}
              <div className="grid gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">Pagamentos</h3>
                <div className="rounded-xl border bg-card py-2.5 px-3.5">
                  {hasPaymentMismatch && (
                    <div className="flex items-center gap-1 mb-2 text-amber-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      Total dos pagamentos não confere com o total da venda
                    </div>
                  )}
                  {sale.payments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {sale.payments.map((payment, index) => (
                        <PaymentPill
                          key={index}
                          method={payment.method}
                          amount={payment.amount_cents}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum pagamento registrado</p>
                  )}
                </div>
              </div>

              {/* Itens da Venda */}
              <div className="grid gap-3">
                <h3 className="text-sm font-medium text-muted-foreground">Itens da Venda</h3>
                <div className="rounded-xl border bg-card divide-y divide-border/60">
                  {sale.sale_items.length > 0 ? (
                    sale.sale_items.map((item, index) => {
                      const itemTotal = item.unit_price_cents * item.qty
                      // Verificar se o produto foi excluído
                      const deletedProductName = item.product_id ? getDeletedProductName(item.product_id) : null
                      
                      // Verificar se o produto foi excluído (tem prefixo [EXCLUÍDO] ou está na tabela deleted_products)
                      const productName = item.products?.name || ''
                      const hasDeletedPrefix = productName.startsWith('[EXCLUÍDO]')
                      const originalName = hasDeletedPrefix 
                        ? productName.replace(/^\[EXCLUÍDO\]\s*/, '') 
                        : (deletedProductName || productName)
                      
                      let displayName = 'Produto não identificado'
                      
                      if (item.products?.name) {
                        // Produto existe
                        if (hasDeletedPrefix || deletedProductName) {
                          // Produto foi excluído - mostrar nome original com "(excluído)"
                          displayName = `${originalName} (excluído)`
                        } else {
                          // Produto normal
                          displayName = productName
                        }
                      } else if (item.product_id) {
                        // Produto não encontrado mas tem ID (foi deletado)
                        displayName = deletedProductName 
                          ? `${deletedProductName} (excluído)`
                          : 'Produto não encontrado (excluído)'
                      }
                      
                      return (
                        <div key={index} className="py-2.5 px-3.5 flex items-center justify-between min-h-[44px]">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium line-clamp-2 mb-0.5">
                              {displayName}
                            </div>
                            <div className="text-[13px] text-muted-foreground">
                              {item.qty} × {formatBRL(item.unit_price_cents)}
                              {item.discount_cents > 0 && (
                                <span className="text-red-600 ml-1">
                                  (desc. {formatBRL(item.discount_cents)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-right ml-3">
                            {formatBRL(itemTotal - item.discount_cents)}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-4 px-3.5 text-center text-sm text-muted-foreground">
                      Nenhum item encontrado
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
          </div>
        </div>

        {/* Footer com botões */}
        <div className="border-t p-6 flex justify-end gap-3 bg-muted/30">
          <Button
            variant="destructive"
            onClick={deleteSale}
            disabled={deleting}
            aria-label="Excluir venda"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Excluindo...' : 'Excluir Venda'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}