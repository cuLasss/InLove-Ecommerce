import { useState, useEffect } from "react"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { ResponsiveGrid } from "@/components/ui/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, ShoppingCart, CheckCircle, Eye, RefreshCw, Trash2, Trash, Clock, AlertCircle, CreditCard, RotateCcw, FileText } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useSalesOptimized as useSales } from "@/hooks/useSalesOptimized"
import { SaleDetailsDrawer } from "@/components/retail/SaleDetailsDrawer"
import { AddPaymentModal } from "@/components/retail/AddPaymentModal"
import { VarejoDevolucaoModal } from "@/components/retail/VarejoDevolucaoModal"
import { VarejoNfeSelectionModal } from "@/components/retail/VarejoNfeSelectionModal"
import { VarejoNfeGenerationModal } from "@/components/retail/VarejoNfeGenerationModal"
import { universalDataAdapter } from "@/lib/universal-data-adapter"
import { useToast } from "@/hooks/use-toast"
import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function Varejo() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Varejo')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("dashboard")
  const [selectedSales, setSelectedSales] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null)
  const [hasDraftSale, setHasDraftSale] = useState(false)
  const [devolucaoModalOpen, setDevolucaoModalOpen] = useState(false)
  const [nfeSelectionModalOpen, setNfeSelectionModalOpen] = useState(false)
  const [nfeGenerationModalOpen, setNfeGenerationModalOpen] = useState(false)
  const [selectedSaleForNfe, setSelectedSaleForNfe] = useState<any>(null)
  
  const { toast } = useToast()
  
  // Verificar parâmetros da URL para definir aba ativa e abrir venda
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const saleIdParam = searchParams.get('saleId')
    
    if (tabParam === 'report') {
      setActiveTab('report')
    }
    
    if (saleIdParam) {
      setSelectedSaleId(saleIdParam)
      setDetailsOpen(true)
    }
  }, [searchParams])

  // Verificar se há uma venda em rascunho salva
  useEffect(() => {
    const checkDraftSale = () => {
      try {
        const savedCart = localStorage.getItem('retail-sale-cart')
        if (savedCart) {
          const cartData = JSON.parse(savedCart)
          const hasItems = cartData.state?.items?.length > 0
          const hasValidData = hasItems && cartData.state?.items?.some((item: any) => item.qty > 0)
          
          setHasDraftSale(hasValidData)
          
          if (hasValidData) {
            console.log('🛒 [Varejo] Venda em rascunho encontrada:', {
              items: cartData.state.items.length,
              client: cartData.state.client?.name || 'Nenhum',
              employee: cartData.state.employee_id || 'Nenhum',
              current_step: cartData.state.currentStep || 1
            })
          } else {
            console.log('🛒 [Varejo] Carrinho vazio ou inválido - ocultando botão continuar')
          }
        } else {
          setHasDraftSale(false)
          console.log('🛒 [Varejo] Nenhum carrinho salvo encontrado')
        }
      } catch (error) {
        console.error('Erro ao verificar venda em rascunho:', error)
        setHasDraftSale(false)
      }
    }

    checkDraftSale()
    
    // Verificar novamente quando a página ganha foco (volta de outra aba)
    const handleFocus = () => checkDraftSale()
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
  
  // Use real sales data
  const {
    sales,
    isLoading,
    refreshSales
  } = useSales()

  // Escutar evento de venda finalizada para atualizar automaticamente
  useEffect(() => {
    const handleSaleCompleted = async (event: CustomEvent) => {
      console.log('🔄 [Varejo] Nova venda detectada, atualizando lista...', event.detail);
      await refreshSales();
      console.log('✅ [Varejo] Lista atualizada com sucesso');
    };

    window.addEventListener('saleCompleted', handleSaleCompleted as EventListener);
    
    return () => {
      window.removeEventListener('saleCompleted', handleSaleCompleted as EventListener);
    };
  }, [refreshSales])

  // Calcular estatísticas das vendas
  const today = new Date().toDateString()
  const todaySales = sales.filter(sale => 
    new Date(sale.created_at).toDateString() === today && 
    sale.channel === 'VAREJO' && 
    sale.status === 'FECHADA'
  )
  
  const todayAmount = todaySales.reduce((sum, sale) => {
    // ✅ SEMPRE calcular a partir dos itens (não confiar no total_cents salvo)
    const itemsTotal = sale.items?.reduce((itemSum, item) => {
      const itemTotal = item.unit_price_cents * item.qty
      const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100))
      return itemSum + (itemTotal - discountAmount)
    }, 0) || 0
    return sum + itemsTotal
  }, 0)

  const thisWeekStart = new Date()
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)
  
  const thisWeekSales = sales.filter(sale => 
    new Date(sale.created_at) >= thisWeekStart && 
    sale.channel === 'VAREJO' && 
    sale.status === 'FECHADA'
  )

  const recentSales = sales
    .filter(sale => sale.channel === 'VAREJO' && sale.status === 'FECHADA')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  // Calcular vendas pendentes (com pagamento parcial ou sem pagamento)
  const pendingSales = sales
    .filter(sale => {
      if (sale.channel !== 'VAREJO' || sale.status !== 'FECHADA') return false;
      
      // ✅ Calcular total SEMPRE a partir dos itens
      const totalAmount = sale.items?.reduce((sum, item) => {
        const itemTotal = item.unit_price_cents * item.qty;
        const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
        return sum + (itemTotal - discountAmount);
      }, 0) || 0;
      
      // Calcular valor pago
      const paidAmount = sale.payments?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;
      
      // É pendente se não foi totalmente pago
      return paidAmount < totalAmount;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return "recentemente"
    }
  }

  const getPendingAmount = (sale: any) => {
    // ✅ SEMPRE calcular o total a partir dos itens (não confiar no total_cents salvo)
    const totalAmount = sale.items?.reduce((sum: number, item: any) => {
      const itemTotal = item.unit_price_cents * item.qty;
      const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
      return sum + (itemTotal - discountAmount);
    }, 0) || 0;
    
    const paidAmount = sale.payments?.reduce((sum: number, p: any) => sum + p.amount_cents, 0) || 0;
    return Math.max(0, totalAmount - paidAmount);
  }

  const getPaidAmount = (sale: any) => {
    return sale.payments?.reduce((sum: number, p: any) => sum + p.amount_cents, 0) || 0;
  }

  // ✅ NOVA FUNÇÃO: Calcular total real da venda a partir dos itens
  const getRealTotalAmount = (sale: any) => {
    return sale.items?.reduce((sum: number, item: any) => {
      const itemTotal = item.unit_price_cents * item.qty;
      const discountAmount = Math.round(itemTotal * ((item.discount_percent || 0) / 100));
      return sum + (itemTotal - discountAmount);
    }, 0) || 0;
  }

  // Função para gerar nome memorizável da venda
  const getMemorableSaleName = (sale: any) => {
    const clientName = sale.client?.name || 'Consumidor final'
    const vendedorName = sale.user?.name || 'Sistema'
    const totalValue = sale.total_cents / 100
    const itemsCount = sale.items?.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) || 0
    const shortId = sale.id.slice(-4) // Últimos 4 caracteres do ID
    
    // Criar nome baseado no cliente e valor
    const clientInitials = clientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    const valueFormatted = totalValue.toFixed(0)
    
    return `${clientInitials}-${valueFormatted}${itemsCount > 1 ? `-${itemsCount}itens` : ''}-${shortId}`
  }

  const handleCloseDetails = () => {
    setDetailsOpen(false)
    setSelectedSaleId(null)
    
    // Limpar parâmetro da URL se veio de lá
    if (searchParams.get('saleId')) {
      navigate('/varejo', { replace: true })
    }
  }

  const handleContinueSale = () => {
    try {
      const savedCart = localStorage.getItem('retail-sale-cart')
      if (savedCart) {
        const cartData = JSON.parse(savedCart)
        const currentStep = cartData.state?.currentStep || 1
        
        console.log('🛒 [Varejo] Continuando venda na etapa:', currentStep)
        
        // Navegar para a etapa correta
        if (currentStep === 3) {
          // Se estava na etapa de pagamento, ir direto para lá
          navigate('/varejo/novo', { state: { step: 3 } })
        } else if (currentStep === 2) {
          // Se estava na etapa de cliente, ir para lá
          navigate('/varejo/novo', { state: { step: 2 } })
        } else {
          // Se estava na etapa de produtos, ir para lá
          navigate('/varejo/novo', { state: { step: 1 } })
        }
      } else {
        navigate('/varejo/novo')
      }
    } catch (error) {
      console.error('Erro ao continuar venda:', error)
      navigate('/varejo/novo')
    }
  }


  const handleSaleDeleted = () => {
    refreshSales()
  }

  const handleOpenPaymentModal = (sale: any) => {
    setSelectedSaleForPayment(sale)
    setPaymentModalOpen(true)
  }

  const handlePaymentAdded = () => {
    refreshSales()
    setPaymentModalOpen(false)
    setSelectedSaleForPayment(null)
  }

  const handleSelectSaleForNfe = (sale: any) => {
    setSelectedSaleForNfe(sale)
    setNfeSelectionModalOpen(false)
    setNfeGenerationModalOpen(true)
  }

  const handleCloseNfeGeneration = () => {
    setNfeGenerationModalOpen(false)
    setSelectedSaleForNfe(null)
  }

  // Funções para exclusão
  const handleSelectSale = (saleId: string, checked: boolean) => {
    if (checked) {
      setSelectedSales(prev => [...prev, saleId])
    } else {
      setSelectedSales(prev => prev.filter(id => id !== saleId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSales(recentSales.map(sale => sale.id))
    } else {
      setSelectedSales([])
    }
  }

  const handleDeleteSale = async (saleId: string) => {
    try {
      setIsDeleting(true)
      const response = await universalDataAdapter.deleteSale(saleId)
      if (response.error) {
        throw new Error(response.error.message)
      }
      
      toast({
        title: "✅ Venda excluída",
        description: "A venda foi excluída com sucesso",
      })
      
      await refreshSales()
    } catch (error: any) {
      toast({
        title: "❌ Erro ao excluir venda",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedSales.length === 0) return
    
    try {
      setIsDeleting(true)
      const response = await universalDataAdapter.deleteSales(selectedSales)
      if (response.error) {
        throw new Error(response.error.message)
      }
      const result = response.data
      
      toast({
        title: "✅ Exclusão concluída",
        description: `${result.deleted} vendas excluídas${result.failed > 0 ? `, ${result.failed} falharam` : ''}`,
      })
      
      setSelectedSales([])
      await refreshSales()
    } catch (error: any) {
      toast({
        title: "❌ Erro na exclusão em massa",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <PageShell>
        <style>{`
          .varejo-header-actions {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem;
            width: 100% !important;
            min-width: 0;
            overflow: visible;
            box-sizing: border-box;
          }
          
          .varejo-header-actions button {
            width: 100% !important;
            min-width: 0;
            flex-shrink: 0;
            box-sizing: border-box;
            white-space: nowrap;
          }
          
          /* Manter em coluna até 813px para evitar cortes */
          @media (min-width: 768px) and (max-width: 813px) {
            .varejo-header-actions {
              flex-direction: column !important;
              width: 100% !important;
            }
            
            .varejo-header-actions button {
              width: 100% !important;
            }
          }
          
          /* A partir de 814px, permitir layout em linha com quebra quando necessário */
          @media (min-width: 814px) and (max-width: 922px) {
            .varejo-header-actions {
              flex-direction: row !important;
              flex-wrap: wrap !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            
            .varejo-header-actions button {
              width: auto !important;
              flex: 0 1 auto !important;
              min-width: min-content;
              max-width: fit-content;
            }
          }
          
          /* A partir de tablet (923px), layout em linha sem quebra */
          @media (min-width: 923px) {
            .varejo-header-actions {
              flex-direction: row !important;
              flex-wrap: nowrap !important;
              width: auto !important;
            }
            
            .varejo-header-actions button {
              width: auto !important;
              flex: 0 0 auto !important;
            }
          }
        `}</style>
        <PageHeader 
          title="Vendas Varejo"
          description="Gerencie vendas diretas ao consumidor com redundância de dados"
          actions={
            <div className="varejo-header-actions">
              {hasDraftSale && (
                <Button 
                  variant="outline"
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 text-xs sm:text-sm"
                  onClick={handleContinueSale}
                >
                  <ShoppingCart className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Continuar Venda</span>
                </Button>
              )}
              <Button 
                className="bg-primary hover:bg-primary-hover text-xs sm:text-sm whitespace-nowrap"
                onClick={() => {
                  // Limpar carrinho antes de iniciar nova venda
                  try {
                    // Em vez de remover completamente, vamos limpar o conteúdo
                    const emptyCart = {
                      state: {
                        client: null,
                        employee_id: null,
                        items: [],
                        payments: [],
                        currentStep: 1
                      },
                      version: 0
                    }
                    localStorage.setItem('retail-sale-cart', JSON.stringify(emptyCart))
                    console.log('🛒 [Varejo] Carrinho limpo para nova venda')
                  } catch (error) {
                    console.error('Erro ao limpar carrinho:', error)
                  }
                  navigate("/varejo/novo")
                }}
              >
                <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                Nova Venda
              </Button>
              <Button 
                onClick={() => setNfeSelectionModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap"
              >
                <FileText className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden desktop:inline">Gerar Nota Fiscal</span>
                <span className="desktop:hidden">NF-e</span>
              </Button>
              <Button 
                onClick={() => setDevolucaoModalOpen(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap"
              >
                <RotateCcw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                Devolução
              </Button>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-hidden">
            <TabsList className="grid w-full grid-cols-3 !h-auto min-h-[2.75rem] sm:min-h-[2.5rem] gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-md bg-muted/50">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
              >
                <span className="truncate">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="pending" 
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
              >
                <span className="truncate">Pendentes</span>
              </TabsTrigger>
              <TabsTrigger 
                value="recent" 
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
              >
                <span className="truncate">Recentes</span>
              </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            {/* Status Cards */}
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }}>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {(todayAmount / 100).toFixed(2).replace('.', ',')}</div>
              <p className="text-xs text-muted-foreground">{todaySales.length} vendas realizadas</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisWeekSales.length}</div>
              <p className="text-xs text-muted-foreground">Esta semana</p>
            </CardContent>
          </Card>
        </ResponsiveGrid>

        {/* Vendas Recentes */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Vendas Recentes</CardTitle>
            <div className="flex items-center gap-2">
              {selectedSales.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Excluir ({selectedSales.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir {selectedSales.length} venda{selectedSales.length > 1 ? 's' : ''}? 
                        Esta ação não pode ser desfeita e removerá permanentemente todas as vendas selecionadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteSelected}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir {selectedSales.length} venda{selectedSales.length > 1 ? 's' : ''}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshSales()}
                disabled={isLoading}
                data-refresh-button="varejo"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <style>{`
              .recent-sales-container {
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: auto !important;
                overflow-y: visible !important;
                -webkit-overflow-scrolling: touch !important;
                scrollbar-width: thin !important;
                scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 1.5rem !important;
              }
              
              .recent-sales-container::-webkit-scrollbar {
                height: 8px;
              }
              
              .recent-sales-container::-webkit-scrollbar-track {
                background: hsl(var(--muted) / 0.1);
                border-radius: 4px;
              }
              
              .recent-sales-container::-webkit-scrollbar-thumb {
                background: hsl(var(--muted-foreground) / 0.3);
                border-radius: 4px;
              }
              
              .recent-sales-container::-webkit-scrollbar-thumb:hover {
                background: hsl(var(--muted-foreground) / 0.5);
              }
              
              .recent-sales-item {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 0.75rem !important;
                padding: 0.75rem !important;
                border: none !important;
                border-radius: 0.5rem !important;
                min-width: min-content !important;
                width: 100% !important;
                outline: none !important;
                box-shadow: none !important;
              }
              
              .recent-sales-item:hover,
              .recent-sales-item:focus,
              .recent-sales-item:focus-within {
                outline: none !important;
                box-shadow: none !important;
                border: none !important;
              }
              
              .recent-sales-item-content {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 1rem !important;
                flex: 1 1 auto !important;
                min-width: 0 !important;
              }
              
              .recent-sales-item-info {
                display: flex !important;
                flex-direction: column !important;
                gap: 0.25rem !important;
                flex: 1 1 auto !important;
                min-width: 0 !important;
              }
              
              .recent-sales-item-header {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 0.75rem !important;
                flex-wrap: nowrap !important;
              }
              
              .recent-sales-item-name {
                font-weight: 500 !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
              }
              
              .recent-sales-item-client {
                font-size: 0.875rem !important;
                color: hsl(var(--muted-foreground)) !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
              }
              
              .recent-sales-item-details {
                font-size: 0.875rem !important;
                color: hsl(var(--muted-foreground)) !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 0.25rem !important;
              }
              
              .recent-sales-item-details > div {
                white-space: nowrap !important;
              }
              
              .recent-sales-item-actions {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 0.75rem !important;
                flex-shrink: 0 !important;
              }
              
              .recent-sales-item-price {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-end !important;
                gap: 0.25rem !important;
                flex-shrink: 0 !important;
              }
              
              .recent-sales-item-buttons {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 0.25rem !important;
                flex-shrink: 0 !important;
              }
              
              /* A partir de 897px - layout horizontal com scroll */
              @media (max-width: 897px) {
                .recent-sales-item {
                  min-width: 800px !important;
                }
                
                .recent-sales-item-content {
                  min-width: min-content !important;
                }
              }
              
              /* Abaixo de 897px - layout mais compacto */
              @media (max-width: 640px) {
                .recent-sales-item {
                  min-width: 700px !important;
                  gap: 0.5rem !important;
                  padding: 0.5rem !important;
                }
                
                .recent-sales-item-content {
                  gap: 0.75rem !important;
                }
                
                .recent-sales-item-name {
                  font-size: 0.875rem !important;
                }
                
                    .recent-sales-item-details {
                      font-size: 0.8rem !important;
                    }
              }
            `}</style>
            {isLoading ? (
              <div className="text-center py-8">Carregando vendas...</div>
            ) : recentSales.length > 0 ? (
              <div className="space-y-4">
                {/* Cabeçalho com checkbox para selecionar todas */}
                <div className="flex items-center gap-3 p-3 border-b">
                  <Checkbox
                    checked={selectedSales.length === recentSales.length && recentSales.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={isDeleting}
                  />
                  <span className="text-sm text-muted-foreground">
                    Selecionar todas ({recentSales.length})
                  </span>
                </div>

                <div className="recent-sales-container">
                {recentSales.map((sale) => {
                  // ✅ SEMPRE calcular o total real a partir dos itens
                  const totalAmount = getRealTotalAmount(sale);

                  // Obter método de pagamento
                  const paymentMethod = sale.payments && sale.payments.length > 0 
                    ? sale.payments[0].method 
                    : 'Não informado'
                  
                  return (
                      <div key={sale.id} className="recent-sales-item">
                      <Checkbox
                        checked={selectedSales.includes(sale.id)}
                        onCheckedChange={(checked) => handleSelectSale(sale.id, checked as boolean)}
                        disabled={isDeleting}
                          className="flex-shrink-0"
                      />
                      
                        <div className="recent-sales-item-content">
                          <div className="recent-sales-item-info">
                            <div className="recent-sales-item-header">
                              <span className="recent-sales-item-name">{getMemorableSaleName(sale)}</span>
                        </div>
                            <div className="recent-sales-item-details">
                              <div>Cliente: {sale.client?.name || "Cliente não informado"}</div>
                              <div>Criado: {formatTime(sale.created_at)}</div>
                              <div>Pagamento: {paymentMethod}</div>
                        </div>
                      </div>
                      
                          <div className="recent-sales-item-actions">
                            <div className="recent-sales-item-price">
                              <div className="font-semibold text-primary whitespace-nowrap">
                            R$ {(totalAmount / 100).toFixed(2).replace('.', ',')}
                          </div>
                              <div className={`text-xs whitespace-nowrap ${
                            sale.status === 'FECHADA' ? 'text-green-600' : 
                            sale.status === 'CANCELADA' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {sale.status === 'FECHADA' ? 'Finalizada' : 
                             sale.status === 'CANCELADA' ? 'Cancelada' : 'Em andamento'}
                          </div>
                        </div>
                        
                            <div className="recent-sales-item-buttons">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSaleId(sale.id)
                              setDetailsOpen(true)
                            }}
                            disabled={isDeleting}
                                className="flex-shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={isDeleting}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e removerá permanentemente a venda do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir venda
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                            </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma venda encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Vendas Pendentes ({pendingSales.length})
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshSales}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <style>{`
                  .pending-sales-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: thin !important;
                    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 1.5rem !important;
                  }
                  
                  .pending-sales-container::-webkit-scrollbar {
                    height: 8px;
                  }
                  
                  .pending-sales-container::-webkit-scrollbar-track {
                    background: hsl(var(--muted) / 0.1);
                    border-radius: 4px;
                  }
                  
                  .pending-sales-container::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.3);
                    border-radius: 4px;
                  }
                  
                  .pending-sales-container::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--muted-foreground) / 0.5);
                  }
                  
                  .pending-sales-item {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 1rem !important;
                    padding: 1rem !important;
                    border: none !important;
                    border-radius: 0.5rem !important;
                    background: hsl(var(--orange-50)) !important;
                    min-width: min-content !important;
                    width: 100% !important;
                    outline: none !important;
                    box-shadow: none !important;
                  }
                  
                  .pending-sales-item:hover,
                  .pending-sales-item:focus,
                  .pending-sales-item:focus-within {
                    outline: none !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
              
              .pending-sales-item-content {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 1rem !important;
                flex: 1 1 auto !important;
                min-width: 0 !important;
              }
              
              .pending-sales-item-info {
                display: flex !important;
                flex-direction: column !important;
                gap: 0.5rem !important;
                flex: 1 1 auto !important;
                min-width: 0 !important;
              }
              
              .pending-sales-item-header {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 0.75rem !important;
                flex-wrap: nowrap !important;
              }
              
              .pending-sales-item-name {
                font-weight: 500 !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
              }
              
              .pending-sales-item-status {
                font-size: 0.875rem !important;
                color: hsl(var(--orange-600)) !important;
                font-weight: 500 !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
              }
              
              .pending-sales-item-details {
                font-size: 0.875rem !important;
                color: hsl(var(--muted-foreground)) !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 0.25rem !important;
              }
              
              .pending-sales-item-details > div {
                white-space: nowrap !important;
              }
              
              .pending-sales-item-actions {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 1rem !important;
                flex-shrink: 0 !important;
              }
              
              .pending-sales-item-price {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-end !important;
                gap: 0.25rem !important;
                flex-shrink: 0 !important;
              }
              
              .pending-sales-item-buttons {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 0.5rem !important;
                flex-shrink: 0 !important;
              }
              
              /* A partir de 897px - layout horizontal com scroll */
              @media (max-width: 897px) {
                .pending-sales-item {
                  min-width: 900px !important;
                }
                
                .pending-sales-item-content {
                  min-width: min-content !important;
                }
              }
              
              /* Abaixo de 897px - layout mais compacto */
              @media (max-width: 640px) {
                .pending-sales-item {
                  min-width: 800px !important;
                  gap: 0.75rem !important;
                  padding: 0.75rem !important;
                }
                
                .pending-sales-item-content {
                  gap: 0.75rem !important;
                }
                
                .pending-sales-item-name {
                  font-size: 0.875rem !important;
                }
                
                .pending-sales-item-status,
                .pending-sales-item-details {
                  font-size: 0.8rem !important;
                }
              }
            `}</style>
                {pendingSales.length > 0 ? (
                  <div className="pending-sales-container">
                    {pendingSales.map((sale) => {
                      const totalAmount = getRealTotalAmount(sale);
                      const paidAmount = getPaidAmount(sale);
                      const pendingAmount = Math.max(0, totalAmount - paidAmount);

                      return (
                        <div key={sale.id} className="pending-sales-item">
                          <div className="pending-sales-item-content">
                            <div className="pending-sales-item-info">
                              <div className="pending-sales-item-header">
                                <span className="pending-sales-item-name">{getMemorableSaleName(sale)}</span>
                                <span className="pending-sales-item-status">
                                {paidAmount > 0 ? 'Pagamento Parcial' : 'Não Pago'}
                                </span>
                              </div>
                              <div className="pending-sales-item-details">
                              <div>Cliente: {sale.client?.name || 'Consumidor final'}</div>
                              <div>Criado: {formatTime(sale.created_at)}</div>
                                <div>Vendedor: {sale.user?.name || 'Sistema'}</div>
                            </div>
                          </div>
                            
                            <div className="pending-sales-item-actions">
                              <div className="pending-sales-item-price">
                                <div className="font-semibold text-primary whitespace-nowrap">
                                Total: R$ {(totalAmount / 100).toFixed(2).replace('.', ',')}
                              </div>
                              {paidAmount > 0 && (
                                  <div className="text-sm text-green-600 whitespace-nowrap">
                                  Pago: R$ {(paidAmount / 100).toFixed(2).replace('.', ',')}
                                </div>
                              )}
                                <div className="text-sm text-orange-600 font-medium whitespace-nowrap">
                                Pendente: R$ {(pendingAmount / 100).toFixed(2).replace('.', ',')}
                              </div>
                            </div>
                              
                              <div className="pending-sales-item-buttons">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedSaleId(sale.id)
                                setDetailsOpen(true)
                              }}
                                  className="flex-shrink-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenPaymentModal(sale)}
                                  className="bg-green-600 hover:bg-green-700 text-white border-green-600 flex-shrink-0"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda pendente encontrada</p>
                    <p className="text-sm">Todas as vendas estão quitadas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Vendas Recentes</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedSales.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isDeleting}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Excluir Selecionadas ({selectedSales.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir {selectedSales.length} venda(s) selecionada(s)? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteSelected}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir {selectedSales.length} venda(s)
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshSales}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <style>{`
                  .recent-sales-tab-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: thin !important;
                    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 1.5rem !important;
                  }
                  
                  .recent-sales-tab-container::-webkit-scrollbar {
                    height: 8px;
                  }
                  
                  .recent-sales-tab-container::-webkit-scrollbar-track {
                    background: hsl(var(--muted) / 0.1);
                    border-radius: 4px;
                  }
                  
                  .recent-sales-tab-container::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.3);
                    border-radius: 4px;
                  }
                  
                  .recent-sales-tab-container::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--muted-foreground) / 0.5);
                  }
                  
                  .recent-sales-tab-item {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 0.75rem !important;
                    padding: 0.75rem !important;
                    border: none !important;
                    border-radius: 0.5rem !important;
                    min-width: min-content !important;
                    width: 100% !important;
                    outline: none !important;
                    box-shadow: none !important;
                  }
                  
                  .recent-sales-tab-item:hover,
                  .recent-sales-tab-item:focus,
                  .recent-sales-tab-item:focus-within {
                    outline: none !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  
                  .recent-sales-tab-item-content {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 1rem !important;
                    flex: 1 1 auto !important;
                    min-width: 0 !important;
                  }
                  
                  .recent-sales-tab-item-info {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 0.25rem !important;
                    flex: 1 1 auto !important;
                    min-width: 0 !important;
                  }
                  
                  .recent-sales-tab-item-header {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 0.75rem !important;
                    flex-wrap: nowrap !important;
                  }
                  
                  .recent-sales-tab-item-name {
                    font-weight: 500 !important;
                    white-space: nowrap !important;
                    flex-shrink: 0 !important;
                  }
                  
                  .recent-sales-tab-item-client {
                    font-size: 0.875rem !important;
                    color: hsl(var(--muted-foreground)) !important;
                    white-space: nowrap !important;
                    flex-shrink: 0 !important;
                  }
                  
                  .recent-sales-tab-item-details {
                    font-size: 0.875rem !important;
                    color: hsl(var(--muted-foreground)) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 0.25rem !important;
                  }
                  
                  .recent-sales-tab-item-details > div {
                    white-space: nowrap !important;
                  }
                  
                  .recent-sales-tab-item-actions {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 0.75rem !important;
                    flex-shrink: 0 !important;
                  }
                  
                  .recent-sales-tab-item-price {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: flex-end !important;
                    gap: 0.25rem !important;
                    flex-shrink: 0 !important;
                  }
                  
                  .recent-sales-tab-item-buttons {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 0.25rem !important;
                    flex-shrink: 0 !important;
                  }
                  
                  /* A partir de 897px - layout horizontal com scroll */
                  @media (max-width: 897px) {
                    .recent-sales-tab-item {
                      min-width: 800px !important;
                    }
                    
                    .recent-sales-tab-item-content {
                      min-width: min-content !important;
                    }
                  }
                  
                  /* Abaixo de 897px - layout mais compacto */
                  @media (max-width: 640px) {
                    .recent-sales-tab-item {
                      min-width: 700px !important;
                      gap: 0.5rem !important;
                      padding: 0.5rem !important;
                    }
                    
                    .recent-sales-tab-item-content {
                      gap: 0.75rem !important;
                    }
                    
                    .recent-sales-tab-item-name {
                      font-size: 0.875rem !important;
                    }
                    
                    .recent-sales-tab-item-details {
                      font-size: 0.8rem !important;
                    }
                  }
                `}</style>
                {recentSales.length > 0 ? (
                  <div className="recent-sales-tab-container">
                    {recentSales.map((sale) => {
                      const pendingAmount = getPendingAmount(sale);
                      const paidAmount = getPaidAmount(sale);
                      const isPending = pendingAmount > 0;

                      const totalAmount = getRealTotalAmount(sale);
                      const paymentMethod = sale.payments && sale.payments.length > 0 
                        ? sale.payments[0].method 
                        : 'Não informado';

                      return (
                        <div key={sale.id} className={`recent-sales-tab-item ${isPending ? 'bg-orange-50 border-orange-200' : ''}`}>
                          <Checkbox
                            checked={selectedSales.includes(sale.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSales(prev => [...prev, sale.id])
                              } else {
                                setSelectedSales(prev => prev.filter(id => id !== sale.id))
                              }
                            }}
                            disabled={isDeleting}
                            className="flex-shrink-0"
                          />
                          
                          <div className="recent-sales-tab-item-content">
                            <div className="recent-sales-tab-item-info">
                              <div className="recent-sales-tab-item-header">
                                <span className="recent-sales-tab-item-name">{getMemorableSaleName(sale)}</span>
                                <div className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                                sale.status === 'FECHADA' ? 
                                  (isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700') :
                                  sale.status === 'CANCELADA' ? 'text-red-600' : 'text-orange-600'
                              }`}>
                                {sale.status === 'FECHADA' ? 
                                  (isPending ? 'Pendente' : 'Finalizada') : 
                                  sale.status === 'CANCELADA' ? 'Cancelada' : 'Em andamento'}
                              </div>
                              {isPending && (
                                  <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap flex-shrink-0">
                                  {paidAmount > 0 ? 'Pagamento Parcial' : 'Não Pago'}
                                </div>
                              )}
                            </div>
                              <div className="recent-sales-tab-item-details">
                              <div>Cliente: {sale.client?.name || 'Consumidor final'}</div>
                              <div>Criado: {formatTime(sale.created_at)}</div>
                                <div>Vendedor: {sale.user?.name || 'Sistema'}</div>
                              {isPending && (
                                  <div>Pendente: R$ {(pendingAmount / 100).toFixed(2).replace('.', ',')}</div>
                              )}
                            </div>
                          </div>
                            
                            <div className="recent-sales-tab-item-actions">
                              <div className="recent-sales-tab-item-price">
                                <div className="font-semibold text-primary whitespace-nowrap">
                                  R$ {(totalAmount / 100).toFixed(2).replace('.', ',')}
                                </div>
                                {paidAmount > 0 && (
                                  <div className="text-sm text-green-600 whitespace-nowrap">
                                    Pago: R$ {(paidAmount / 100).toFixed(2).replace('.', ',')}
                                  </div>
                                )}
                        </div>
                        
                              <div className="recent-sales-tab-item-buttons">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSaleId(sale.id)
                              setDetailsOpen(true)
                            }}
                            disabled={isDeleting}
                                  className="flex-shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {isPending && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenPaymentModal(sale)}
                                    className="bg-green-600 hover:bg-green-700 text-white border-green-600 flex-shrink-0"
                              disabled={isDeleting}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={isDeleting}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e removerá permanentemente a venda do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir venda
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                              </div>
                            </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <SaleDetailsDrawer
          saleId={selectedSaleId}
          open={detailsOpen}
          onClose={handleCloseDetails}
          onDeleted={handleSaleDeleted}
        />

        <AddPaymentModal
          sale={selectedSaleForPayment}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onPaymentAdded={handlePaymentAdded}
        />

        <VarejoDevolucaoModal
          isOpen={devolucaoModalOpen}
          onClose={() => setDevolucaoModalOpen(false)}
        />

        <VarejoNfeSelectionModal
          isOpen={nfeSelectionModalOpen}
          onClose={() => setNfeSelectionModalOpen(false)}
          onSelectSale={handleSelectSaleForNfe}
          sales={sales as any}
        />

        <VarejoNfeGenerationModal
          isOpen={nfeGenerationModalOpen}
          onClose={handleCloseNfeGeneration}
          sale={selectedSaleForNfe}
        />
      </PageShell>
  )
}