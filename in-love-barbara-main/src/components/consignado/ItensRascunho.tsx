/**
 * Componente: Itens em Rascunho
 * 
 * Este componente gerencia os itens temporários antes de serem salvos na folha.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Minus, 
  Trash2,
  Save,
  Package,
  AlertCircle,
  Info
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface DraftItem {
  id: string
  product_id: string
  product_name: string
  product_code: string
  qty: number
  preco_base_cents: number
  subtotal_cents: number
  commission_percent: number
}

interface ItensRascunhoProps {
  folhaCodigo: string
  draftItems: DraftItem[]
  onRemoveItem: (itemId: string) => void
  onUpdateQuantity: (itemId: string, qty: number) => void
  onSaveItems: () => void
  isSaving?: boolean
}

export function ItensRascunho({ 
  folhaCodigo, 
  draftItems, 
  onRemoveItem, 
  onUpdateQuantity,
  onSaveItems,
  isSaving = false 
}: ItensRascunhoProps) {
  const [productStocks, setProductStocks] = useState<Record<string, number>>({})

  const totalItems = draftItems.reduce((sum, item) => sum + item.qty, 0)
  const totalValueCents = draftItems.reduce((sum, item) => sum + item.subtotal_cents, 0)

  // Buscar estoque disponível para cada produto
  const fetchProductStock = async (productId: string) => {
    try {
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      const product = products?.find((p: any) => p.id === productId)
      const stock = product?.stock || 0
      
      setProductStocks(prev => ({
        ...prev,
        [productId]: stock
      }))
      
      return stock
    } catch (error) {
      console.error('Erro ao buscar estoque:', error)
      return 0
    }
  }

  // Buscar estoque quando componentes carrega ou draftItems muda
  useEffect(() => {
    draftItems.forEach(item => {
      if (!productStocks[item.product_id]) {
        fetchProductStock(item.product_id)
      }
    })
  }, [draftItems, productStocks])

  // Calcular estoque restante (estoque total - quantidade no rascunho)
  const getRemainingStock = (productId: string, currentQty: number) => {
    const totalStock = productStocks[productId] || 0
    return Math.max(0, totalStock - currentQty)
  }

  return (
    <div className="consignado-itens-rascunho bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header redesenhado */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 sm:px-4 md:px-5 lg:px-5 xl:px-6 py-3 sm:py-3 md:py-3 lg:py-4 border-b border-orange-200">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 xl:gap-4">
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-orange-900 break-words whitespace-normal hyphens-none leading-tight">Itens em Rascunho</h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-orange-700 whitespace-nowrap">{draftItems.length} item{draftItems.length !== 1 ? 's' : ''} aguardando</p>
            </div>
          </div>
          {draftItems.length > 0 && (
            <Button
              onClick={onSaveItems}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 sm:px-4 md:px-5 lg:px-6 py-2 rounded-xl font-medium shadow-sm text-[10px] sm:text-xs md:text-sm whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0 w-full xl:w-auto justify-center"
            >
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Itens'}</span>
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4 sm:p-5 md:p-6">
        {draftItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-orange-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">Nenhum item em rascunho</h4>
            <p className="text-slate-600">Adicione produtos acima para vê-los aqui</p>
          </div>
        ) : (
          <>
            {/* Aviso */}
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Modo Rascunho:</strong> Estes itens serão <strong>somados</strong> aos já salvos. 
                <br />• Se já existe "Calcinha (5)", e você adicionar "Calcinha (3)" aqui, resultará em "Calcinha (8)".
              </AlertDescription>
            </Alert>

            {/* Tabela de itens - Desktop (apenas acima de 939px) */}
            <div className="consignado-draft-table-container">
              <Table className="consignado-draft-table w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Produto</TableHead>
                    <TableHead className="whitespace-nowrap">Preço Base</TableHead>
                    <TableHead className="whitespace-nowrap">Quantidade</TableHead>
                    <TableHead className="whitespace-nowrap">Subtotal</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            Código: {item.product_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatCurrency(item.preco_base_cents / 100)}</TableCell>
                      <TableCell>
                        <div className="consignado-quantity-control flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.id, Math.max(0, item.qty - 1))}
                            className="consignado-qty-button h-8 w-8 p-0"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            value={item.qty === 0 ? '' : item.qty}
                            placeholder="0"
                            onChange={(e) => {
                              const value = e.target.value
                              const newQty = parseInt(value) || 0
                              const maxStock = productStocks[item.product_id] || 0
                              
                              if (newQty > maxStock) {
                                console.warn(`Quantidade ${newQty} excede estoque disponível: ${maxStock}`)
                                onUpdateQuantity(item.id, maxStock)
                              } else {
                                onUpdateQuantity(item.id, Math.max(0, newQty))
                              }
                            }}
                            className="consignado-qty-input w-16 text-center text-sm h-8"
                            min="0"
                            max={productStocks[item.product_id] || 0}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const maxStock = productStocks[item.product_id] || 0
                              const newQty = item.qty + 1
                              
                              if (newQty > maxStock) {
                                console.warn(`Quantidade ${newQty} excede estoque disponível: ${maxStock}`)
                              } else {
                                onUpdateQuantity(item.id, newQty)
                              }
                            }}
                            disabled={item.qty >= (productStocks[item.product_id] || 0)}
                            className="consignado-qty-button h-8 w-8 p-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                          {item.qty} ({getRemainingStock(item.product_id, item.qty)} restante)
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrency(item.subtotal_cents / 100)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveItem(item.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cards de itens - Mobile/Tablet (abaixo de 939px) */}
            <div className="consignado-draft-cards space-y-3">
              {draftItems.map((item) => (
                <Card key={item.id} className="consignado-draft-card">
                  <CardContent className="p-4 space-y-3">
                    {/* Header do card */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm break-words">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground break-words">
                          Código: {item.product_code}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 p-0 flex-shrink-0"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Informações do produto */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Preço Base</div>
                        <div className="font-medium">{formatCurrency(item.preco_base_cents / 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                        <div className="font-medium">{formatCurrency(item.subtotal_cents / 100)}</div>
                      </div>
                    </div>

                    {/* Controle de quantidade */}
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Quantidade</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUpdateQuantity(item.id, Math.max(0, item.qty - 1))}
                          className="consignado-qty-button h-9 w-9 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.qty === 0 ? '' : item.qty}
                          placeholder="0"
                          onChange={(e) => {
                            const value = e.target.value
                            const newQty = parseInt(value) || 0
                            const maxStock = productStocks[item.product_id] || 0
                            
                            if (newQty > maxStock) {
                              console.warn(`Quantidade ${newQty} excede estoque disponível: ${maxStock}`)
                              onUpdateQuantity(item.id, maxStock)
                            } else {
                              onUpdateQuantity(item.id, Math.max(0, newQty))
                            }
                          }}
                          className="consignado-qty-input flex-1 text-center h-9"
                          min="0"
                          max={productStocks[item.product_id] || 0}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxStock = productStocks[item.product_id] || 0
                            const newQty = item.qty + 1
                            
                            if (newQty > maxStock) {
                              console.warn(`Quantidade ${newQty} excede estoque disponível: ${maxStock}`)
                            } else {
                              onUpdateQuantity(item.id, newQty)
                            }
                          }}
                          disabled={item.qty >= (productStocks[item.product_id] || 0)}
                          className="consignado-qty-button h-9 w-9 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.qty} ({getRemainingStock(item.product_id, item.qty)} restante)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo */}
            <div className="consignado-draft-summary mt-4 p-4 bg-white rounded-lg border">
              <div className="consignado-draft-summary-content flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    Total de itens em rascunho: <span className="font-medium text-foreground">{totalItems}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Valor total em rascunho: <span className="font-medium text-foreground">{formatCurrency(totalValueCents / 100)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Rascunho - Não Salvo
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
