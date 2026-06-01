import React, { useState, useEffect } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Edit, Trash2, X, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface ConsignacaoItemDraftRowProps {
  item: {
    id: string
    product_id: string
    qty: number
    unit_price_cents: number
    desconto_percentual?: number
    products?: {
      id: string
      name: string
      short_code: string
      brand?: string
      size?: string
      color?: string
      stock: number
    }
  }
  onUpdateQty: (productId: string, qty: number) => void
  onUpdateDiscount: (productId: string, discount: number) => void
  onDelete: (productId: string, productName: string) => void
  getVisualStock: (productId: string) => Promise<number>
  getAvailableStockForDisplay: (productId: string) => Promise<number>
  isUpdating: boolean
}

export function ConsignacaoItemDraftRow({
  item,
  onUpdateQty,
  onUpdateDiscount,
  onDelete,
  getVisualStock,
  getAvailableStockForDisplay,
  isUpdating
}: ConsignacaoItemDraftRowProps) {
  const { toast } = useToast()
  const [editingQty, setEditingQty] = useState<{ draft: string; original: number } | null>(null)
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [tempDiscount, setTempDiscount] = useState(() => (item.desconto_percentual || 0).toString())
  
  // CORREÇÃO: Estados para visual stock e disponível assíncronos
  const [visualStock, setVisualStock] = useState<number>(0)
  const [availableStock, setAvailableStock] = useState<number>(0)
  const [loadingStock, setLoadingStock] = useState<boolean>(false)
  
  const itemDiscount = item.desconto_percentual || 0
  
  // CORREÇÃO: Buscar visual stock e disponível assíncronos quando componente monta ou item muda
  useEffect(() => {
    const updateStockData = async () => {
      setLoadingStock(true)
      try {
        const [visual, available] = await Promise.all([
          getVisualStock(item.product_id),
          getAvailableStockForDisplay(item.product_id)
        ])
        setVisualStock(visual)
        setAvailableStock(available)
      } catch (error) {
        console.error('Erro ao buscar dados de estoque:', error)
        setVisualStock(0)
        setAvailableStock(0)
      } finally {
        setLoadingStock(false)
      }
    }
    
    updateStockData()
  }, [item.product_id, item.qty, getVisualStock, getAvailableStockForDisplay])
  
  // Calculate subtotals
  const baseSubtotal = item.unit_price_cents * item.qty
  const discountAmount = baseSubtotal * (itemDiscount / 100)
  const finalSubtotal = baseSubtotal - discountAmount

  const startEditingQty = () => {
    setEditingQty({ draft: String(item.qty), original: item.qty })
  }

  const saveQty = async () => {
    if (!editingQty) return
    const newQty = Math.max(1, parseInt(editingQty.draft) || 1)
    
    // CORREÇÃO: Validação baseada no limite para edição
    setLoadingStock(true)
    try {
      const [currentVisualStock, currentAvailable] = await Promise.all([
        getVisualStock(item.product_id),
        getAvailableStockForDisplay(item.product_id)
      ])
      setVisualStock(currentVisualStock)
      setAvailableStock(currentAvailable)
      
      // Validar se a quantidade não excede o limite para edição
      if (newQty > currentVisualStock) {
        toast({
          title: "❌ Quantidade excede limite",
          description: `Máximo permitido para edição: ${currentVisualStock}`,
          variant: "destructive"
        })
        return
      }
      
      if (newQty !== editingQty.original) {
        onUpdateQty(item.product_id, newQty)
      }
      setEditingQty(null)
    } catch (error) {
      console.error('Erro ao validar estoque:', error)
      toast({
        title: "❌ Erro ao validar estoque",
        description: "Tente novamente",
        variant: "destructive"
      })
    } finally {
      setLoadingStock(false)
    }
  }

  const cancelEditingQty = () => {
    setEditingQty(null)
  }

  const handleDiscountSubmit = () => {
    const discount = parseFloat(tempDiscount) || 0
    const clampedDiscount = Math.max(0, Math.min(100, discount))
    onUpdateDiscount(item.product_id, clampedDiscount)
    setTempDiscount(clampedDiscount.toString())
    setEditingDiscount(false)
  }

  const clearDiscount = () => {
    onUpdateDiscount(item.product_id, 0)
    setTempDiscount('0')
    setEditingDiscount(false)
  }

  const incrementQty = async () => {
    // CORREÇÃO: Validação baseada no limite para edição
    setLoadingStock(true)
    try {
      const [currentVisualStock, currentAvailable] = await Promise.all([
        getVisualStock(item.product_id),
        getAvailableStockForDisplay(item.product_id)
      ])
      setVisualStock(currentVisualStock)
      setAvailableStock(currentAvailable)
      
      // Validar se pode incrementar baseado no limite para edição
      if (item.qty < currentVisualStock) {
        onUpdateQty(item.product_id, item.qty + 1)
      } else {
        toast({
          title: "❌ Quantidade excede limite",
          description: `Máximo permitido para edição: ${currentVisualStock}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao validar estoque:', error)
      toast({
        title: "❌ Erro ao validar estoque",
        description: "Tente novamente",
        variant: "destructive"
      })
    } finally {
      setLoadingStock(false)
    }
  }

  const decrementQty = () => {
    if (item.qty > 1) {
      onUpdateQty(item.product_id, item.qty - 1)
    }
  }

  return (
    <TableRow>
      {/* Product Info */}
      <TableCell className="font-medium">
        {item.products?.name || 'Produto não encontrado'}
        {item.products?.short_code && (
          <div className="text-sm text-muted-foreground">
            Código: {item.products.short_code}
          </div>
        )}
          <div className="text-xs mt-1">
          <Badge variant="outline" className={availableStock > 0 ? "text-green-600" : "text-red-600"}>
            Disponível: {loadingStock ? "..." : availableStock}
          </Badge>
        </div>
      </TableCell>

      {/* Variation */}
      <TableCell>
        {[item.products?.size, item.products?.color, item.products?.brand]
          .filter(Boolean)
          .join(' • ') || '-'}
      </TableCell>

      {/* Unit Price */}
      <TableCell className="text-right">
        {formatCurrency(item.unit_price_cents / 100)}
      </TableCell>

      {/* Quantity */}
      <TableCell className="text-right">
        {editingQty ? (
          <div className="flex items-center gap-1 justify-center">
            <Input
              type="text"
              inputMode="numeric"
              value={editingQty.draft}
              onChange={(e) => setEditingQty({ ...editingQty, draft: e.target.value.replace(/\D/g, '') })}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveQty()
                if (e.key === 'Escape') cancelEditingQty()
              }}
              onBlur={saveQty}
              className="w-16 h-8 text-center"
              min="1"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={decrementQty}
              disabled={item.qty <= 1 || isUpdating}
              className="h-6 w-6 p-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={startEditingQty}
              className="min-w-8 px-2"
            >
              {item.qty}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={incrementQty}
              disabled={item.qty >= visualStock || isUpdating || loadingStock}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </TableCell>

      {/* Item Discount */}
      <TableCell className="text-right">
        <div className="flex items-center gap-1 justify-center">
          {editingDiscount ? (
            <>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={tempDiscount}
                onChange={(e) => setTempDiscount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDiscountSubmit()
                  if (e.key === 'Escape') setEditingDiscount(false)
                }}
                onBlur={handleDiscountSubmit}
                className="w-16 h-8 text-center"
                placeholder="0"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDiscount}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempDiscount((itemDiscount || 0).toString())
                setEditingDiscount(true)
              }}
              className="flex items-center gap-1"
            >
              {itemDiscount > 0 ? (
                <span className="text-blue-600 font-medium">{itemDiscount}%</span>
              ) : (
                <Percent className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </TableCell>

      {/* Subtotal */}
      <TableCell className="text-right font-medium">
        {itemDiscount > 0 ? (
          <div>
            <div className="text-xs text-red-500 line-through">
              {formatCurrency(baseSubtotal / 100)}
            </div>
            <div className="text-primary">
              {formatCurrency(finalSubtotal / 100)}
            </div>
          </div>
        ) : (
          <div className="text-primary">
            {formatCurrency(finalSubtotal / 100)}
          </div>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={startEditingQty}
            disabled={isUpdating}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item.product_id, item.products?.name || 'Produto')}
            className="text-destructive hover:text-destructive"
            disabled={isUpdating}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}