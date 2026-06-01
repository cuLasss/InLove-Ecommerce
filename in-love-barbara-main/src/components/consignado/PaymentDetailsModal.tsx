/**
 * Modal para exibir detalhes do pagamento de uma folha finalizada
 * Reformulado para mostrar as mesmas informações do modal do financeiro
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  DollarSign, 
  Calendar, 
  User, 
  CreditCard, 
  CheckCircle, 
  Clock,
  Receipt,
  Package,
  Calculator,
  FileText
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  folhaCodigo: string
  clienteName: string
  registroFinanceiro: any
}

export function PaymentDetailsModal({ 
  isOpen, 
  onClose, 
  folhaCodigo, 
  clienteName, 
  registroFinanceiro 
}: PaymentDetailsModalProps) {
  if (!registroFinanceiro) return null

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="consignado-payment-details-modal max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="consignado-payment-details-title flex items-center gap-2">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span className="break-words">Relatório de Venda - Consignação {folhaCodigo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="consignado-payment-details-content space-y-6">
          {/* Informações Gerais */}
          <Card className="consignado-payment-details-info-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="consignado-payment-details-info-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                <p className="text-sm">{registroFinanceiro.cliente_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Folha</label>
                <p className="text-sm font-mono">{registroFinanceiro.folha_codigo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge 
                  variant={registroFinanceiro.status === 'pago' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {registroFinanceiro.status === 'pago' ? 'Pago' : 'Pendente'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                <p className="text-sm">{formatDate(registroFinanceiro.data_criacao)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Pagamento</label>
                <p className="text-sm">
                  {registroFinanceiro.data_pagamento 
                    ? formatDate(registroFinanceiro.data_pagamento) 
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
          <Card className="consignado-payment-details-summary-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="consignado-payment-details-summary-grid grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="consignado-payment-details-summary-item text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Valor Total</p>
                  <p className="text-base sm:text-lg font-semibold text-blue-600 whitespace-nowrap break-words">
                    {formatCurrency(registroFinanceiro.valor_total_cents / 100)}
                  </p>
                </div>
                <div className="consignado-payment-details-summary-item text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Comissão</p>
                  <p className="text-base sm:text-lg font-semibold text-orange-600 whitespace-nowrap break-words">
                    {formatCurrency(registroFinanceiro.valor_comissao_cents / 100)}
                  </p>
                </div>
                <div className="consignado-payment-details-summary-item text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Valor Pago</p>
                  <p className="text-base sm:text-lg font-semibold text-green-600 whitespace-nowrap break-words">
                    {formatCurrency(registroFinanceiro.valor_pago_cents / 100)}
                  </p>
                </div>
                <div className="consignado-payment-details-summary-item text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Valor Restante</p>
                  <p className="text-base sm:text-lg font-semibold text-red-600 whitespace-nowrap break-words">
                    {formatCurrency(registroFinanceiro.valor_restante_cents / 100)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          {registroFinanceiro.produtos && registroFinanceiro.produtos.length > 0 && (
            <Card className="consignado-payment-details-products-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  Produtos ({registroFinanceiro.produtos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Tabela para desktop - esconder abaixo de 624px */}
                <div className="consignado-payment-details-products-table-container hidden min-[625px]:block overflow-x-auto">
                  <Table className="consignado-payment-details-products-table">
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
                    {registroFinanceiro.produtos.map((produto: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {produto.product_code || 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {produto.product_name || 'Produto não encontrado'}
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
                </div>

                {/* Cards para mobile - mostrar abaixo de 624px */}
                <div className="consignado-payment-details-products-cards min-[625px]:hidden space-y-3">
                  {registroFinanceiro.produtos.map((produto: any, index: number) => (
                    <Card key={index} className="consignado-payment-details-product-card">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Código</p>
                            <p className="font-mono text-sm font-medium">{produto.product_code || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Produto</p>
                            <p className="font-medium break-words">{produto.product_name || 'Produto não encontrado'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Quantidade</p>
                              <Badge variant="outline" className="mt-1">
                                {produto.qty}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Preço Unit.</p>
                              <p className="font-medium">{formatCurrency(produto.unit_price_cents / 100)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Subtotal</p>
                              <p className="font-medium">{formatCurrency(produto.subtotal_cents / 100)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Comissão</p>
                              <Badge variant="secondary" className="mt-1">
                                {produto.commission_percent}%
                              </Badge>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">Valor Comissão</p>
                            <p className="text-lg font-bold text-orange-600">{formatCurrency(produto.commission_value_cents / 100)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagamentos */}
          {registroFinanceiro.pagamentos && registroFinanceiro.pagamentos.length > 0 && (
            <Card className="consignado-payment-details-payments-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 flex-shrink-0" />
                  Pagamentos ({registroFinanceiro.pagamentos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="consignado-payment-details-payments-list space-y-4">
                  {registroFinanceiro.pagamentos.map((payment: any, index: number) => (
                    <div key={payment.id || index} className="consignado-payment-details-payment-item flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3 sm:gap-4">
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getPaymentMethodIcon(payment.method)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium break-words">
                            {getPaymentMethodLabel(payment.method)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.paid_at)}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground mt-1 break-words">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="font-semibold text-green-600 whitespace-nowrap">
                          {formatCurrency(payment.amount_cents / 100)}
                        </p>
                        <p className="text-sm text-muted-foreground break-words">
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
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}