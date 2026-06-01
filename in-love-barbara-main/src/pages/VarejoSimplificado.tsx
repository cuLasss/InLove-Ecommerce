import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { retailSalesApi } from "@/lib/api";
import { useRetailSaleStore } from "@/stores/retailSaleStore";
import { CartCard } from "@/components/retail/CartCard";
import { formatCurrency } from "@/lib/utils";

type DbPaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO';

const normalizePaymentMethod = (m: string): DbPaymentMethod => {
  const s = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (s === 'DINHEIRO' || s === 'PIX' || s === 'DEBITO' || s === 'CREDITO') {
    return s as DbPaymentMethod;
  }
  throw new Error(`Método de pagamento inválido: ${m}`);
};

export default function VarejoSimplificado() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const {
    items,
    getTotals,
    clear
  } = useRetailSaleStore();

  const totals = getTotals();

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos para continuar",
        variant: "destructive"
      });
      return;
    }
    
    // Navigate to the payment/checkout step
    navigate("/varejo/novo", { state: { step: 3 } });
  };

  const handleCancelSale = () => {
    clear();
    toast({
      title: "Venda cancelada",
      description: "Carrinho limpo",
    });
    setShowCancelDialog(false);
  };

  const handleCancelClick = () => {
    if (items.length > 0) {
      setShowCancelDialog(true);
    } else {
      handleCancelSale();
    }
  };

  return (
    <>
      <div className="min-h-[calc(100vh-96px)] flex items-center justify-center">
        <div className="w-full lg:max-w-3xl xl:max-w-4xl mx-auto px-4 py-6">
          {/* Header discreto */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-xl font-medium text-muted-foreground">Varejo</h1>
            <p className="text-sm text-muted-foreground">Adicione produtos ao carrinho</p>
          </div>

          {/* Cart Card centralizado */}
          <CartCard 
            onCheckout={handleCheckout}
            onCancel={handleCancelClick}
          />
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venda em andamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apagará todos os itens do carrinho. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSale}>
              Sim, cancelar venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}