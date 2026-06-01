import React, { useState } from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Edit, Trash2, X, Percent } from 'lucide-react'
import { ConsignacaoItem } from '@/hooks/useConsignacaoLote'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface ConsignacaoItemRowProps {
  item: ConsignacaoItem
  isDelivered: boolean
  onUpdateQty: (itemId: string, qty: number) => void
  onUpdateDiscount: (itemId: string, discount: number) => void
  onDelete: (itemId: string, productName: string) => void
  isUpdatingItem: boolean
}

export function ConsignacaoItemRow({
  item,
  isDelivered,
  onUpdateQty,
  onUpdateDiscount,
  onDelete,
  isUpdatingItem
}: ConsignacaoItemRowProps) {
  const { toast } = useToast()
  const [editingQty, setEditingQty] = useState<{ draft: string; original: number } | null>(null)
  const [editingDiscount, setEditingDiscount] = useState(false)
  // Try to get discount from item, fallback to 0 if column doesn't exist yet
  const [tempDiscount, setTempDiscount] = useState(() => {
    try {
      return (item.desconto_percentual || 0).toString()
    } catch {
      return '0'
    }
  })

  const availableStock = item.products?.stock || 0
  // Try to get item discount, fallback to 0 if column doesn't exist yet  
  const itemDiscount = (() => {
    try {
      return item.desconto_percentual || 0
    } catch {
      return 0
    }
  })()
  
  // Calculate subtotals
  const baseSubtotal = item.unit_price_cents * item.qty
  const discountAmount = baseSubtotal * (itemDiscount / 100)
  const finalSubtotal = baseSubtotal - discountAmount

  const startEditingQty = () => {
    setEditingQty({ draft: String(item.qty), original: item.qty })
  }

  const saveQty = () => {
    if (!editingQty) return
    const newQty = Math.max(1, parseInt(editingQty.draft) || 1)
    if (newQty !== editingQty.original) {
      onUpdateQty(item.id, newQty)
    }
    setEditingQty(null)
  }

  const cancelEditingQty = () => {
    setEditingQty(null)
  }

  const handleDiscountSubmit = () => {
    const discount = parseFloat(tempDiscount) || 0
    const clampedDiscount = Math.max(0, Math.min(100, discount))
    onUpdateDiscount(item.id, clampedDiscount)
    setTempDiscount(clampedDiscount.toString())
    setEditingDiscount(false)
  }

  const clearDiscount = () => {
    onUpdateDiscount(item.id, 0)
    setTempDiscount('0')
    setEditingDiscount(false)
  }

  const incrementQty = () => {
    if (item.qty < availableStock) {
      onUpdateQty(item.id, item.qty + 1)
    }
  }

  const decrementQty = () => {
    if (item.qty > 1) {
      onUpdateQty(item.id, item.qty - 1)
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
          {availableStock > 0 ? (
            <Badge variant="secondary" className="text-green-600">
              Disponível: {availableStock}
            </Badge>
          ) : (
            <Badge variant="destructive">
              Sem estoque
            </Badge>
          )}
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
        {editingQty && !isDelivered ? (
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
            {!isDelivered && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decrementQty}
                  disabled={item.qty <= 1 || isUpdatingItem}
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
                  disabled={item.qty >= availableStock || isUpdatingItem}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </>
            )}
            {isDelivered && (
              <span className="font-medium">{item.qty}</span>
            )}
          </div>
        )}
      </TableCell>

      {/* Item Discount */}
      <TableCell className="text-right">
        {!isDelivered ? (
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
        ) : (
          <span className="text-sm">
            {itemDiscount > 0 ? `${itemDiscount}%` : '-'}
          </span>
        )}
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
      {!isDelivered && (
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={startEditingQty}
              disabled={isUpdatingItem}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(item.id, item.products?.name || 'Produto')}
              className="text-destructive hover:text-destructive"
              disabled={isUpdatingItem}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}