import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  DollarSign, 
  CreditCard, 
  Plus, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Receipt,
  TrendingUp,
  Wallet,
  Loader2
} from "lucide-react"
import { AddPaymentModal } from "./AddPaymentModal"
import { useConsignPayments, usePaymentFormatters } from "@/hooks/useConsignPayments"
import { useToast } from "@/hooks/use-toast"

interface ConsignLoteItem {
  id: string
  product_id: string
  qty: number
  returned_qty?: number
  price_cents: number
  discount_cents?: number
  commission_percent?: number
  desconto_percentual?: number
  products?: {
    name: string
    codigo: string
  }
}

interface PaymentDetailsViewProps {
  lote: {
    id: string
    client_name: string
    created_at: string
    data_entrega?: string
    status: string
  }
  items: ConsignLoteItem[]
  onBack?: () => void
}

const PAYMENT_METHOD_LABELS = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  OUTRO: 'Outro'
}

const PAYMENT_METHOD_ICONS = {
  DINHEIRO: '💵',
  PIX: '📱',
  DEBITO: '💳',
  CREDITO: '💳',
  OUTRO: '💰'
}

export function PaymentDetailsView({ lote, items, onBack }: PaymentDetailsViewProps) {
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  
  // Hook para gerenciar pagamentos
  const {
    payments,
    summary,
    isLoading,
    error,
    addPayment,
    refreshPayments
  } = useConsignPayments(lote.id)
  
  // Hook para formatação
  const {
    formatCurrency,
    formatPaymentMethod,
    formatDateTime,
    getPaymentMethodColor
  } = usePaymentFormatters()

  // Lógica de finalização automática
  useEffect(() => {
    if (summary?.is_fully_paid && onBack) {
      // Aguarda um pouco para mostrar o feedback visual
      const timer = setTimeout(() => {
        toast({
          title: "🎉 Consignação Finalizada!",
          description: "O pagamento foi quitado e a consignação foi finalizada automaticamente.",
          duration: 5000,
        })
        // Volta para a lista após finalização
        onBack()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [summary?.is_fully_paid, onBack, toast])

  // Função para adicionar pagamento com lógica de finalização
  const handleAddPayment = async (paymentData: {
    method: any
    amount_cents: number
    note?: string
  }) => {
    try {
      setIsProcessing(true)
      await addPayment(paymentData)
      
      // Recarrega os dados para verificar se foi quitado
      await refreshPayments()
      
    } catch (error: any) {
      throw error // Re-throw para o modal tratar
    } finally {
      setIsProcessing(false)
    }
  }

  // Cálculos baseados nos itens (fallback se summary não estiver disponível)
  const calculateTotals = () => {
    const itemsTotal = items.reduce((sum, item) => {
      const activeQty = item.qty - (item.returned_qty || 0)
      // Aplicar desconto individual do produto (desconto_percentual)
      const basePrice = item.price_cents * activeQty
      const discountAmount = (basePrice * (item.desconto_percentual || 0)) / 100
      const discountedPrice = basePrice - discountAmount
      return sum + discountedPrice
    }, 0)
    
    const commissionTotal = items.reduce((sum, item) => {
      const activeQty = item.qty - (item.returned_qty || 0)
      // Calcular comissão sobre o valor com desconto aplicado
      const basePrice = item.price_cents * activeQty
      const discountAmount = (basePrice * (item.desconto_percentual || 0)) / 100
      const discountedPrice = basePrice - discountAmount
      const commissionPercent = item.commission_percent || 15 // 15% padrão
      return sum + ((discountedPrice * commissionPercent) / 100)
    }, 0)
    
    const netTotal = itemsTotal - commissionTotal
    
    return {
      itemsTotal,
      commissionTotal,
      netTotal,
      paidTotal: summary?.paid_amount_cents || 0,
      remainingTotal: summary?.remaining_amount_cents || netTotal
    }
  }

  const totals = summary ? {
    itemsTotal: summary.total_amount_cents,
    commissionTotal: summary.commission_cents,
    netTotal: summary.net_amount_cents,
    paidTotal: summary.paid_amount_cents,
    remainingTotal: summary.remaining_amount_cents
  } : calculateTotals()

  const isFullyPaid = summary?.is_fully_paid || totals.remainingTotal <= 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando informações de pagamento...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao carregar pagamentos: {error}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPayments}
            className="mt-3"
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Status */}
      <Card className={`${isFullyPaid ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isFullyPaid ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Clock className="h-6 w-6 text-orange-600" />
              )}
              {isFullyPaid ? 'Pagamento Finalizado' : 'Aguardando Pagamento'}
            </CardTitle>
            <Badge variant={isFullyPaid ? "default" : "secondary"} className="text-sm">
              {isFullyPaid ? 'QUITADO' : 'PENDENTE'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Lote: {lote.id.slice(-8)} • Cliente: {lote.client_name}
          </p>
        </CardHeader>
      </Card>

      {/* Informações Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Valor Total da Nota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.itemsTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {items.reduce((sum, item) => sum + (item.qty - (item.returned_qty || 0)), 0)} itens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Comissão do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.commissionTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Para o cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-500" />
              Valor Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(totals.netTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Para o lojista
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status do Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Status do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">{formatCurrency(totals.itemsTotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Pago:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totals.paidTotal)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor Restante:</span>
              <span className={`font-bold text-lg ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totals.remainingTotal)}
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (totals.paidTotal / totals.itemsTotal) * 100)}%` 
                }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {((totals.paidTotal / totals.itemsTotal) * 100).toFixed(1)}% pago
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detalhes dos Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Itens ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item) => {
              const activeQty = item.qty - (item.returned_qty || 0)
              const itemTotal = item.price_cents * activeQty
              const commissionPercent = item.commission_percent || 15
              const itemCommission = (itemTotal * commissionPercent) / 100
              
              return (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.products?.name || 'Produto não encontrado'}</p>
                    <p className="text-sm text-muted-foreground">
                      Código: {item.products?.codigo || 'N/A'} • Qtd: {activeQty} • 
                      Preço: {formatCurrency(item.price_cents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(itemTotal)}</p>
                    <p className="text-sm text-green-600">
                      Comissão ({commissionPercent}%): {formatCurrency(itemCommission)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Pagamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Pagamentos ({payments.length})</CardTitle>
            <Button 
              onClick={() => setShowAddPayment(true)}
              disabled={isFullyPaid || isProcessing}
              className="bg-primary hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-foreground mb-2">Nenhum pagamento registrado</h3>
              <p>Adicione o primeiro pagamento para iniciar o acerto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-gray-100`}>
                      <CreditCard className={`h-4 w-4 ${getPaymentMethodColor(payment.method)}`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatPaymentMethod(payment.method)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(payment.created_at)}
                      </p>
                      {payment.note && (
                        <p className="text-xs text-muted-foreground italic">
                          {payment.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(payment.amount_cents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações de Finalização */}
      {isFullyPaid && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Pagamento Quitado!
              </h3>
              <p className="text-sm text-green-700 mb-4">
                O lote será automaticamente finalizado e as comissões distribuídas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="font-medium text-green-800">Cliente recebe:</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totals.commissionTotal)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-green-200">
                  <p className="font-medium text-green-800">Lojista recebe:</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(totals.netTotal)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Adicionar Pagamento */}
      <AddPaymentModal
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
        onAddPayment={handleAddPayment}
        remainingAmount={totals.remainingTotal}
        isProcessing={isProcessing}
      />
    </div>
  )
}