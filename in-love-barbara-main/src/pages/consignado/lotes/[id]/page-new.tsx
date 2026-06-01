/**
 * Componente Principal da Tela de Rascunho de Consignação
 * 
 * Este componente implementa a interface completa para gerenciar
 * rascunhos de consignação com o novo sistema baseado em lotes.
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { useConsignadoLote } from '@/hooks/useConsignadoLote'
import { formatCurrency, formatDate, getStatusColor, getStatusText } from '@/lib/consignado/api'
import { SmartScannerSheet } from '@/components/scan/SmartScannerSheet'
import { useProducts } from '@/hooks/useProducts'
import { useStockQuery } from '@/hooks/useStockQuery'

export default function ConsignadoLoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [codigoInput, setCodigoInput] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  
  const { findProductByCode } = useProducts()
  const { getAvailableStock } = useStockQuery()
  
  const {
    lote,
    itens,
    summary,
    isLoading,
    isAddingItem,
    isRemovingItem,
    isUpdatingStatus,
    addItem,
    removeItem,
    updateStatus,
    getItemQty,
    getAvailableStock: getAvailableStockForItem,
    validateStock
  } = useConsignadoLote({ loteId: id! })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoInput.trim()) return
    
    try {
      await addItem(codigoInput.trim())
      setCodigoInput('')
    } catch (error) {
      console.error('Erro ao adicionar item:', error)
    }
  }

  const handleQRScan = async (code: string) => {
    try {
      await addItem(code)
    } catch (error) {
      console.error('Erro ao adicionar item via scanner:', error)
    }
  }

  const handleRemoveItem = async (productId: string, qty: number) => {
    try {
      await removeItem(productId, qty)
    } catch (error) {
      console.error('Erro ao remover item:', error)
    }
  }

  const handleUpdateStatus = async (status: any) => {
    try {
      await updateStatus(status)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando lote...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!lote) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Lote não encontrado ou não foi possível carregar os dados.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isDelivered = lote.status === 'entregue' || lote.status === 'aguardando_pagamento'
  const canEdit = lote.status === 'rascunho'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/consignado')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Lote {lote.codigo}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(lote.status)}>
                {getStatusText(lote.status)}
              </Badge>
              {lote.cliente && (
                <span className="text-sm text-muted-foreground">
                  Cliente: {lote.cliente.name}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleUpdateStatus('entregue')}
              disabled={isUpdatingStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Entregar
            </Button>
          </div>
        )}
      </div>

      {/* Informações do Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informações do Lote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente</Label>
              <p className="text-sm">{lote.cliente?.name || 'Não informado'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Comissão</Label>
              <p className="text-sm">{lote.comissao_percentual}%</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prazo</Label>
              <p className="text-sm">
                {lote.prazo ? formatDate(lote.prazo) : 'Não definido'}
              </p>
            </div>
          </div>
          
          {lote.observacoes && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Observações</Label>
              <p className="text-sm text-muted-foreground">{lote.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner/Add Item - Only show if not delivered */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Adicionar Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="codigo">Código do Produto</Label>
                <Input
                  id="codigo"
                  placeholder="Digite ou escaneie o código"
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scanner
                </Button>
                <Button 
                  type="submit" 
                  disabled={!codigoInput.trim() || isAddingItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingItem ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Itens do Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens do Lote ({itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {itens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item adicionado ao lote</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itens.map((item) => (
                <div key={item.product_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product?.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Código: {item.product?.short_code}</span>
                        <span>Preço: {formatCurrency(item.preco_base_cents)}</span>
                        <span>Disponível: {getAvailableStockForItem(item.product_id)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {item.qtd} unid.
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.preco_base_cents * item.qtd)}
                        </div>
                      </div>
                      
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveItem(item.product_id, 1)}
                            disabled={isRemovingItem || item.qtd <= 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveItem(item.product_id, item.qtd)}
                            disabled={isRemovingItem}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.total_itens}</div>
              <div className="text-sm text-muted-foreground">Total de Itens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(summary.total_valor_cents)}</div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(summary.total_comissao_cents)}</div>
              <div className="text-sm text-muted-foreground">Comissão ({lote.comissao_percentual}%)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(summary.total_desconto_cents)}</div>
              <div className="text-sm text-muted-foreground">Desconto</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Scanner Sheet */}
      <SmartScannerSheet 
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        mode="consignado"
        onConfirmItem={async (productId: string, qty: number) => {
          try {
            // Buscar produto pelo ID para obter o código
            const product = await findProductByCode(productId)
            if (product) {
              await addItem(product.short_code || productId, qty)
            }
          } catch (error) {
            console.error('Erro ao adicionar item via scanner:', error)
          }
        }}
        getProductByCode={async (code: string) => {
          return await findProductByCode(code)
        }}
        getAvailableStock={async (productId: string) => {
          return await getAvailableStock(productId)
        }}
        getDraftQty={(productId: string) => {
          return getItemQty(productId)
        }}
      />
    </div>
  )
}
