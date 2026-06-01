import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/money'
import { cn } from '@/lib/utils'

interface PaymentPillProps {
  method: string
  amount: number
}

const PAYMENT_LABELS = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX', 
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  BOLETO: 'Boleto'
} as const

const PAYMENT_STYLES = {
  PIX: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300',
  CREDITO: 'border-primary/20 bg-primary/5 text-primary dark:border-primary/30 dark:bg-primary/10',
  DEBITO: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  DINHEIRO: 'border-border bg-muted text-muted-foreground',
  BOLETO: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
}

export function PaymentPill({ method, amount }: PaymentPillProps) {
  const label = PAYMENT_LABELS[method as keyof typeof PAYMENT_LABELS] || method
  const styleKey = method as keyof typeof PAYMENT_STYLES
  const customStyle = PAYMENT_STYLES[styleKey] || PAYMENT_STYLES.DINHEIRO

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "px-2.5 py-1 text-xs rounded-full whitespace-nowrap",
        customStyle
      )}
    >
      {label} • {formatBRL(amount)}
    </Badge>
  )
}