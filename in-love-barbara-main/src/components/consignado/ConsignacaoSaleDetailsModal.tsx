import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  X, 
  Package, 
  DollarSign, 
  User, 
  Calendar, 
  CreditCard,
  Receipt,
  Handshake,
  FileText
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useConsignacaoPayments } from '@/hooks/useConsignacaoPayments'

interface ConsignacaoSaleDetailsModalProps {
  saleId: string | null
  open: boolean
  onClose: () => void
}

export function ConsignacaoSaleDetailsModal({ 
  saleId, 
  open, 
  onClose 
}: ConsignacaoSaleDetailsModalProps) {
  // Este modal sempre precisa dos dados de pagamentos
  const { financialRecords, payments } = useConsignacaoPayments(true)
  
  // Encontrar o registro financeiro correspondente
  const financialRecord = financialRecords.find(record => record.id === saleId)
  
  // Encontrar pagamentos relacionados
  const relatedPayments = payments.filter(payment => 
    payment.folha_codigo === financialRecord?.folha_codigo
  )
  
  if (!financialRecord) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Venda - Consignação
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Registro não encontrado</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'DINHEIRO':
      case 'CASH':
        return <Receipt className="h-4 w-4" />
      case 'PIX':
        return <CreditCard className="h-4 w-4" />
      case 'DEBITO':
      case 'DEBIT_CARD':
        return <CreditCard className="h-4 w-4" />
      case 'CREDITO':
      case 'CREDIT_CARD':
        return <CreditCard className="h-4 w-4" />
      case 'TRANSFERENCIA_BANCARIA':
      case 'BANK_TRANSFER':
        return <CreditCard className="h-4 w-4" />
      case 'CHEQUE':
      case 'CHECK':
        return <Receipt className="h-4 w-4" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'DINHEIRO':
        return 'Dinheiro'
      case 'PIX':
        return 'PIX'
      case 'DEBITO':
        return 'Cartão de Débito'
      case 'CREDITO':
        return 'Cartão de Crédito'
      case 'TRANSFERENCIA_BANCARIA':
        return 'Transferência Bancária'
      case 'CHEQUE':
        return 'Cheque'
      case 'BANK_TRANSFER':
        return 'Transferência Bancária'
      case 'CHECK':
        return 'Cheque'
      case 'CASH':
        return 'Dinheiro'
      case 'CREDIT_CARD':
        return 'Cartão de Crédito'
      case 'DEBIT_CARD':
        return 'Cartão de Débito'
      default:
        return method
    }
  }


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-blue-600" />
            Relatório de Venda - Consignação
            <Badge variant="outline" className="ml-2">
              {financialRecord.folha_codigo}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <p className="text-sm">{financialRecord.cliente_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Folha</label>
                <p className="text-sm font-mono">{financialRecord.folha_codigo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge 
                  variant={financialRecord.status === 'pago' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {financialRecord.status === 'pago' ? 'Pago' : 'Pendente'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                <p className="text-sm">{formatDate(financialRecord.data_criacao)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Pagamento</label>
                <p className="text-sm">
                  {financialRecord.data_pagamento 
                    ? formatDate(financialRecord.data_pagamento) 
                    : 'Não pago'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                <Badge variant="outline" className="ml-2">
                  Consignação
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <div className="text-center p-3 lg:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs lg:text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-base lg:text-lg font-semibold text-blue-600 truncate">
                    {formatCurrency(financialRecord.valor_total_cents / 100)}
                  </p>
                </div>
                <div className="text-center p-3 lg:p-4 bg-orange-50 rounded-lg">
                  <p className="text-xs lg:text-sm text-muted-foreground">Comissão</p>
                  <p className="text-base lg:text-lg font-semibold text-orange-600 truncate">
                    {formatCurrency(financialRecord.valor_comissao_cents / 100)}
                  </p>
                </div>
                <div className="text-center p-3 lg:p-4 bg-green-50 rounded-lg">
                  <p className="text-xs lg:text-sm text-muted-foreground">Valor Pago</p>
                  <p className="text-base lg:text-lg font-semibold text-green-600 truncate">
                    {formatCurrency(financialRecord.valor_pago_cents / 100)}
                  </p>
                </div>
                <div className="text-center p-3 lg:p-4 bg-red-50 rounded-lg">
                  <p className="text-xs lg:text-sm text-muted-foreground">Valor Restante</p>
                  <p className="text-base lg:text-lg font-semibold text-red-600 truncate">
                    {formatCurrency(financialRecord.valor_restante_cents / 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          {financialRecord.produtos && financialRecord.produtos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos ({financialRecord.produtos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-center">Comissão</TableHead>
                      <TableHead className="text-right">Valor Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialRecord.produtos.map((produto: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {produto.product_code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {produto.product_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {produto.qty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(produto.unit_price_cents / 100)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(produto.subtotal_cents / 100)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {produto.commission_percent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(produto.commission_value_cents / 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Pagamentos */}
          {relatedPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Pagamentos ({relatedPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {relatedPayments.map((payment, index) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPaymentMethodIcon(payment.method)}
                        <div>
                          <p className="font-medium">
                            {getPaymentMethodLabel(payment.method)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.paid_at)}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(payment.amount_cents / 100)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Recebido por: {payment.received_by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
