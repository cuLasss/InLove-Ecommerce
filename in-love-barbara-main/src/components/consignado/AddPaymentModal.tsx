import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Banknote,
  Wallet,
  AlertCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type PaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'OUTRO'

interface AddPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPayment: (payment: {
    method: PaymentMethod
    amount_cents: number
    note?: string
  }) => Promise<void>
  remainingAmount: number
  isProcessing?: boolean
}

const PAYMENT_METHODS = [
  {
    value: 'DINHEIRO' as PaymentMethod,
    label: 'Dinheiro',
    icon: Banknote,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    value: 'PIX' as PaymentMethod,
    label: 'PIX',
    icon: Smartphone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    value: 'DEBITO' as PaymentMethod,
    label: 'Cartão de Débito',
    icon: CreditCard,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    value: 'CREDITO' as PaymentMethod,
    label: 'Cartão de Crédito',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    value: 'OUTRO' as PaymentMethod,
    label: 'Outro',
    icon: Wallet,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
]

export function AddPaymentModal({ 
  open, 
  onOpenChange, 
  onAddPayment, 
  remainingAmount,
  isProcessing = false
}: AddPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const formatCurrency = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
  }

  const parseCurrency = (value: string): number => {
    // Remove tudo exceto números e vírgula/ponto
    const cleanValue = value.replace(/[^\d,.-]/g, '').replace(',', '.')
    const numValue = parseFloat(cleanValue) || 0
    return Math.round(numValue * 100) // Converte para centavos
  }

  const handleAmountChange = (value: string) => {
    // Permite apenas números, vírgula e ponto
    const cleanValue = value.replace(/[^\d,.-]/g, '')
    setAmount(cleanValue)
  }

  const handleQuickAmount = (percentage: number) => {
    const quickAmount = Math.round((remainingAmount * percentage) / 100)
    setAmount((quickAmount / 100).toFixed(2).replace('.', ','))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedMethod) {
      toast({
        title: "Erro",
        description: "Selecione uma forma de pagamento",
        variant: "destructive"
      })
      return
    }

    const amountCents = parseCurrency(amount)
    
    if (amountCents <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido",
        variant: "destructive"
      })
      return
    }

    if (amountCents > remainingAmount) {
      toast({
        title: "Erro",
        description: "O valor não pode ser maior que o valor restante",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      await onAddPayment({
        method: selectedMethod,
        amount_cents: amountCents,
        note: note.trim() || undefined
      })

      // Reset form
      setSelectedMethod('')
      setAmount('')
      setNote('')
      onOpenChange(false)

      toast({
        title: "✅ Pagamento adicionado",
        description: `${formatCurrency(amountCents)} registrado com sucesso`,
      })

    } catch (error: any) {
      toast({
        title: "❌ Erro ao adicionar pagamento",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMethodData = PAYMENT_METHODS.find(m => m.value === selectedMethod)
  const amountCents = parseCurrency(amount)
  const isValidAmount = amountCents > 0 && amountCents <= remainingAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Adicionar Pagamento
          </DialogTitle>
          <DialogDescription>
            Registre um pagamento para esta consignação. 
            Valor restante: <span className="font-semibold text-orange-600">
              {formatCurrency(remainingAmount)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção da Forma de Pagamento */}
          <div className="space-y-3">
            <Label>Forma de Pagamento</Label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon
                const isSelected = selectedMethod === method.value
                
                return (
                  <Card 
                    key={method.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? `${method.borderColor} ${method.bgColor} ring-2 ring-offset-2 ring-current` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMethod(method.value)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? method.color : 'text-gray-400'}`} />
                      <p className={`text-sm font-medium ${isSelected ? method.color : 'text-gray-600'}`}>
                        {method.label}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Valor do Pagamento */}
          <div className="space-y-3">
            <Label htmlFor="amount">Valor do Pagamento</Label>
            <div className="space-y-2">
              <Input
                id="amount"
                placeholder="0,00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`text-lg ${!isValidAmount && amount ? 'border-red-300' : ''}`}
              />
              
              {/* Botões de Valor Rápido */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(25)}
                  className="flex-1"
                >
                  25%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(50)}
                  className="flex-1"
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(100)}
                  className="flex-1"
                >
                  Total
                </Button>
              </div>

              {/* Validação do Valor */}
              {amount && !isValidAmount && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {amountCents > remainingAmount 
                    ? "Valor maior que o restante" 
                    : "Informe um valor válido"
                  }
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="note">Observações (opcional)</Label>
            <Textarea
              id="note"
              placeholder="Ex: Pagamento parcial, troco, etc..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Resumo */}
          {selectedMethod && isValidAmount && (
            <Card className={`${selectedMethodData?.bgColor} ${selectedMethodData?.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedMethodData && (
                      <selectedMethodData.icon className={`h-5 w-5 ${selectedMethodData.color}`} />
                    )}
                    <span className="font-medium">{selectedMethodData?.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {formatCurrency(amountCents)}
                  </Badge>
                </div>
                {amountCents === remainingAmount && (
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    ✅ Este pagamento quitará totalmente a consignação
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </form>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={!selectedMethod || !isValidAmount || isSubmitting || isProcessing}
            className="bg-primary hover:bg-primary-hover"
          >
            {isSubmitting ? "Processando..." : "Adicionar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}