import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  User,
  Package,
  DollarSign,
  CreditCard,
  TrendingUp,
  Eye,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AtacadoSaleDetailsModalProps {
  sale: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentAdded: () => void;
  onSaleDeleted?: () => void;
}

export function AtacadoSaleDetailsModal({ 
  sale, 
  isOpen, 
  onOpenChange, 
  onPaymentAdded,
  onSaleDeleted
}: AtacadoSaleDetailsModalProps) {
  if (!sale) return null;

  // Debug: verificar dados da venda
  console.log('🔍 [AtacadoSaleDetailsModal] Venda recebida:', sale);
  console.log('🔍 [AtacadoSaleDetailsModal] Items da venda:', sale.items);
  console.log('🔍 [AtacadoSaleDetailsModal] Items length:', sale.items?.length);
  console.log('🔍 [AtacadoSaleDetailsModal] Items is array:', Array.isArray(sale.items));
  console.log('🔍 [AtacadoSaleDetailsModal] Pagamentos da venda:', sale.payments);
  
  // Debug específico para a venda problemática
  if (sale.id && sale.id.includes('06befdd0')) {
    console.log(`🔍 [AtacadoSaleDetailsModal] DEBUG VENDA 06befdd0:`, {
      saleId: sale.id,
      saleStatus: sale.status,
      saleTotal: sale.total_cents,
      payments: sale.payments,
      paymentsLength: sale.payments?.length,
      paymentsIsArray: Array.isArray(sale.payments),
      calculatedPaidAmount: sale.payments?.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0) || 0
    });
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FECHADA':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Finalizada</Badge>;
      case 'RASCUNHO':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Rascunho</Badge>;
      case 'CANCELADA':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTotalAmount = () => {
    return sale.total_cents || 0;
  };

  const getPaidAmount = () => {
    if (!sale.payments || !Array.isArray(sale.payments)) {
      console.warn('⚠️ [AtacadoSaleDetailsModal] sale.payments não é um array válido:', sale.payments);
      return 0;
    }
    return sale.payments.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
  };

  const getPendingAmount = () => {
    const total = getTotalAmount();
    const paid = getPaidAmount();
    return Math.max(0, total - paid);
  };

  const getPaymentStatus = () => {
    const total = getTotalAmount();
    const paid = getPaidAmount();
    const pending = getPendingAmount();

    if (total === 0) {
      return { status: 'SEM_VALOR', color: 'text-gray-600', label: 'Sem valor' };
    } else if (paid >= total) {
      return { status: 'PAGO', color: 'text-green-600', label: 'Pago' };
    } else if (paid > 0 && paid < total) {
      return { status: 'PARCIAL', color: 'text-blue-600', label: 'Parcial' };
    } else {
      return { status: 'PENDENTE', color: 'text-orange-600', label: 'Pendente' };
    }
  };

  const calculateTotalProductsSold = () => {
    if (!sale.items || !Array.isArray(sale.items)) {
      console.warn('⚠️ [AtacadoSaleDetailsModal] sale.items não é um array válido:', sale.items);
      return 0;
    }
    return sale.items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
  };

  const paymentStatus = getPaymentStatus();
  const totalAmount = getTotalAmount();
  const paidAmount = getPaidAmount();
  const pendingAmount = getPendingAmount();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-[1024px] sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1024px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 atacado-details-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="h-5 w-5 text-primary" />
              Detalhes da Venda de Atacado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6">
            {/* Informações Gerais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <span>Informações Gerais</span>
                  {getStatusBadge(sale.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 details-two-col">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Data:</span>
                      <span>{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{sale.id.slice(-8)}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {sale.client && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{sale.client.name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Produtos:</span>
                      <span>{calculateTotalProductsSold()} unidades</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 details-three-col">
                  <div className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {formatCurrency(totalAmount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                  </div>

                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(paidAmount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Pago</div>
                  </div>

                  <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(pendingAmount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Pendente</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Status do Pagamento:</span>
                    <span className={`font-medium ${paymentStatus.color}`}>
                      {paymentStatus.label}
                    </span>
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Package className="h-5 w-5 text-primary" />
                  Produtos Vendidos ({sale.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!sale.items || sale.items.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum produto encontrado nesta venda</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Esta venda foi criada sem produtos ou os produtos foram removidos.
                    </p>
                    {sale.status === 'FECHADA' && sale.total_cents > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Venda finalizada com valor mas sem produtos - pode indicar um erro no sistema.
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Considere cancelar esta venda ou adicionar os produtos corretos.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {sale.items.map((item: any, index: number) => (
                    <div key={index} className="p-3 sm:p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.product?.name || 'Produto não encontrado'}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.qty}x
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(item.unit_price_cents * item.qty)}
                          </div>
                          {item.discount_percent > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Desconto: {item.discount_percent}%
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Preço Unitário:</span> {formatCurrency(item.unit_price_cents)}
                        </div>
                        <div>
                          <span className="font-medium">Código:</span> {item.product?.short_code || 'N/A'}
                        </div>
                        {item.profit_per_unit_cents && (
                          <div>
                            <span className="font-medium">Lucro/Unidade:</span> 
                            <span className="text-green-600 font-semibold ml-1">
                              {formatCurrency(item.profit_per_unit_cents)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de Pagamentos */}
            {sale.payments && sale.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Histórico de Pagamentos ({sale.payments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    {sale.payments.map((payment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {payment.method === 'DINHEIRO' ? 'Dinheiro' :
                               payment.method === 'PIX' ? 'PIX' :
                               payment.method === 'DEBITO' ? 'Débito' :
                               payment.method === 'CREDITO' ? 'Crédito' :
                               payment.method}
                              {payment.method === 'CREDITO' && payment.installments && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {payment.installments}x
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(payment.paid_at || payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              {payment.method === 'CREDITO' && payment.installments && (
                                <span className="ml-2">
                                  • Valor da parcela: {formatCurrency(payment.amount_cents / payment.installments)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(payment.amount_cents)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payment.status === 'CONCLUIDO' ? 'Concluído' : payment.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações de Parcelas */}
            {sale.payments && sale.payments.some((p: any) => p.method === 'CREDITO' && p.installments) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Detalhes das Parcelas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sale.payments
                      .filter((p: any) => p.method === 'CREDITO' && p.installments)
                      .map((payment: any, index: number) => (
                        <div key={index} className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-800">Pagamento no Crédito</span>
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                {payment.installments}x
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-blue-800">
                                {formatCurrency(payment.amount_cents)}
                              </div>
                              <div className="text-sm text-blue-600">
                                Total do pagamento
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-sm details-three-col">
                            <div className="bg-white p-3 rounded border">
                              <div className="text-muted-foreground">Valor por Parcela</div>
                              <div className="font-semibold text-green-600">
                                {formatCurrency(payment.amount_cents / payment.installments)}
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded border">
                              <div className="text-muted-foreground">Número de Parcelas</div>
                              <div className="font-semibold">
                                {payment.installments} parcelas
                              </div>
                            </div>
                            <div className="bg-white p-3 rounded border">
                              <div className="text-muted-foreground">Data do Pagamento</div>
                              <div className="font-semibold">
                                {format(new Date(payment.paid_at || payment.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Botões de ação */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
            {(!sale.items || sale.items.length === 0) && sale.status === 'FECHADA' && sale.total_cents > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Tem certeza que deseja cancelar esta venda? Ela será marcada como cancelada.')) {
                    // Aqui você pode implementar a lógica para cancelar a venda
                    console.log('Cancelando venda:', sale.id);
                    onSaleDeleted?.();
                    onOpenChange(false);
                  }
                }}
              >
                Cancelar Venda
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:ml-auto">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
