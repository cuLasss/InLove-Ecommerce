import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Calculator, CheckCircle, DollarSign, Receipt } from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useLoteDetails, useConsignacoes } from "@/hooks/useConsignacoes"

export default function ConsignacaoAcerto() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const { lote, items, acerto, isLoading } = useLoteDetails(id!)
  const { finalizarLote, isFinalizando } = useConsignacoes()

  // Form state
  const [formData, setFormData] = useState({
    taxas_cents: 0,
    forma_pagto: '',
    pago_cents: 0,
    pagamento_parcial: false,
    observacao: ''
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!lote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lote não encontrado</h2>
          <Button onClick={() => navigate('/consignado/lotes')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    )
  }

  if (lote.status !== 'EM_CONFERENCIA') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lote não está em conferência</h2>
          <p className="text-muted-foreground mb-4">
            Apenas lotes em conferência podem ter acerto financeiro
          </p>
          <Button onClick={() => navigate(`/consignado/lotes/${id}`)}>
            Ver detalhes do lote
          </Button>
        </div>
      </div>
    )
  }

  // Calcular totais
  const totais = {
    valorBruto: items.reduce((acc, item) => {
      const vendido = item.qtd_vendida || 0
      return acc + (vendido * item.unit_price_cents)
    }, 0),
    
    comissaoTotal: items.reduce((acc, item) => {
      const vendido = item.qtd_vendida || 0
      const comissao = item.commission_percent || lote.commission_default_percent || 30
      return acc + (vendido * item.unit_price_cents * comissao / 100)
    }, 0),

    totalItens: items.reduce((acc, item) => acc + (item.qtd_vendida || 0), 0),
    totalEnviado: items.reduce((acc, item) => acc + (item.qtd_enviada || 0), 0),
    totalDevolvido: items.reduce((acc, item) => acc + (item.qtd_devolvida || 0), 0),
    totalPerda: items.reduce((acc, item) => acc + (item.qtd_perda || 0), 0)
  }

  const descontos = 0 // Pode ser implementado posteriormente
  const liquido = totais.valorBruto - totais.comissaoTotal - descontos - formData.taxas_cents
  const saldoPendente = liquido - formData.pago_cents

  const handleFinalizarAcerto = async () => {
    if (!formData.forma_pagto) {
      toast({
        title: "Erro",
        description: "Selecione a forma de pagamento",
        variant: "destructive"
      })
      return
    }

    if (formData.pago_cents <= 0) {
      toast({
        title: "Erro", 
        description: "Informe o valor pago",
        variant: "destructive"
      })
      return
    }

    if (!formData.pagamento_parcial && saldoPendente !== 0) {
      toast({
        title: "Atenção",
        description: "Para finalizar, o valor pago deve ser igual ao líquido ou marque como pagamento parcial",
        variant: "destructive"
      })
      return
    }

    try {
      const acertoData = {
        bruto_vendido_cents: totais.valorBruto,
        descontos_cents: descontos,
        comissoes_cents: totais.comissaoTotal,
        taxas_cents: formData.taxas_cents,
        liquido_cents: liquido,
        pago_cents: formData.pago_cents,
        forma_pagto: formData.forma_pagto,
        observacao: formData.observacao || undefined
      }

      finalizarLote({ 
        loteId: id!, 
        acerto: acertoData 
      }, {
        onSuccess: () => {
          navigate(`/consignado/lotes/${id}`)
        }
      })
    } catch (error) {
      console.error('Erro ao finalizar acerto:', error)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(`/consignado/lotes/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Acerto Financeiro</h1>
          <p className="text-muted-foreground">
            Lote #{lote.id.slice(-8)} • Cliente: {lote.clients?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo dos Itens */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Resumo dos Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Enviado</TableHead>
                    <TableHead className="text-center">Vendido</TableHead>
                    <TableHead className="text-center">Devolvido</TableHead>
                    <TableHead className="text-center">Perda</TableHead>
                    <TableHead className="text-right">Valor Vendido</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const vendido = item.qtd_vendida || 0
                    const valorVendido = vendido * item.unit_price_cents
                    const comissao = item.commission_percent || lote.commission_default_percent || 30
                    const valorComissao = valorVendido * comissao / 100

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.products?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              R$ {(item.unit_price_cents / 100).toFixed(2)} • {comissao}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.qtd_enviada || 0}</TableCell>
                        <TableCell className="text-center font-medium">{vendido}</TableCell>
                        <TableCell className="text-center">{item.qtd_devolvida || 0}</TableCell>
                        <TableCell className="text-center">{item.qtd_perda || 0}</TableCell>
                        <TableCell className="text-right">
                          R$ {(valorVendido / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {(valorComissao / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumo Quantidades */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">Total Enviado</div>
                  <div className="text-2xl font-bold">{totais.totalEnviado}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Vendido</div>
                  <div className="text-2xl font-bold text-green-600">{totais.totalItens}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Devolvido</div>
                  <div className="text-2xl font-bold text-blue-600">{totais.totalDevolvido}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Perda</div>
                  <div className="text-2xl font-bold text-red-600">{totais.totalPerda}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acerto Financeiro */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cálculo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Valores calculados */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Valor Bruto:</span>
                  <span className="font-semibold">R$ {(totais.valorBruto / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Total:</span>
                  <span className="font-semibold text-red-600">- R$ {(totais.comissaoTotal / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descontos:</span>
                  <span className="font-semibold text-red-600">- R$ {(descontos / 100).toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Taxas adicionais */}
              <div>
                <Label htmlFor="taxas">Taxas/Multas (R$)</Label>
                <Input
                  id="taxas"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.taxas_cents / 100}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    taxas_cents: Math.round(Number(e.target.value) * 100) 
                  })}
                  placeholder="0.00"
                />
              </div>

              <Separator />

              {/* Valor líquido */}
              <div className="flex justify-between text-lg font-bold">
                <span>Valor Líquido:</span>
                <span className="text-green-600">R$ {(liquido / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Forma de pagamento */}
              <div>
                <Label htmlFor="forma-pagto">Forma de Pagamento *</Label>
                <Select value={formData.forma_pagto} onValueChange={(value) => 
                  setFormData({ ...formData, forma_pagto: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor pago */}
              <div>
                <Label htmlFor="valor-pago">Valor Pago (R$) *</Label>
                <Input
                  id="valor-pago"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pago_cents / 100}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    pago_cents: Math.round(Number(e.target.value) * 100) 
                  })}
                  placeholder="0.00"
                />
              </div>

              {/* Saldo pendente */}
              {saldoPendente !== 0 && (
                <div className={`p-3 rounded-lg ${saldoPendente > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'}`}>
                  <div className="text-sm font-medium">
                    {saldoPendente > 0 ? 'Saldo a Receber:' : 'Valor a Mais:'}
                  </div>
                  <div className="text-lg font-bold">
                    R$ {Math.abs(saldoPendente / 100).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Informações adicionais sobre o pagamento..."
                  rows={3}
                />
              </div>

              {/* Finalizar */}
              <Button 
                onClick={handleFinalizarAcerto}
                disabled={isFinalizando || !formData.forma_pagto || formData.pago_cents <= 0}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isFinalizando ? "Finalizando..." : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalizar Lote
                  </>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                Ao finalizar, o lote será marcado como concluído e não poderá mais ser editado
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}