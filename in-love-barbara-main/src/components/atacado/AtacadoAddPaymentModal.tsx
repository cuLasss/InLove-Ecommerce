import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  DollarSign, 
  Smartphone,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { universalDataAdapter } from '@/lib/universal-data-adapter';

interface AtacadoAddPaymentModalProps {
  sale: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentAdded: () => void;
}

const PAYMENT_METHODS = [
  { value: "DINHEIRO", label: "Dinheiro", icon: DollarSign },
  { value: "PIX", label: "PIX", icon: Smartphone },
  { value: "DEBITO", label: "Débito", icon: CreditCard },
  { value: "CREDITO", label: "Crédito", icon: CreditCard },
];

const PAYMENT_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

export function AtacadoAddPaymentModal({ 
  sale, 
  isOpen, 
  onOpenChange, 
  onPaymentAdded 
}: AtacadoAddPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Calcular valores da venda
  const getTotalAmount = (sale: any) => {
    if (!sale) return 0;
    if (sale.total_cents !== undefined) {
      return sale.total_cents;
    }
    return sale.items?.reduce((sum: number, item: any) => {
      const itemTotal = item.unit_price_cents * item.qty;
      const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
      return sum + (itemTotal - discountAmount);
    }, 0) || 0;
  };

  const getPaidAmount = (sale: any) => {
    if (!sale) return 0;
    return sale.payments?.reduce((sum: number, p: any) => sum + p.amount_cents, 0) || 0;
  };

  const totalAmount = getTotalAmount(sale);
  const paidAmount = getPaidAmount(sale);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("");
      setPaymentAmount("");
    }
  }, [isOpen]);

  const handleAddPayment = async () => {
    if (!paymentMethod) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Selecione um método de pagamento",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido",
        variant: "destructive"
      });
      return;
    }

    if (amount > pendingAmount / 100) {
      toast({
        title: "Valor excede o pendente",
        description: `Valor máximo: R$ ${(pendingAmount / 100).toFixed(2).replace('.', ',')}`,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Chamar a API para adicionar pagamento
      const result = await universalDataAdapter.addPaymentToSale(sale.id, {
        method: paymentMethod,
        amount_cents: Math.round(amount * 100)
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast({
        title: "✅ Pagamento adicionado!",
        description: `${PAYMENT_LABEL[paymentMethod]}: R$ ${amount.toFixed(2).replace('.', ',')}`,
      });

      onPaymentAdded();
      onOpenChange(false);

    } catch (error: any) {
      toast({
        title: "❌ Erro ao adicionar pagamento",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
  };

  // Se não há venda selecionada, não renderizar o modal
  if (!sale) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-auto max-w-[560px] sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-xl atacado-add-payment-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-5 w-5" />
            Adicionar Pagamento - Atacado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Informações da venda */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Venda #{sale.id.slice(-8)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pago:</span>
                <span className="text-green-600">{formatCurrency(paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span>Pendente:</span>
                <span className="text-orange-600 font-semibold">{formatCurrency(pendingAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de pagamento */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <method.icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Valor (R$)</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={pendingAmount / 100}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0,00"
              />
              <div className="text-xs text-muted-foreground">
                Valor máximo: {formatCurrency(pendingAmount)}
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 add-payment-actions">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddPayment}
              className="w-full"
              disabled={isLoading || !paymentMethod || !paymentAmount}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Adicionar Pagamento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
