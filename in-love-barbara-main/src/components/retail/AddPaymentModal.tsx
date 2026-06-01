import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign, Smartphone, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { retailSalesApi } from "@/lib/api";

interface AddPaymentModalProps {
  sale: any;
  open: boolean;
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

export function AddPaymentModal({ sale, open, onOpenChange, onPaymentAdded }: AddPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Calcular valores da venda - SEMPRE a partir dos itens
  const getTotalAmount = (sale: any) => {
    if (!sale) return 0;
    // ✅ SEMPRE calcular a partir dos itens (não confiar no total_cents salvo)
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
    if (open) {
      setPaymentMethod("");
      setPaymentAmount("");
    }
  }, [open]);

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
      const result = await retailSalesApi.addPaymentToSale(sale.id, {
        method: paymentMethod,
        amount_cents: Math.round(amount * 100)
      });

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
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Adicionar Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da venda */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Venda #{sale.id.slice(-8)}</CardTitle>
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
            <div className="space-y-2 relative z-0">
              <Label htmlFor="method">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method" className="w-full">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent className="z-[110]" position="popper">
                  {PAYMENT_METHODS.map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={pendingAmount / 100}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`Máximo: ${formatCurrency(pendingAmount)}`}
              />
            </div>

            {/* Botões de valor rápido */}
            <div className="space-y-2">
              <Label>Valores Rápidos</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((pendingAmount / 100).toString())}
                >
                  Valor Total
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(((pendingAmount / 100) / 2).toFixed(2))}
                >
                  Metade
                </Button>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={isLoading || !paymentMethod || !paymentAmount}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Adicionando..." : "Adicionar Pagamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
