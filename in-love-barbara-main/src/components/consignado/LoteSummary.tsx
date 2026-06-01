import { Card, CardContent } from '@/components/ui/card'
import { Calculator, Package, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LoteSummaryProps {
  totals: {
    itemsCount: number
    subtotalCents: number
    discountCents: number
    totalCents: number
  }
}

export function LoteSummary({ totals }: LoteSummaryProps) {
  if (totals.itemsCount === 0) return null

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Título */}
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="h-5 w-5" />
            Resumo do Lote
          </div>

          {/* Linha de itens */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Itens ({totals.itemsCount})</span>
            </div>
            <span className="font-medium">
              {formatCurrency(totals.subtotalCents / 100)}
            </span>
          </div>

          {/* Linha de comissão (se houver) */}
          {totals.discountCents > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Comissão</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(totals.discountCents / 100)}
              </span>
            </div>
          )}

          {/* Linha total */}
          <div className="flex items-center justify-between text-lg font-semibold pt-2 border-t">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Total Líquido</span>
            </div>
            <span className="text-primary">
              {formatCurrency(totals.totalCents / 100)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}