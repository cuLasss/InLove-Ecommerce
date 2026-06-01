import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Minus, 
  Calculator, 
  Package,
  DollarSign,
  Target,
  ShoppingCart,
  X,
  AlertCircle,
  CreditCard,
  Smartphone,
  Clock
} from 'lucide-react';
import { useAtacadoSales } from '@/hooks/useAtacadoSales';
import { useProducts } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useUsers } from '@/hooks/useUsers';
import { useBlacklistAtacado } from '@/hooks/useBlacklistAtacado';
import { useToast } from '@/hooks/use-toast';
import { universalDataAdapter } from '@/lib/universal-data-adapter';

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

interface AtacadoNewSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CartItem {
  product: any;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  batchDiscount: number;
  profitPerUnit: number;
  discountInput?: string; // Novo campo para controle do input
}

export function AtacadoNewSaleDialog({ isOpen, onOpenChange }: AtacadoNewSaleDialogProps) {
  const { toast } = useToast();
  const { createAtacadoSale, addItemToSale, finalizeSale, isCreating, isAddingItem, isFinalizing } = useAtacadoSales();
  
  const { products = [], isLoading: productsLoading, error: productsError } = useProducts();
  const { data: allClients = [] } = useClients();
  const { users = [] } = useUsers();
  const { checkClientBlacklist, isClientBlocked, blacklistEntries } = useBlacklistAtacado();
  
  // Filtrar apenas clientes do tipo ATACADO e remover os que estão na blacklist
  const clients = useMemo(() => {
    console.log('🔍 [AtacadoNewSaleDialog] Todos os clientes:', allClients.map(c => ({ 
      id: c.id, 
      name: c.name, 
      types: c.types 
    })));
    
    console.log('🔍 [AtacadoNewSaleDialog] Entradas da blacklist:', blacklistEntries.map(e => ({ 
      id: e.id, 
      client_id: e.client_id, 
      client_name: e.client_name 
    })));
    
    const atacadoClients = allClients.filter((client: any) => {
      // Verificar se é do tipo ATACADO
      const hasAtacadoType = client.types && client.types.includes('ATACADO');
      
      // Verificar se não está na blacklist
      const isBlocked = isClientBlocked(client.id);
      
      if (hasAtacadoType && isBlocked) {
        console.log(`🔍 [AtacadoNewSaleDialog] Cliente ${client.name} (${client.id}) está bloqueado e será removido da lista`);
      }
      
      return hasAtacadoType && !isBlocked;
    });
    
    console.log('🔍 [AtacadoNewSaleDialog] Clientes ATACADO filtrados (sem blacklist):', atacadoClients.map(c => ({ 
      id: c.id, 
      name: c.name, 
      types: c.types 
    })));
    
    return atacadoClients;
  }, [allClients, blacklistEntries, isClientBlocked]);

  // Debug: verificar se os usuários estão sendo carregados
  console.log('🔍 [AtacadoNewSaleDialog] Usuários carregados:', users);

  // Estados do formulário
  const [selectedClient, setSelectedClient] = useState<string>('none');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [batchDiscountPercent, setBatchDiscountPercent] = useState(0);
  const [batchDiscountInput, setBatchDiscountInput] = useState('');
  
  // Estados de pagamento
  const [paymentMethods, setPaymentMethods] = useState<Array<{method: string; amount: number; installments?: number}>>([]);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  const [paymentInputs, setPaymentInputs] = useState<{[key: number]: string}>({});
  const [paymentInstallments, setPaymentInstallments] = useState<{[key: number]: number}>({});
  
  // Estado para verificar se cliente selecionado está bloqueado
  const [isSelectedClientBlocked, setIsSelectedClientBlocked] = useState(false);
  const previousClientRef = useRef<string>('none');

  // Verificar se cliente está bloqueado quando selecionado
  useEffect(() => {
    const checkClientStatus = async () => {
      if (selectedClient && selectedClient !== 'none' && selectedClient.trim() !== '') {
        try {
          const blocked = await checkClientBlacklist(selectedClient);
          setIsSelectedClientBlocked(blocked);
        } catch (error) {
          console.error('Erro ao verificar status do cliente:', error);
          setIsSelectedClientBlocked(false);
        }
      } else {
        setIsSelectedClientBlocked(false);
      }
    };

    checkClientStatus();
  }, [selectedClient, checkClientBlacklist]);

  // Limpar carrinho quando o cliente for alterado
  useEffect(() => {
    // Se o cliente mudou e havia um cliente anterior selecionado, limpar o carrinho
    if (previousClientRef.current !== 'none' && selectedClient !== previousClientRef.current) {
      // Verificar se há itens no carrinho antes de limpar
      setCart(prevCart => {
        if (prevCart.length > 0) {
          setBatchDiscountPercent(0);
          setBatchDiscountInput('');
          setPaymentMethods([]);
          setPaymentInputs({});
          setPaymentInstallments({});
          toast({
            title: "Cliente alterado",
            description: "O carrinho foi limpo ao trocar de cliente.",
            duration: 2000,
          });
          return [];
        }
        return prevCart;
      });
    }

    previousClientRef.current = selectedClient;
  }, [selectedClient, toast]);

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.slice(0, 20);
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Busca mais inteligente: nome completo, código completo ou código parcial
    const filtered = products.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(searchLower);
      const codeMatch = product.short_code.toLowerCase().includes(searchLower);
      
      // Busca por código parcial (ex: "ABC" encontra "ABC123")
      const partialCodeMatch = product.short_code.toLowerCase().startsWith(searchLower);
      
      return nameMatch || codeMatch || partialCodeMatch;
    }).slice(0, 20);
    
    return filtered;
  }, [products, searchTerm]);

  // Calcular totais
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const discountAmount = itemTotal * (item.discountPercent / 100);
      const batchDiscountAmount = itemTotal * (item.batchDiscount / 100);
      return sum + itemTotal - discountAmount - batchDiscountAmount;
    }, 0);

    const totalBatchDiscount = subtotal * (batchDiscountPercent / 100);
    const finalTotal = subtotal - totalBatchDiscount;
    
    const totalProfit = cart.reduce((sum, item) => {
      return sum + (item.profitPerUnit * item.quantity);
    }, 0);

    return {
      subtotal,
      batchDiscount: totalBatchDiscount,
      finalTotal,
      totalProfit,
      totalItems: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cart, batchDiscountPercent]);

  // Adicionar produto ao carrinho
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Se já existe, aumentar quantidade apenas se não exceder o estoque
      const newQuantity = existingItem.quantity + 1;
      if (newQuantity <= (product.stock || 0)) {
        setCart(cart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      } else {
        toast({
          title: "Estoque insuficiente",
          description: `Máximo disponível: ${product.stock || 0} unidades`,
          variant: "destructive"
        });
      }
    } else {
      // Se não existe, adicionar apenas se houver estoque
      if ((product.stock || 0) > 0) {
        const unitPrice = product.price_cents || 0;
        const costPrice = product.cost_price_cents || 0;
        const profitPerUnit = Math.max(0, unitPrice - costPrice);
        
        const newItem: CartItem = {
          product,
          quantity: 1,
          unitPrice,
          discountPercent: 0,
          batchDiscount: 0,
          profitPerUnit,
          discountInput: '' // Campo vazio por padrão
        };
        
        setCart([...cart, newItem]);
      } else {
        toast({
          title: "Produto sem estoque",
          description: "Este produto não possui unidades disponíveis",
          variant: "destructive"
        });
      }
    }
  };

  // Atualizar quantidade
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }

    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    // Verificar se a quantidade não excede o estoque
    if (quantity > (cartItem.product.stock || 0)) {
      toast({
        title: "Estoque insuficiente",
        description: `Máximo disponível: ${cartItem.product.stock || 0} unidades`,
        variant: "destructive"
      });
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  // Atualizar desconto
  const updateDiscount = (productId: string, discountPercent: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const profitPerUnit = Math.max(0, item.unitPrice * (1 - discountPercent / 100) - (item.product.cost_price_cents || 0));
        
        return {
          ...item,
          discountPercent,
          profitPerUnit
        };
      }
      return item;
    }));
  };

  // Funções para desconto individual de produto
  const handleProductDiscountChange = (productId: string, value: string) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        // Atualizar o input
        const updatedItem = {
          ...item,
          discountInput: value
        };

        // Se o valor for válido, aplicar desconto em tempo real
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
          const profitPerUnit = Math.max(0, item.unitPrice * (1 - numericValue / 100) - (item.product.cost_price_cents || 0));
          return {
            ...updatedItem,
            discountPercent: numericValue,
            profitPerUnit
          };
        } else if (value === '') {
          // Se campo vazio, voltar ao desconto 0
          const profitPerUnit = Math.max(0, item.unitPrice - (item.product.cost_price_cents || 0));
          return {
            ...updatedItem,
            discountPercent: 0,
            profitPerUnit
          };
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const handleProductDiscountBlur = (productId: string) => {
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    // Se o campo estiver vazio, manter vazio (desconto já foi aplicado como 0)
    if (cartItem.discountInput === '') {
      return;
    }

    // Se o valor for inválido, restaurar valor anterior
    const numericValue = parseFloat(cartItem.discountInput);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      setCart(cart.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountInput: item.discountPercent === 0 ? '' : item.discountPercent.toString()
          };
        }
        return item;
      }));
    }
  };

  const handleProductDiscountFocus = (productId: string) => {
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    // Se o desconto for 0, manter campo vazio para facilitar digitação
    if (cartItem.discountPercent === 0) {
      setCart(cart.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountInput: ''
          };
        }
        return item;
      }));
    }
    // Se não for 0, manter o valor atual para edição
  };

  // Funções para desconto de lote
  const handleBatchDiscountChange = (value: string) => {
    setBatchDiscountInput(value);
  };

  const handleBatchDiscountBlur = () => {
    const numericValue = parseFloat(batchDiscountInput);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
      setBatchDiscountPercent(numericValue);
      // Manter o valor digitado no input para permitir edição
      setBatchDiscountInput(numericValue.toString());
    } else if (batchDiscountInput === '') {
      // Se campo vazio, definir como 0
      setBatchDiscountPercent(0);
      setBatchDiscountInput('');
    } else {
      // Se valor inválido, restaurar valor anterior
      setBatchDiscountInput(batchDiscountPercent.toString());
    }
  };

  const handleBatchDiscountFocus = () => {
    // Sempre permitir edição - mostrar o valor atual no campo
    setBatchDiscountInput(batchDiscountPercent.toString());
  };

  // Calcular desconto por lote
  const calculateItemBatchDiscount = (item: CartItem) => {
    const batchThresholds = [
      { minQty: 50, discountPercent: 15 },
      { minQty: 30, discountPercent: 10 },
      { minQty: 20, discountPercent: 8 },
      { minQty: 10, discountPercent: 5 }
    ];
    
    // Encontrar o maior desconto aplicável
    let maxDiscount = item.discountPercent;
    for (const threshold of batchThresholds) {
      if (item.quantity >= threshold.minQty) {
        maxDiscount = Math.max(maxDiscount, threshold.discountPercent);
      }
    }
    
    return maxDiscount;
  };

  // Funções de pagamento
  const addPaymentMethod = (method: string) => {
    // Calcular total atual dos pagamentos existentes
    const currentTotal = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Calcular quanto ainda pode ser pago
    const remainingAmount = (totals.finalTotal / 100) - currentTotal;
    
    // Se não há valor restante, não adicionar novo método
    if (remainingAmount <= 0) {
      toast({
        title: "Limite atingido",
        description: "O valor total do pedido já foi coberto pelos pagamentos existentes.",
        variant: "destructive"
      });
      return;
    }
    
    // Adicionar novo método com o valor restante
    const newIndex = paymentMethods.length;
    const newPayment = { 
      method, 
      amount: remainingAmount,
      installments: method === 'CREDITO' ? 1 : undefined
    };
    setPaymentMethods([...paymentMethods, newPayment]);
    
    // Inicializar o input com valor formatado
    setPaymentInputs(prev => ({
      ...prev,
      [newIndex]: remainingAmount > 0 ? formatCurrencyInput(remainingAmount) : ''
    }));
    
    // Se for crédito, definir parcelas padrão
    if (method === 'CREDITO') {
      setPaymentInstallments(prev => ({
        ...prev,
        [newIndex]: 1
      }));
    }
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
    
    // Limpar o input correspondente
    setPaymentInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[index];
      return newInputs;
    });
    
    // Limpar as parcelas correspondentes
    setPaymentInstallments(prev => {
      const newInstallments = { ...prev };
      delete newInstallments[index];
      return newInstallments;
    });
  };

  // Função para atualizar número de parcelas
  const updatePaymentInstallments = (index: number, installments: number) => {
    setPaymentInstallments(prev => ({
      ...prev,
      [index]: installments
    }));
    
    // Atualizar também no array de métodos de pagamento
    setPaymentMethods(prev => prev.map((payment, i) => 
      i === index ? { ...payment, installments } : payment
    ));
  };

  const updatePaymentAmount = (index: number, value: string) => {
    // Durante a digitação, apenas atualiza o input sem formatação
    setPaymentInputs(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handlePaymentBlur = (index: number) => {
    // Quando sair do campo, converte e formata o valor
    const inputValue = paymentInputs[index] || '';
    const cleanValue = inputValue.replace(/[^\d]/g, ''); // Remove tudo exceto números
    const amount = parseFloat(cleanValue) || 0; // Valor direto em reais
    
    // Calcular total atual dos outros pagamentos (exceto o que está sendo editado)
    const otherPaymentsTotal = paymentMethods.reduce((sum, payment, i) => 
      i === index ? sum : sum + payment.amount, 0
    );
    
    // Limitar o valor ao máximo permitido (valor total do pedido - outros pagamentos)
    const maxAllowed = (totals.finalTotal / 100) - otherPaymentsTotal;
    const limitedAmount = Math.min(amount, maxAllowed);
    
    // Atualizar o valor real do pagamento
    setPaymentMethods(paymentMethods.map((payment, i) => 
      i === index ? { ...payment, amount: limitedAmount } : payment
    ));
    
    // Atualizar o input com valor formatado
    setPaymentInputs(prev => ({
      ...prev,
      [index]: limitedAmount > 0 ? formatCurrencyInput(limitedAmount) : ''
    }));
  };

  // Função para formatar valor monetário
  const formatCurrencyInput = (value: number): string => {
    if (value === 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace('R$', '').trim();
  };

  // Função para preencher com valor total
  const fillWithTotal = (index: number) => {
    // Calcular total atual dos outros pagamentos (exceto o que está sendo editado)
    const otherPaymentsTotal = paymentMethods.reduce((sum, payment, i) => 
      i === index ? sum : sum + payment.amount, 0
    );
    
    // Limitar ao máximo permitido
    const maxAllowed = (totals.finalTotal / 100) - otherPaymentsTotal;
    const totalAmount = Math.min(totals.finalTotal / 100, maxAllowed);
    
    setPaymentMethods(paymentMethods.map((payment, i) => 
      i === index ? { ...payment, amount: totalAmount } : payment
    ));
    
    // Atualizar o input com valor formatado
    setPaymentInputs(prev => ({
      ...prev,
      [index]: totalAmount > 0 ? formatCurrencyInput(totalAmount) : ''
    }));
  };

  // Função para preencher com metade do valor
  const fillWithHalf = (index: number) => {
    // Calcular total atual dos outros pagamentos (exceto o que está sendo editado)
    const otherPaymentsTotal = paymentMethods.reduce((sum, payment, i) => 
      i === index ? sum : sum + payment.amount, 0
    );
    
    // Limitar ao máximo permitido
    const maxAllowed = (totals.finalTotal / 100) - otherPaymentsTotal;
    const halfAmount = Math.min((totals.finalTotal / 100) / 2, maxAllowed);
    
    setPaymentMethods(paymentMethods.map((payment, i) => 
      i === index ? { ...payment, amount: halfAmount } : payment
    ));
    
    // Atualizar o input com valor formatado
    setPaymentInputs(prev => ({
      ...prev,
      [index]: halfAmount > 0 ? formatCurrencyInput(halfAmount) : ''
    }));
  };

  // Finalizar venda
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao carrinho",
        variant: "destructive"
      });
      return;
    }

    // Validar se cliente foi selecionado
    if (!selectedClient || selectedClient === 'none') {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente para finalizar a venda",
        variant: "destructive"
      });
      return;
    }

    // Validar se colaborador foi selecionado
    if (!selectedUser) {
      toast({
        title: "Colaborador obrigatório",
        description: "Selecione um colaborador para finalizar a venda",
        variant: "destructive"
      });
      return;
    }

    // Verificar se cliente está na blacklist do atacado
    if (selectedClient) {
      try {
        const isBlocked = await checkClientBlacklist(selectedClient);
        if (isBlocked) {
          const client = clients.find(c => c.id === selectedClient);
          const clientName = client?.name || 'Cliente';
          
          toast({
            title: "Cliente bloqueado",
            description: `${clientName} está na blacklist do atacado e não pode realizar compras.`,
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

    // Quantidade mínima removida - liberdade total para vender qualquer quantidade

    // Validação de pagamento
    if (!isPendingPayment) {
      const totalPayments = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
      const saleTotal = totals.finalTotal / 100;
      
      if (paymentMethods.length === 0) {
        toast({
          title: "Método de pagamento obrigatório",
          description: "Adicione pelo menos um método de pagamento ou marque como pendente",
          variant: "destructive"
        });
        return;
      }
      
      // Se não permite pagamento parcial, deve ser exato
      if (!allowPartialPayment && Math.abs(totalPayments - saleTotal) > 0.01) {
        toast({
          title: "Valor de pagamento incorreto",
          description: `Total: R$ ${saleTotal.toFixed(2).replace('.', ',')} | Pagamentos: R$ ${totalPayments.toFixed(2).replace('.', ',')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Se permite pagamento parcial, não pode exceder o total
      if (allowPartialPayment && totalPayments > saleTotal + 0.01) {
        toast({
          title: "Pagamento excede o total",
          description: `Total: R$ ${saleTotal.toFixed(2).replace('.', ',')} | Pagamentos: R$ ${totalPayments.toFixed(2).replace('.', ',')}`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Determinar status da venda baseado no pagamento
      const totalPaid = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
      const totalAmount = totals.finalTotal / 100; // Converter de centavos para reais
      
      console.log('🔍 [AtacadoNewSaleDialog] Debug de pagamento:', {
        totalPaid,
        totalAmount,
        paymentMethods,
        isPendingPayment,
        allowPartialPayment,
        totals: totals.finalTotal
      });
      
      let saleStatus: 'RASCUNHO' | 'FECHADA';
      if (isPendingPayment || totalPaid < totalAmount) {
        saleStatus = 'RASCUNHO'; // Pagamento pendente ou parcial
        console.log('🔍 [AtacadoNewSaleDialog] Status definido como RASCUNHO');
      } else {
        saleStatus = 'FECHADA'; // Pagamento completo
        console.log('🔍 [AtacadoNewSaleDialog] Status definido como FECHADA');
      }

      // Criar venda
      const saleData = {
        client_id: selectedClient,
        user_id: selectedUser,
        channel: 'ATACADO' as const,
        status: saleStatus,
        total_cents: Math.round(totals.finalTotal),
        discount_total_cents: Math.round(totals.batchDiscount),
        closed_at: saleStatus === 'FECHADA' ? new Date().toISOString() : null,
        payment_summary: null
      };

      const sale = await createAtacadoSale(saleData);

      // Adicionar itens à venda e atualizar estoque
      for (const item of cart) {
        const batchDiscount = calculateItemBatchDiscount(item);
        
        await addItemToSale({
          saleId: sale.id,
          itemData: {
            product_id: item.product.id,
            qty: item.quantity,
            unit_price_cents: Math.round(item.unitPrice),
            discount_percent: item.discountPercent
          }
        });

        // Atualizar estoque do produto
        await universalDataAdapter.updateProduct(item.product.id, {
          stock: Math.max(0, (item.product.stock || 0) - item.quantity)
        });
      }

      // Criar pagamentos ANTES de invalidar o cache
      if (!isPendingPayment && paymentMethods.length > 0) {
        console.log('🔄 [AtacadoNewSaleDialog] Criando pagamentos:', paymentMethods);
        
        for (const payment of paymentMethods) {
          const paymentData: any = {
            sale_id: sale.id,
            method: normalizePaymentMethod(payment.method),
            amount_cents: Math.round(payment.amount * 100),
            created_at: new Date().toISOString(),
            paid_at: new Date().toISOString() // Adicionar paid_at para pagamentos imediatos
          };
          
          // Adicionar número de parcelas se for crédito
          if (payment.method === 'CREDITO' && payment.installments) {
            paymentData.installments = payment.installments;
          }
          
          const paymentResult = await universalDataAdapter.createPayment(paymentData);
          
          console.log('✅ [AtacadoNewSaleDialog] Pagamento criado:', paymentResult);
        }
        
        // Aguardar um pouco para garantir que os pagamentos foram salvos
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Limpar formulário
      setCart([]);
      setSelectedClient('none');
      setSearchTerm('');
      setBatchDiscountPercent(0);
      setBatchDiscountInput('');
      setPaymentMethods([]);
      setPaymentInputs({});
      setPaymentInstallments({});
      setIsPendingPayment(false);
      setAllowPartialPayment(false);
      
      onOpenChange(false);
      
      toast({
        title: "Sucesso",
        description: "Venda de atacado finalizada com sucesso!"
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar venda de atacado",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Nova Venda de Atacado
          </DialogTitle>
          <DialogDescription>
            Crie uma nova venda de atacado com desconto por quantidade e análise de lucro
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seleção de Produtos */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Selecionar Produtos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cliente */}
                <div className="space-y-2 relative z-0">
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient} disabled={clients.length === 0}>
                    <SelectTrigger id="client" className={`w-full ${isSelectedClientBlocked ? "border-red-500 bg-red-50" : ""}`}>
                      <SelectValue placeholder={clients.length === 0 ? "Nenhum cliente disponível" : "Selecionar cliente"} />
                    </SelectTrigger>
                    <SelectContent className="z-[110]" position="popper">
                      {clients.length === 0 ? (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          Não existem clientes aptos para venda de atacado
                        </div>
                      ) : (
                        clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Aviso quando não há clientes */}
                  {clients.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <div className="text-sm text-yellow-800">
                        <strong>Atenção:</strong> Não existem clientes cadastrados com o tipo "ATACADO" no sistema.
                      </div>
                    </div>
                  )}
                  
                  {/* Aviso de cliente bloqueado */}
                  {isSelectedClientBlocked && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div className="text-sm text-red-800">
                        <strong>Cliente bloqueado:</strong> Este cliente está na blacklist do atacado e não pode realizar compras.
                      </div>
                    </div>
                  )}
                </div>

                {/* Colaborador */}
                <div className="space-y-2 relative z-0">
                  <Label htmlFor="user">Colaborador</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="user" className="w-full">
                      <SelectValue placeholder="Selecionar colaborador" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]" position="popper">
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Busca */}
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar Produtos</Label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
                    <Input
                      id="search"
                      placeholder="Nome ou código do produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '2.75rem' }}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Lista de Produtos */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredProducts.length === 0 && searchTerm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum produto encontrado</p>
                      <p className="text-sm">Tente buscar por nome ou código</p>
                    </div>
                  ) : filteredProducts.length === 0 && !searchTerm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum produto cadastrado</p>
                      <p className="text-sm">Cadastre produtos primeiro</p>
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            CÓDIGO: {product.short_code} • Estoque: {product.stock || 0}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(product.price_cents || 0)}
                            </span>
                            {product.cost_price_cents && (
                              <span className="text-xs text-muted-foreground">
                                Custo: {formatCurrency(product.cost_price_cents)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToCart(product)}
                          className="gradient-gold text-white hover:opacity-90"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carrinho e Totais */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Carrinho de Atacado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Configurações de Atacado */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Campo de quantidade mínima removido - liberdade total */}
                  <div className="space-y-2">
                    <Label htmlFor="batchDiscount">Desc. Lote (%)</Label>
                    <Input
                      id="batchDiscount"
                      type="number"
                      value={batchDiscountInput}
                      onChange={(e) => handleBatchDiscountChange(e.target.value)}
                      onBlur={handleBatchDiscountBlur}
                      onFocus={handleBatchDiscountFocus}
                      min="0"
                      max="100"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Itens do Carrinho */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Carrinho vazio</p>
                      <p className="text-sm">Adicione produtos para começar</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              CÓDIGO: {item.product.short_code} • Estoque: {item.product.stock || 0}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateQuantity(item.product.id, 0)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Quantidade</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="h-8 w-8 p-0"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.product.id, Number(e.target.value))}
                                className="h-8 w-16 text-center"
                                min="1"
                                max={item.product.stock || 0}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                                disabled={item.quantity >= (item.product.stock || 0)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Desconto (%)</Label>
                            <Input
                              type="number"
                              value={item.discountInput}
                              onChange={(e) => handleProductDiscountChange(item.product.id, e.target.value)}
                              onBlur={() => handleProductDiscountBlur(item.product.id)}
                              onFocus={() => handleProductDiscountFocus(item.product.id)}
                              className="h-8"
                              placeholder="0"
                              min="0"
                              max="100"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-semibold">
                              +{formatCurrency(item.profitPerUnit * item.quantity)} lucro
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Totais */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Desconto Lote ({batchDiscountPercent}%):</span>
                    <span className="text-red-600">-{formatCurrency(totals.batchDiscount)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(totals.finalTotal)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Lucro Total:</span>
                    <span className="font-semibold">{formatCurrency(totals.totalProfit)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total de Itens:</span>
                    <span>{totals.totalItems}</span>
                  </div>
                </div>

                {/* Pagamentos */}
                <Card className="shadow-card">
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
                          <div key={index} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {PAYMENT_LABEL[normalizePaymentMethod(payment.method)]}
                              </Badge>
                              <Input
                                type="text"
                                value={paymentInputs[index] || ''}
                                onChange={(e) => updatePaymentAmount(index, e.target.value)}
                                onBlur={() => handlePaymentBlur(index)}
                                placeholder="Digite o valor em reais (ex: 200)"
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
                            
                            {/* Seletor de parcelas para crédito */}
                            {payment.method === 'CREDITO' && (
                              <div className="flex items-center gap-2 ml-2">
                                <Label className="text-xs text-muted-foreground">Parcelas:</Label>
                                <Select
                                  value={paymentInstallments[index]?.toString() || '1'}
                                  onValueChange={(value) => updatePaymentInstallments(index, parseInt(value))}
                                >
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[110]" position="popper">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                                      <SelectItem key={num} value={num.toString()}>
                                        {num}x
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground">
                                  Valor da parcela: {formatCurrency((payment.amount / (paymentInstallments[index] || 1)) * 100)}
                                </span>
                              </div>
                            )}
                            
                            {/* Botões de preenchimento rápido */}
                            <div className="flex gap-2 ml-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fillWithTotal(index)}
                                className="text-xs h-7"
                              >
                                Total ({formatCurrency(totals.finalTotal)})
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fillWithHalf(index)}
                                className="text-xs h-7"
                              >
                                Metade ({formatCurrency(totals.finalTotal / 2)})
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Indicação do valor restante disponível */}
                        {(() => {
                          const currentTotal = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
                          const remainingAmount = (totals.finalTotal / 100) - currentTotal;
                          return remainingAmount > 0 ? (
                            <div className="p-2 bg-green-50 border border-green-200 rounded-lg mb-3">
                              <div className="text-sm text-green-700">
                                💰 Valor restante disponível: <span className="font-semibold">{formatCurrency(remainingAmount * 100)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 bg-red-50 border border-red-200 rounded-lg mb-3">
                              <div className="text-sm text-red-700">
                                ✅ Valor total coberto pelos pagamentos
                              </div>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addPaymentMethod("DINHEIRO")}
                            disabled={paymentMethods.reduce((sum, payment) => sum + payment.amount, 0) >= (totals.finalTotal / 100)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Dinheiro
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addPaymentMethod("PIX")}
                            disabled={paymentMethods.reduce((sum, payment) => sum + payment.amount, 0) >= (totals.finalTotal / 100)}
                          >
                            <Smartphone className="h-4 w-4 mr-1" />
                            PIX
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addPaymentMethod("DEBITO")}
                            disabled={paymentMethods.reduce((sum, payment) => sum + payment.amount, 0) >= (totals.finalTotal / 100)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Débito
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addPaymentMethod("CREDITO")}
                            disabled={paymentMethods.reduce((sum, payment) => sum + payment.amount, 0) >= (totals.finalTotal / 100)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Crédito
                          </Button>
                        </div>
                      </>
                    )}

                    <div className="pt-4">
                      {!isPendingPayment && (
                        <div className="space-y-2 mb-2">
                          <div className="text-sm text-muted-foreground">
                            Total pagamentos: {formatCurrency(paymentMethods.reduce((sum, p) => sum + p.amount, 0) * 100)}
                          </div>
                          {allowPartialPayment && paymentMethods.length > 0 && (
                            <div className="text-sm text-blue-600">
                              Restante: {formatCurrency((totals.finalTotal) - (paymentMethods.reduce((sum, p) => sum + p.amount, 0) * 100))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Validação de quantidade mínima removida - liberdade total */}

                {/* Botões */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleFinalizeSale}
                    disabled={cart.length === 0 || isCreating || isAddingItem || isFinalizing || isSelectedClientBlocked}
                    className="flex-1 gradient-gold text-white hover:opacity-90"
                  >
                    {isCreating || isAddingItem || isFinalizing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando...
                      </>
                    ) : isSelectedClientBlocked ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Cliente Bloqueado
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Finalizar Venda
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
