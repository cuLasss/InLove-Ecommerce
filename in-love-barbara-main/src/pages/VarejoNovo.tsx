import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, ShoppingCart, CreditCard, Plus, Check, X, QrCode, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBlacklistVarejo } from "@/hooks/useBlacklistVarejo";
import { clientsApi, retailSalesApi } from "@/lib/api";
import { useRetailSaleStore } from "@/stores/retailSaleStore";
import { useQueryClient } from "@tanstack/react-query";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { ClientInput } from "@/components/ui/client-input";
import { ClientSearch } from "@/components/ui/client-search";
import { CollaboratorSearch } from "@/components/ui/collaborator-search";
import { SmartScannerSheet } from "@/components/scan/SmartScannerSheet";
import { CartItem } from "@/components/retail/CartItem";
import { ManualProductEntry } from "@/components/retail/ManualProductEntry";
import { CurrentItemHUD } from "@/components/retail/CurrentItemHUD";
import { CartCard } from "@/components/retail/CartCard";
import { formatCurrency } from "@/lib/utils";
import { useUsers } from "@/hooks/useUsers";


type DbPaymentMethod = 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO'

const PAYMENT_LABEL: Record<DbPaymentMethod, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
}

const normalizePaymentMethod = (m: string): DbPaymentMethod => {
  const s = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  if (s === 'DINHEIRO' || s === 'PIX' || s === 'DEBITO' || s === 'CREDITO') {
    return s as DbPaymentMethod
  }
  throw new Error(`Método de pagamento inválido: ${m}`)
}

interface Client {
  id: string;
  name: string;
  whatsapp?: string;
}

type Step = 1 | 2 | 3;

export default function VarejoNovo() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { checkClientBlacklist } = useBlacklistVarejo();
  const { users } = useUsers();
  const queryClient = useQueryClient();
  
  // Estado do scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Store actions
  const {
    client,
    employee_id,
    items,
    currentStep: savedStep,
    setClient,
    setEmployee,
    setCurrentStep,
    addOrIncrementItem,
    updateItemQty,
    updateItemPrice,
    updateItemDiscount,
    removeItem,
    applyDiscountToAll,
    getTotals,
    clear
  } = useRetailSaleStore();

  const [step, setStep] = useState<Step>(() => {
    // Verificar se veio com estado de navegação
    const locationState = location.state as { step?: number } | null
    if (locationState?.step) {
      console.log('🛒 [VarejoNovo] Step definido pelo estado de navegação:', locationState.step)
      return locationState.step as Step
    }
    // Para nova venda, sempre começar na etapa 1 (produtos)
    console.log('🛒 [VarejoNovo] Nova venda iniciada - etapa 1')
    return 1
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<{method: string; amount: number}>>([]);
  const [discountToApply, setDiscountToApply] = useState<number>(0);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  const [isClientBlocked, setIsClientBlocked] = useState(false);

  const totals = getTotals();

  // Verificar se cliente está bloqueado quando selecionado
  useEffect(() => {
    const checkClientStatus = async () => {
      if (client?.id) {
        try {
          const blocked = await checkClientBlacklist(client.id);
          setIsClientBlocked(blocked);
        } catch (error) {
          console.error('Erro ao verificar status do cliente:', error);
          setIsClientBlocked(false);
        }
      } else {
        setIsClientBlocked(false);
      }
    };

    checkClientStatus();
  }, [client, checkClientBlacklist]);

  useEffect(() => {
    loadClients();
  }, []);

  // Verificar se há itens salvos no carrinho ao carregar a página
  useEffect(() => {
    console.log('🛒 [VarejoNovo] Página carregada, verificando carrinho:', {
      items_count: items.length,
      client: client?.name || 'Nenhum',
      employee_id: employee_id || 'Nenhum',
      saved_step: savedStep
    });
    
    // Verificar se é uma nova venda (sem estado de navegação)
    const locationState = location.state as { step?: number } | null
    if (!locationState?.step) {
      // É uma nova venda, limpar carrinho
      console.log('🛒 [VarejoNovo] Nova venda detectada - limpando carrinho')
      clear()
    } else if (items.length > 0) {
      console.log(`🛒 [VarejoNovo] Carrinho restaurado com ${items.length} itens:`, items.map(item => `${item.name} (${item.qty}x)`));
      console.log(`🛒 [VarejoNovo] Continuando na etapa ${savedStep}`);
    }
  }, []); // Executar apenas uma vez ao montar o componente

  // Sincronizar step local com o store
  useEffect(() => {
    if (savedStep && savedStep !== step) {
      console.log(`🛒 [VarejoNovo] Sincronizando step: ${step} -> ${savedStep}`);
      setStep(savedStep as Step);
    }
  }, [savedStep, step]);


  const loadClients = async () => {
    try {
      const data = await clientsApi.getByType("VAREJO");
      setClients(data || []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const handleStartSale = () => {
    setStep(2);
    setCurrentStep(2); // Salvar no store
  };

  const handleBackFromScanner = () => {
    // Manter carrinho ao voltar do scanner para configuração
    setStep(1);
    setCurrentStep(1); // Salvar no store
  };

  const handleGoToReview = () => {
    // Permitir ir para revisão SEM limpar carrinho
    setStep(3);
    setCurrentStep(3); // Salvar no store
  };


  const handleFinalizeSale = async () => {
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos para finalizar a venda",
        variant: "destructive"
      });
      return;
    }

    // Verificar se cliente está na blacklist do varejo
    if (client?.id) {
      try {
        const isBlocked = await checkClientBlacklist(client.id);
        if (isBlocked) {
          toast({
            title: "Cliente bloqueado",
            description: `${client.name} está na blacklist do varejo e não pode realizar compras.`,
            variant: "destructive",
            duration: 5000,
          });
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar blacklist:', error);
        // Em caso de erro, permitir a venda para não bloquear o sistema
      }
    }

    // Se não é pagamento pendente, validar métodos de pagamento
    if (!isPendingPayment) {
      if (paymentMethods.length === 0) {
        toast({
          title: "Forma de pagamento obrigatória",
          description: "Selecione ao menos uma forma de pagamento",
          variant: "destructive"
        });
        return;
      }

      const totalPayments = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
      const saleTotal = totals.total_cents / 100;
      
      // Verificar se pagamento parcial está marcado mas valor é igual ao total
      if (allowPartialPayment && Math.abs(totalPayments - saleTotal) <= 0.01) {
        toast({
          title: "Pagamento completo detectado",
          description: "Valor inserido é igual ao total da venda. Desmarcando pagamento parcial automaticamente.",
        });
        setAllowPartialPayment(false);
        // Continuar com a finalização normal
      }
      
      // Se não permite pagamento parcial, valores devem conferir exatamente
      if (!allowPartialPayment && Math.abs(totalPayments - saleTotal) > 0.01) {
        toast({
          title: "Valores não conferem",
          description: `Total: ${formatCurrency(saleTotal)} | Pagamentos: ${formatCurrency(totalPayments)}`,
          variant: "destructive"
        });
        return;
      }
      
      // Se permite pagamento parcial, não pode exceder o total
      if (allowPartialPayment && totalPayments > saleTotal + 0.01) {
        toast({
          title: "Pagamento excede o total",
          description: `Total: ${formatCurrency(saleTotal)} | Pagamentos: ${formatCurrency(totalPayments)}`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setIsLoading(true);

      const saleData = {
        client_id: client?.id || null,
        collaborator_id: employee_id || null,
        items: items.map(item => ({
          product_id: item.product_id,
          qty: item.qty,
          unit_price_cents: item.unit_price_cents,
          discount_percent: item.item_discount_pct || 0
        })),
        payments: isPendingPayment ? [] : paymentMethods.map(p => ({
          method: normalizePaymentMethod(p.method),
          amount_cents: Math.round(p.amount * 100),
        })),
        is_pending_payment: isPendingPayment,
        allow_partial_payment: allowPartialPayment
      };

      console.log('🔄 [VarejoNovo] Dados da venda sendo enviados:', {
        client_id: saleData.client_id,
        collaborator_id: saleData.collaborator_id,
        items_count: saleData.items.length,
        payments_count: saleData.payments.length,
        is_pending_payment: saleData.is_pending_payment,
        allow_partial_payment: saleData.allow_partial_payment,
        items: saleData.items,
        payments: saleData.payments,
        client: client,
        employee_id: employee_id
      });

      const result = await retailSalesApi.completeRetailSale(saleData) as {
        success: boolean;
        sale_id: string;
        total_cents: number;
      };

      const saleType = isPendingPayment ? "pendente de pagamento" : "finalizada";
      const paymentInfo = allowPartialPayment && !isPendingPayment ? 
        ` | Pago: ${formatCurrency(paymentMethods.reduce((sum, p) => sum + p.amount, 0))}` : "";
      
      toast({
        title: `✅ Venda ${saleType}!`,
        description: `ID: ${result.sale_id.slice(-8)} | Total: ${formatCurrency(result.total_cents / 100)}${paymentInfo}`,
      });

      // Invalidar cache para atualizar automaticamente a lista de vendas
      console.log('🔄 [VarejoNovo] Invalidando cache para atualizar lista de vendas...');
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-with-details-optimized'] });
      await queryClient.invalidateQueries({ queryKey: ['collaborator-metrics'] });
      
      // Forçar refetch imediato
      await queryClient.refetchQueries({ queryKey: ['sales'] });
      await queryClient.refetchQueries({ queryKey: ['sales-with-details-optimized'] });
      
      console.log('✅ [VarejoNovo] Cache invalidado e refetch forçado com sucesso');

      // Disparar evento customizado para notificar outras páginas
      window.dispatchEvent(new CustomEvent('saleCompleted', { 
        detail: { saleId: result.sale_id, totalCents: result.total_cents, isPendingPayment } 
      }));
      console.log('📡 [VarejoNovo] Evento saleCompleted disparado');

      // Simular clique no botão atualizar da página de varejo
      setTimeout(() => {
        const refreshButton = document.querySelector('[data-refresh-button="varejo"]') as HTMLButtonElement;
        if (refreshButton && !refreshButton.disabled) {
          console.log('🔄 [VarejoNovo] Simulando clique no botão atualizar...');
          refreshButton.click();
        } else {
          console.log('⚠️ [VarejoNovo] Botão atualizar não encontrado ou desabilitado');
        }
      }, 500); // Delay maior para garantir que a página carregue

      // Pequeno delay para garantir que a invalidação seja processada
      await new Promise(resolve => setTimeout(resolve, 200));

      // Marcar como finalizado antes de limpar
      setIsFinalized(true);
      clear(); // Isso também limpa o localStorage devido à persistência
      setPaymentMethods([]);
      setIsPendingPayment(false);
      setAllowPartialPayment(false);
      
      // Voltar para o início
      setStep(1);
      
      // Navegar para o dashboard do varejo após finalizar a venda
      navigate('/varejo');
      
      // Atualizar a página automaticamente após um pequeno delay
      setTimeout(() => {
        console.log('🔄 [VarejoNovo] Atualizando página automaticamente...');
        window.location.reload();
      }, 1000); // Delay de 1 segundo para garantir que a navegação seja processada

    } catch (error: any) {
      toast({
        title: "❌ Erro ao finalizar venda",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSale = () => {
    clear(); // Limpa tanto o estado quanto o localStorage
    toast({
      title: "Venda cancelada",
      description: "Carrinho limpo e venda cancelada",
    });
    navigate("/varejo");
  };

  const addPaymentMethod = (method: string) => {
    const remaining = (totals.total_cents / 100) - paymentMethods.reduce((sum, p) => sum + p.amount, 0);
    if (remaining > 0) {
      setPaymentMethods([...paymentMethods, { method, amount: remaining }]);
    }
  };

  const updatePaymentAmount = (index: number, value: string) => {
    const amount = value === '' ? 0 : parseFloat(value) || 0;
    setPaymentMethods(paymentMethods.map((p, i) => 
      i === index ? { ...p, amount: Math.max(0, amount) } : p
    ));
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
  };

  const handleApplyDiscountToAll = () => {
    if (discountToApply >= 0 && discountToApply <= 100) {
      applyDiscountToAll(discountToApply);
      toast({
        title: "Desconto aplicado",
        description: `${discountToApply}% aplicado a todos os itens`,
      });
    } else {
      toast({
        title: "Valor inválido",
        description: "O desconto deve estar entre 0% e 100%",
        variant: "destructive"
      });
    }
  };

  // Passo 1: Configuração da venda
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/varejo")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nova Venda Varejo</h1>
            <p className="text-muted-foreground">Passo 1: Configuração da venda</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <ClientSearch
                clients={clients}
                value={client}
                onValueChange={setClient}
                placeholder="Digite o nome do cliente..."
                label="Cliente (opcional)"
              />
              
              {/* Aviso de cliente bloqueado */}
              {isClientBlocked && client && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div className="text-sm text-red-800">
                    <strong>Cliente bloqueado:</strong> {client.name} está na blacklist do varejo e não pode realizar compras.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <CollaboratorSearch
                collaborators={users}
                value={employee_id ? { id: employee_id, name: users.find(u => u.id === employee_id)?.name || employee_id } : null}
                onValueChange={(value) => {
                  if (value?.isNew) {
                    // Se é uma nova colaboradora, criar
                    console.log('Nova colaboradora:', value.name)
                    // Por enquanto, apenas limpar a seleção
                    setEmployee(null)
                  } else if (value?.id) {
                    setEmployee(value.id)
                  } else {
                    setEmployee(null)
                  }
                }}
                placeholder="Digite o nome da colaboradora..."
                label="Colaboradora (opcional)"
              />
            </div>

            <Button 
              onClick={handleStartSale}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Iniciar Scanner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Passo 2: Scanner + Carrinho
  if (step === 2) {
    return (
      <main className="mx-auto max-w-6xl px-2 sm:px-4 min-h-[calc(100vh-80px)] grid place-items-center w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-full space-y-6 min-w-0">
          {/* Header discreto */}
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-4">
              <Button variant="outline" onClick={handleBackFromScanner}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <h1 className="text-xl font-medium text-muted-foreground">Varejo</h1>
            <p className="text-sm text-muted-foreground">Adicione produtos ao carrinho</p>
          </div>

          {/* Cart Card centralizado */}
          <CartCard 
            onCheckout={handleGoToReview}
            onCancel={handleCancelSale}
          />
        </div>
      </main>
    );
  }

  // Passo 3: Revisão e Fechamento
  return (
    <>
      <style>{`
        .checkout-page-container {
          max-width: 100% !important;
          width: 100% !important;
          padding: 0 1rem !important;
          box-sizing: border-box !important;
        }
        
        .checkout-header {
          display: flex !important;
          flex-direction: column !important;
          gap: 1rem !important;
          margin-bottom: 1.5rem !important;
        }
        
        .checkout-header-top {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          gap: 1rem !important;
          flex-wrap: wrap !important;
        }
        
        .checkout-header-title {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.25rem !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }
        
        .checkout-header-title h1 {
          font-size: 1.5rem !important;
          line-height: 1.2 !important;
        }
        
        .checkout-header-title p {
          font-size: 0.875rem !important;
        }
        
        .checkout-header-actions {
          flex-shrink: 0 !important;
        }
        
        .checkout-grid {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1.5rem !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .checkout-products-card {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }
        
        .checkout-products-header {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.75rem !important;
          width: 100% !important;
        }
        
        .checkout-products-header-actions {
          display: flex !important;
          flex-direction: row !important;
          gap: 0.5rem !important;
          flex-wrap: wrap !important;
          width: 100% !important;
        }
        
        .checkout-discount-input {
          flex: 1 1 auto !important;
          min-width: 80px !important;
          max-width: 120px !important;
        }
        
        .checkout-discount-button {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          white-space: nowrap !important;
        }
        
        .checkout-summary-section {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }
        
        .checkout-main-layout {
          display: flex !important;
          flex-direction: column !important;
          gap: 1.5rem !important;
          width: 100% !important;
        }
        
        .checkout-main-content {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1.5rem !important;
          width: 100% !important;
        }
        
        /* A partir de 1050px - layout horizontal dividido */
        @media (min-width: 1050px) {
          .checkout-main-content {
            grid-template-columns: 1fr 1fr !important;
            gap: 1.5rem !important;
          }
          
          .checkout-products-card {
            min-width: 0 !important;
          }
          
          .checkout-summary-section {
            min-width: 0 !important;
          }
        }
        
        /* A partir de 1144px */
        @media (max-width: 1144px) {
          .checkout-page-container {
            padding: 0 0.75rem !important;
          }
          
          .checkout-header-title h1 {
            font-size: 1.25rem !important;
          }
          
          .checkout-header-title p {
            font-size: 0.8rem !important;
          }
        }
        
        /* Entre 768px e 1049px - layout vertical */
        @media (min-width: 768px) and (max-width: 1049px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
        }
        
        /* A partir de 1280px (large desktop) */
        @media (min-width: 1280px) {
          .checkout-page-container {
            max-width: 80rem !important;
            margin: 0 auto !important;
          }
        }
        
        /* Mobile - até 640px */
        @media (max-width: 640px) {
          .checkout-page-container {
            padding: 0 0.5rem !important;
          }
          
          .checkout-header-top {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          
          .checkout-header-actions {
            width: 100% !important;
          }
          
          .checkout-header-actions button {
            width: 100% !important;
          }
          
          .checkout-products-header-actions {
            flex-direction: column !important;
          }
          
          .checkout-discount-input,
          .checkout-discount-button {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .checkout-discount-button span {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      <div className="checkout-page-container space-y-6">
        <div className="checkout-header">
          <div className="checkout-header-top">
          <Button variant="outline" onClick={() => {
            setStep(2);
            setCurrentStep(2);
            }} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
            <div className="checkout-header-title">
            <h1 className="text-2xl font-bold">Conferir Venda</h1>
            <p className="text-muted-foreground">Passo 3: Revise e finalize a venda</p>
          </div>
            <div className="checkout-header-actions">
        <AlertDialog>
          <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
              <X className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Cancelar Venda</span>
                    <span className="sm:hidden">Cancelar</span>
            </Button>
          </AlertDialogTrigger>
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
            </div>
          </div>
      </div>

        <div className="checkout-main-layout">
          <div className="checkout-main-content">
        {/* Lista de itens */}
            <div className="checkout-products-card">
          <Card>
                <CardHeader className="checkout-products-header">
              <CardTitle>Produtos ({items.length})</CardTitle>
                  <div className="checkout-products-header-actions">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="% desconto"
                  value={discountToApply || ''}
                  onChange={(e) => setDiscountToApply(Number(e.target.value) || 0)}
                      className="checkout-discount-input"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleApplyDiscountToAll}
                  disabled={discountToApply === 0}
                      className="checkout-discount-button"
                >
                      <span className="hidden sm:inline">Aplicar {discountToApply}% a todos</span>
                      <span className="sm:hidden">Aplicar {discountToApply}%</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <CartItem
                    key={item.product_id}
                    item={item}
                    onUpdateQty={(qty) => updateItemQty(item.product_id, qty)}
                    onUpdatePrice={(price) => updateItemPrice(item.product_id, price)}
                    onUpdateDiscount={(discount) => updateItemDiscount(item.product_id, discount)}
                    onRemove={() => removeItem(item.product_id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo e Pagamento */}
            <div className="checkout-summary-section space-y-4">
          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal_cents / 100)}</span>
                </div>
                {totals.discount_cents > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>-{formatCurrency(totals.discount_cents / 100)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totals.total_cents / 100)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {client && (
                  <div className="text-sm">
                    <span className="font-medium">Cliente:</span> {client.name}
                    {client.isNew && <Badge variant="secondary" className="ml-2">Avulso</Badge>}
                  </div>
                )}
                {employee_id && (
                  <div className="text-sm">
                    <span className="font-medium">Colaboradora:</span> {users.find(u => u.id === employee_id)?.name || employee_id}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pagamentos
                {isPendingPayment && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Opção de pagamento pendente */}
              <div className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Pagamento Pendente</span>
                  </div>
                  <Button
                    variant={isPendingPayment ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setIsPendingPayment(!isPendingPayment);
                      if (!isPendingPayment) {
                        setPaymentMethods([]);
                      }
                    }}
                    className={isPendingPayment ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    {isPendingPayment ? "Ativo" : "Ativar"}
                  </Button>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  Cliente pagará posteriormente. Venda aparecerá como pendente no financeiro.
                </p>
              </div>

              {/* Opção de pagamento parcial */}
              <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Pagamento Parcial</span>
                  </div>
                  <Button
                    variant={allowPartialPayment ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAllowPartialPayment(!allowPartialPayment)}
                    className={allowPartialPayment ? "bg-blue-600 hover:bg-blue-700" : ""}
                    disabled={isPendingPayment}
                  >
                    {allowPartialPayment ? "Ativo" : "Ativar"}
                  </Button>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Cliente pode pagar apenas parte do valor. Restante ficará pendente.
                </p>
              </div>

              {!isPendingPayment && (
                <>
                  {paymentMethods.map((payment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline">
                    {PAYMENT_LABEL[normalizePaymentMethod(payment.method)]}
                  </Badge>
                  <Input
                    type="number"
                    step="0.01"
                    value={payment.amount === 0 ? '' : payment.amount}
                    onChange={(e) => updatePaymentAmount(index, e.target.value)}
                    placeholder="0,00"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePaymentMethod(index)}
                  >
                    ✕
                  </Button>
                </div>
              ))}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addPaymentMethod("DINHEIRO")}
                    >
                      + Dinheiro
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addPaymentMethod("PIX")}
                    >
                      + PIX
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addPaymentMethod("DEBITO")}
                    >
                      + Débito
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addPaymentMethod("CREDITO")}
                    >
                      + Crédito
                    </Button>
                  </div>
                </>
              )}

              <div className="pt-4">
                {!isPendingPayment && (
                  <div className="space-y-2 mb-2">
                    <div className="text-sm text-muted-foreground">
                      Total pagamentos: {formatCurrency(paymentMethods.reduce((sum, p) => sum + p.amount, 0))}
                    </div>
                    {allowPartialPayment && paymentMethods.length > 0 && (
                      <div className="text-sm text-blue-600">
                        Restante: {formatCurrency((totals.total_cents / 100) - paymentMethods.reduce((sum, p) => sum + p.amount, 0))}
                      </div>
                    )}
                  </div>
                )}
                <Button 
                  onClick={handleFinalizeSale}
                  disabled={isLoading || items.length === 0 || (!isPendingPayment && paymentMethods.length === 0) || isClientBlocked}
                  className={`w-full ${isPendingPayment ? 'bg-orange-600 hover:bg-orange-700' : allowPartialPayment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isLoading ? "Finalizando..." : isClientBlocked ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Cliente Bloqueado
                    </>
                  ) : (
                    <>
                      {isPendingPayment ? (
                        <>
                          <Clock className="mr-2 h-4 w-4" />
                          Finalizar como Pendente
                        </>
                      ) : allowPartialPayment ? (
                        <>
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Finalizar com Pagamento Parcial
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Fechar Venda
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
      </div>
    </>
  );
}