import { useState, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useEffect } from "react"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { ResponsiveGrid } from "@/components/ui/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { NewDraftModal } from "@/components/consignado/NewDraftModal"
import { GerenciarRascunhoLocal } from "@/components/consignado/GerenciarRascunhoLocal"
import { GerenciarPagamento } from "@/components/consignado/GerenciarPagamento"
import { GerenciarDevolucoes } from "@/components/consignado/GerenciarDevolucoes"
import { BlacklistManagement } from "@/components/consignado/BlacklistManagement"
import { PaymentDetailsModal } from "@/components/consignado/PaymentDetailsModal"
import { useConsignacaoPayments } from "@/hooks/useConsignacaoPayments"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { consignacaoApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatDateSafe, formatConsignacaoDate } from "@/lib/date-utils"
import { 
  Plus, 
  Handshake, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Printer,
  Trash2,
  Eye,
  Package,
  Shield,
  DollarSign
} from "lucide-react"
import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function Consignado() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Consignado')
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isNewDraftModalOpen, setIsNewDraftModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string; codigo?: string }>({ open: false })
  const [activeFolhaInfo, setActiveFolhaInfo] = useState<{ id?: string; codigo?: string; cliente_name?: string; status?: string } | null>(null)
  const [paymentDetailsModal, setPaymentDetailsModal] = useState<{ 
    isOpen: boolean; 
    folhaCodigo?: string; 
    clienteName?: string; 
    registroFinanceiro?: any 
  }>({ isOpen: false })
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // ✅ CORREÇÃO: Chamar hook no nível superior do componente
  // Consignado sempre precisa dos dados de pagamentos
  const { financialRecords, refresh: refreshPayments } = useConsignacaoPayments(true)
  
  // Get tab from URL params, default to 'rascunhos'
  const activeTab = searchParams.get('tab') || 'rascunhos'
  const action = searchParams.get('action') // pode ser 'manage-rascunho', 'manage-payment', 'manage-devolution'
  const folhaCodigo = searchParams.get('folha')
  
  // Função para determinar qual componente gerenciador deve ser exibido
  const getActiveComponent = () => {
    if (action === 'manage-rascunho' && folhaCodigo && activeFolhaInfo) {
      return 'rascunho'
    }
    if (action === 'manage-payment' && folhaCodigo && activeFolhaInfo) {
      return 'payment'
    }
    if (action === 'manage-devolution' && folhaCodigo && activeFolhaInfo) {
      return 'devolution'
    }
    if (action === 'manage-blacklist') {
      return 'blacklist'
    }
    return 'list'
  }
  
  const activeComponent = getActiveComponent()

  // ✅ OTIMIZAÇÃO: Removido refetch forçado ao montar
  // As queries já usam cache e só fazem refetch quando necessário

  // Carregar activeFolhaInfo do cache quando necessário
  useEffect(() => {
    if (folhaCodigo && !activeFolhaInfo) {
      console.log('🔄 [Consignado] Tentando carregar folha do cache:', folhaCodigo)
      
      try {
        const cacheKey = `folha_info_${folhaCodigo}`
        const cachedFolhaInfo = localStorage.getItem(cacheKey)
        
        if (cachedFolhaInfo) {
          const parsedCache = JSON.parse(cachedFolhaInfo)
          const cacheAge = Date.now() - (parsedCache.timestamp || 0)
          const maxCacheAge = 10 * 60 * 1000 // 10 minutos
          
          if (cacheAge < maxCacheAge && parsedCache.data) {
            setActiveFolhaInfo(parsedCache.data)
            console.log('✅ [Consignado] Folha carregada do cache:', parsedCache.data)
          } else {
            console.log('⏰ [Consignado] Cache expirado para folha:', folhaCodigo)
          }
        }
      } catch (error) {
        console.error('❌ [Consignado] Erro ao carregar cache:', error)
      }
    }
  }, [folhaCodigo, activeFolhaInfo])

  // ✅ OTIMIZAÇÃO CRÍTICA: Uma única query base para todas as consignações
  // Isso evita múltiplas chamadas ao mesmo endpoint e usa cache compartilhado
  const { data: allConsignacoesRaw, isLoading: consignacoesLoading, refetch: refetchConsignacoes } = useQuery({
    queryKey: ['consignacao-all'],
    queryFn: async () => {
      return await consignacaoApi.getAll(undefined, 1, 1000) // Buscar todas sem filtro
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 30 * 60 * 1000
  })

  // ✅ ATUALIZAÇÃO: Refetch automático quando navegar para a aba aguardando ou finalizado
  // Isso garante que os dados estejam atualizados após mudança de status (ex: ao clicar em "ir para pagamento" ou "finalizar pagamento")
  useEffect(() => {
    if (activeTab === 'aguardando' || activeTab === 'finalizado') {
      // Fazer refetch para garantir que os dados estejam atualizados
      // Isso é especialmente útil quando o status foi alterado recentemente
      refetchConsignacoes()
      // ✅ CRÍTICO: Também refetch dos pagamentos para atualizar registros financeiros
      if (activeTab === 'finalizado') {
        refreshPayments()
      }
    }
  }, [activeTab, refetchConsignacoes, refreshPayments])

  // Extrair dados da query base
  const allConsignacoes = Array.isArray(allConsignacoesRaw) 
    ? allConsignacoesRaw 
    : ((allConsignacoesRaw as any)?.data || [])

  // ✅ OTIMIZAÇÃO: Filtrar em memória ao invés de fazer queries separadas
  const rascunhosData = useMemo(() => {
    const filtered = allConsignacoes.filter((c: any) => c.status === 'RASCUNHO')
    return {
      data: filtered.slice(0, 50),
      count: filtered.length
    }
  }, [allConsignacoes])

  const comClienteData = useMemo(() => {
    const filtered = allConsignacoes.filter((c: any) => c.status === 'ENTREGUE')
    return {
      data: filtered.slice(0, 50),
      count: filtered.length
    }
  }, [allConsignacoes])

  const aguardandoData = useMemo(() => {
    const filtered = allConsignacoes.filter((c: any) => c.status === 'EM_CONFERENCIA')
    return {
      data: filtered.slice(0, 50),
      count: filtered.length
    }
  }, [allConsignacoes])

  const finalizadoData = useMemo(() => {
    const filtered = allConsignacoes.filter((c: any) => c.status === 'FINALIZADO')
    return {
      data: filtered.slice(0, 50),
      count: filtered.length
    }
  }, [allConsignacoes])

  // Buscar contadores (calculado a partir dos dados já carregados)
  const counters = useMemo(() => {
    return {
      RASCUNHO: rascunhosData.count,
      ENTREGUE: comClienteData.count,
      EM_CONFERENCIA: aguardandoData.count,
      FINALIZADO: finalizadoData.count,
      CANCELADA: allConsignacoes.filter((c: any) => c.status === 'CANCELADA').length
    }
  }, [rascunhosData.count, comClienteData.count, aguardandoData.count, finalizadoData.count, allConsignacoes])

  const countersLoading = consignacoesLoading
  const rascunhosLoading = consignacoesLoading
  const aguardandoLoading = consignacoesLoading

  const deleteMutation = useMutation({
    mutationFn: consignacaoApi.delete,
    onSuccess: () => {
      // ✅ OTIMIZAÇÃO: Invalidar apenas a query base (as outras são derivadas)
      queryClient.invalidateQueries({ queryKey: ['consignacao-all'] })
      toast({
        title: "Sucesso",
        description: "Consignação excluída com sucesso."
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir lote",
        variant: "destructive"
      })
    }
  })

  const handleDelete = async (id: string) => {
    console.log('🔄 [Consignado.handleDelete] Iniciando exclusão da consignação:', id);
    setDeleteConfirm({ open: false });
    
    try {
      // Buscar informações da consignação antes de excluir para obter o código
      const consignacoes = await consignacaoApi.getAll()
      const consignacao = Array.isArray(consignacoes) 
        ? consignacoes.find(c => c.id === id)
        : consignacoes?.data?.find((c: any) => c.id === id)
      
      const codigo = consignacao?.codigo
      
      await deleteMutation.mutateAsync(id);
      
      // Se for uma consignação finalizada, também remover o registro financeiro
      if (codigo) {
        const financeKey = 'financeiro_registros'
        const registrosExistentes = JSON.parse(localStorage.getItem(financeKey) || '[]')
        const registrosAtualizados = registrosExistentes.filter((r: any) => r.folha_codigo !== codigo)
        localStorage.setItem(financeKey, JSON.stringify(registrosAtualizados))
        
        console.log('🗑️ [Consignado.handleDelete] Registro financeiro removido para:', codigo)
      }
      
      console.log('✅ [Consignado.handleDelete] Exclusão concluída com sucesso');
    } catch (error) {
      console.error('❌ [Consignado.handleDelete] Erro na exclusão:', error);
    }
  }

  // Função para gerenciar um item específico baseado no status
  const handleManageItem = (lote: any, actionType: string) => {
    // Tentar múltiplas formas de obter o nome do cliente
    const clienteName = lote.clients?.name || 
                       lote.cliente_name || 
                       lote.clients?.nome ||
                       lote.client_name ||
                       'Cliente não informado'
    
    const folhaInfo = {
      id: lote.id,
      codigo: lote.codigo,
      cliente_name: clienteName,
      status: lote.status
    }
    
    setActiveFolhaInfo(folhaInfo)
    
    // Salvar no localStorage para persistir entre navegações
    const cacheKey = `folha_info_${lote.codigo}`
    const cacheData = {
      data: folhaInfo,
      timestamp: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    
    console.log('💾 [Consignado.handleManageItem] Folha salva no cache:', {
      codigo: lote.codigo,
      cliente: clienteName,
      actionType: actionType
    })
    
    // Para rascunhos, usar a página FolhaConsignacaoPage que já tem o GerenciarFolha implementado
    if (actionType === 'manage-rascunho') {
      navigate(`/consignado/folha/${lote.codigo}`)
    } else {
      navigate(`/consignado?tab=${activeTab}&action=${actionType}&folha=${lote.codigo}`)
    }
  }

  // Função para visualizar detalhes do pagamento de uma folha finalizada
  const handleViewPayment = async (lote: any) => {
    // Evitar múltiplos cliques
    if (isLoadingPayment) return
    
    setIsLoadingPayment(true)
    try {
      // Tentar encontrar o registro financeiro
      let registroFinanceiro = financialRecords.find((r: any) => r.folha_codigo === lote.codigo)
      
      // Se não encontrar, tentar atualizar os dados primeiro
      if (!registroFinanceiro) {
        // Refetch dos pagamentos para garantir que temos os dados mais recentes
        await refreshPayments()
        
        // Buscar novamente após atualizar
        // Aguardar um pouco para garantir que a query foi atualizada
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Buscar novamente nos financialRecords atualizados
        // Nota: financialRecords pode não estar atualizado ainda, então vamos buscar diretamente da query
        const queryData = queryClient.getQueryData<{ financialRecords: any[] }>(['consignacao-payments'])
        if (queryData?.financialRecords) {
          registroFinanceiro = queryData.financialRecords.find((r: any) => r.folha_codigo === lote.codigo)
        }
      }
      
      if (registroFinanceiro) {
        // Abrir modal com detalhes do pagamento
        setPaymentDetailsModal({
          isOpen: true,
          folhaCodigo: lote.codigo,
          clienteName: lote.clients?.name || 'Cliente não informado',
          registroFinanceiro
        })
      } else {
        toast({
          title: 'Informação não encontrada',
          description: 'Registro de pagamento não encontrado para esta folha. Os dados podem estar sendo atualizados.',
          variant: 'destructive',
          duration: 4000
        })
      }
    } finally {
      setIsLoadingPayment(false)
    }
  }

  // Função para voltar à lista
  const handleBackToList = () => {
    setActiveFolhaInfo(null)
    navigate(`/consignado?tab=${activeTab}`)
  }
  // Renderizar componentes específicos quando uma ação está ativa
  if (activeComponent !== 'list') {
    return (
      <PageShell>
        {/* Header para componentes específicos - exceto payment que tem seu próprio header */}
        {activeComponent !== 'payment' && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeComponent === 'rascunho' && 'Gerenciar Rascunho'}
                {activeComponent === 'devolution' && 'Gerenciar Devoluções'}
                {activeComponent === 'blacklist' && 'Blacklist de Clientes'}
              </h1>
              <p className="text-gray-600">
                {activeFolhaInfo && `Folha: ${activeFolhaInfo.codigo} - Cliente: ${activeFolhaInfo.cliente_name}`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleBackToList}
            >
              Voltar à Lista
            </Button>
          </div>
        )}

        {/* Renderizar componente específico */}
        {activeComponent === 'rascunho' && activeFolhaInfo && (
          <GerenciarRascunhoLocal 
            folhaCodigo={activeFolhaInfo.codigo!}
            folhaInfo={{
              cliente_name: activeFolhaInfo.cliente_name,
              status: activeFolhaInfo.status
            }}
            onBack={handleBackToList}
          />
        )}
        
        {activeComponent === 'payment' && activeFolhaInfo && (
          <GerenciarPagamento 
            folhaCodigo={activeFolhaInfo.codigo!}
            folhaInfo={{
              id: activeFolhaInfo.id,
              cliente_name: activeFolhaInfo.cliente_name,
              status: activeFolhaInfo.status
            }}
            onBack={handleBackToList}
          />
        )}
        
        {activeComponent === 'devolution' && activeFolhaInfo && (
          <GerenciarDevolucoes 
            folhaCodigo={activeFolhaInfo.codigo!}
            folhaInfo={{
              cliente_name: activeFolhaInfo.cliente_name,
              status: activeFolhaInfo.status
            }}
            onBack={handleBackToList}
          />
        )}
        
        {activeComponent === 'blacklist' && (
          <BlacklistManagement 
            onBack={handleBackToList}
          />
        )}
      </PageShell>
    )
  }

  return (
    <PageShell>
        <PageHeader 
          title="Consignado"
          description="Gerencie folhas de consignação"
          actions={
            <Button 
              className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
              onClick={() => setIsNewDraftModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Folha
            </Button>
          }
        />

        {/* Status Cards */}
        <div className="grid grid-cols-1 cards-2:grid-cols-2 cards-4:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-card cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col overflow-visible">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 flex-shrink-0" onClick={() => {
              navigate('/consignado?tab=com-cliente')
            }}>
              <div className="min-h-[3rem] sm:min-h-[2.5rem] md:min-h-[3rem] xl:min-h-[3rem] flex items-start flex-1 min-w-0 pr-2">
                <CardTitle className="text-xs sm:text-sm font-medium break-words whitespace-normal hyphens-none leading-[1.3] sm:leading-[1.3] min-w-0">Com a Cliente</CardTitle>
              </div>
              <Handshake className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="flex flex-col justify-start flex-grow pt-0">
              <div className="mb-2 sm:mb-3">
                <div className="text-xl sm:text-2xl font-bold">{counters.ENTREGUE || 0}</div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground break-words whitespace-normal">Folhas ativas</p>
            </CardContent>
          </Card>

          <Card className="shadow-card h-full flex flex-col overflow-visible">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 flex-shrink-0">
              <div className="min-h-[3rem] sm:min-h-[2.5rem] md:min-h-[3rem] xl:min-h-[3rem] flex items-start flex-1 min-w-0 pr-2">
                <CardTitle className="text-xs sm:text-sm font-medium break-words whitespace-normal hyphens-none leading-[1.3] sm:leading-[1.3] min-w-0">
                  <span className="whitespace-normal break-words">Aguardando Pagamento</span>
                </CardTitle>
              </div>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="flex flex-col justify-start flex-grow pt-0">
              <div className="mb-2 sm:mb-3">
                <div className="text-xl sm:text-2xl font-bold">{counters.EM_CONFERENCIA || 0}</div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground break-words whitespace-normal">Para acerto</p>
            </CardContent>
          </Card>

          <Card className="shadow-card h-full flex flex-col overflow-visible">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 flex-shrink-0">
              <div className="min-h-[3rem] sm:min-h-[2.5rem] md:min-h-[3rem] xl:min-h-[3rem] flex items-start flex-1 min-w-0 pr-2">
                <CardTitle className="text-xs sm:text-sm font-medium break-words whitespace-normal hyphens-none leading-[1.3] sm:leading-[1.3] min-w-0">Finalizado</CardTitle>
              </div>
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="flex flex-col justify-start flex-grow pt-0">
              <div className="mb-2 sm:mb-3">
                <div className="text-xl sm:text-2xl font-bold">{counters.FINALIZADO || 0}</div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground break-words whitespace-normal">Este mês</p>
            </CardContent>
          </Card>

          <Card className="shadow-card h-full flex flex-col overflow-visible">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 flex-shrink-0">
              <div className="min-h-[3rem] sm:min-h-[2.5rem] md:min-h-[3rem] xl:min-h-[3rem] flex items-start flex-1 min-w-0 pr-2">
                <CardTitle className="text-xs sm:text-sm font-medium break-words whitespace-normal hyphens-none leading-[1.3] sm:leading-[1.3] min-w-0">
                  <span className="whitespace-normal break-words">Rascunhos</span>
                </CardTitle>
              </div>
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="flex flex-col justify-start flex-grow pt-0">
              <div className="mb-2 sm:mb-3">
                <div className="text-xl sm:text-2xl font-bold">{counters.RASCUNHO || 0}</div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground break-words whitespace-normal">Em preparo</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs por Status */}
        <Tabs value={activeTab} onValueChange={(value) => navigate(`/consignado?tab=${value}`)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 cards-2:grid-cols-3 tabs-5:grid-cols-5 h-auto gap-1 sm:gap-1.5 md:gap-2 overflow-visible">
            <TabsTrigger 
              value="rascunhos" 
              className="text-[10px] xs:text-xs sm:text-sm p-1.5 xs:p-2 sm:p-2.5 md:p-3 break-words whitespace-normal hyphens-none leading-tight sm:leading-normal min-w-0 flex-shrink-0"
            >
              Rascunhos
            </TabsTrigger>
            <TabsTrigger 
              value="com-cliente" 
              className="text-[10px] xs:text-xs sm:text-sm p-1.5 xs:p-2 sm:p-2.5 md:p-3 break-words whitespace-normal hyphens-none leading-tight sm:leading-normal min-w-0 flex-shrink-0"
            >
              Com a Cliente
            </TabsTrigger>
            <TabsTrigger 
              value="aguardando" 
              className="text-[10px] xs:text-xs sm:text-sm p-1.5 xs:p-2 sm:p-2.5 md:p-3 break-words whitespace-normal hyphens-none leading-tight sm:leading-normal min-w-0 flex-shrink-0"
            >
              Aguardando
            </TabsTrigger>
            <TabsTrigger 
              value="finalizado" 
              className="text-[10px] xs:text-xs sm:text-sm p-1.5 xs:p-2 sm:p-2.5 md:p-3 break-words whitespace-normal hyphens-none leading-tight sm:leading-normal min-w-0 flex-shrink-0"
            >
              Finalizado
            </TabsTrigger>
            <TabsTrigger 
              value="blacklist" 
              className="text-[10px] xs:text-xs sm:text-sm p-1.5 xs:p-2 sm:p-2.5 md:p-3 break-words whitespace-normal hyphens-none leading-tight sm:leading-normal min-w-0 flex-shrink-0 flex items-center justify-center gap-1"
            >
              <Shield className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="break-words whitespace-normal">Blacklist</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rascunhos" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Rascunhos ({rascunhosData.count})</CardTitle>
              </CardHeader>
              <CardContent>
                {rascunhosData.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum rascunho criado</p>
                  </div>
                ) : (
                  <ConsignacaoList 
                    lotes={rascunhosData.data} 
                    onDelete={(id, codigo) => setDeleteConfirm({ open: true, id, codigo })}
                    onManage={(lote) => handleManageItem(lote, 'manage-rascunho')}
                    showDelete={true}
                    manageAction={{
                      label: 'Gerenciar',
                      icon: <FileText className="h-4 w-4" />
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="com-cliente" className="consignado-com-cliente-tab space-y-4">
            <Card className="shadow-card consignado-com-cliente-card">
              <CardHeader className="consignado-com-cliente-header">
                <CardTitle>Folhas com as Clientes ({comClienteData.count})</CardTitle>
              </CardHeader>
              <CardContent className="consignado-com-cliente-content">
                {comClienteData.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-semibold text-foreground mb-2">Nenhuma folha com clientes</h3>
                    <p>Ainda não há folhas de consignação ativas</p>
                  </div>
                ) : (
                  <ConsignacaoList 
                    lotes={comClienteData.data} 
                    onDelete={(id, codigo) => setDeleteConfirm({ open: true, id, codigo })}
                    onManage={(lote) => handleManageItem(lote, 'manage-devolution')}
                    showDelete={true}
                    isDelivered={true}
                    manageAction={{
                      label: 'Devoluções',
                      icon: <Package className="h-4 w-4" />
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aguardando" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Aguardando Pagamento ({aguardandoData.count})</CardTitle>
              </CardHeader>
              <CardContent>
                {aguardandoData.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma folha aguardando pagamento</p>
                  </div>
                ) : (
                  <ConsignacaoList 
                    lotes={aguardandoData.data} 
                    onDelete={(id, codigo) => setDeleteConfirm({ open: true, id, codigo })}
                    onManage={(lote) => handleManageItem(lote, 'manage-payment')}
                    showDelete={true}
                    manageAction={{
                      label: 'Pagamento',
                      icon: <CheckCircle className="h-4 w-4" />
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finalizado" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Consignações Finalizadas ({finalizadoData.count})</CardTitle>
              </CardHeader>
              <CardContent>
                {finalizadoData.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Histórico de consignações finalizadas</p>
                  </div>
                ) : (
                  <ConsignacaoList 
                    lotes={finalizadoData.data} 
                    onDelete={(id, codigo) => setDeleteConfirm({ open: true, id, codigo })}
                    showDelete={true}
                    isFinalized={true}
                    isLoadingPayment={isLoadingPayment}
                    onViewPayment={(lote) => handleViewPayment(lote)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blacklist" className="space-y-4">
            <BlacklistManagement />
          </TabsContent>
        </Tabs>

        <NewDraftModal 
          open={isNewDraftModalOpen} 
          onOpenChange={setIsNewDraftModalOpen} 
        />

        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir lote de consignação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a consignação <strong>{deleteConfirm.codigo}</strong>?
                <br /><br />
                <strong>Esta ação irá:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remover a consignação permanentemente</li>
                  <li>Excluir todos os registros financeiros relacionados</li>
                  <li>Remover o histórico de pagamentos</li>
                </ul>
                <br />
                <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm.id && handleDelete(deleteConfirm.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Detalhes do Pagamento */}
        <PaymentDetailsModal
          isOpen={paymentDetailsModal.isOpen}
          onClose={() => setPaymentDetailsModal({ isOpen: false })}
          folhaCodigo={paymentDetailsModal.folhaCodigo || ''}
          clienteName={paymentDetailsModal.clienteName || ''}
          registroFinanceiro={paymentDetailsModal.registroFinanceiro}
        />
      </PageShell>
  )
}

interface ConsignacaoListProps {
  lotes: any[]
  onDelete: (id: string, codigo: string) => void
  onManage?: (lote: any) => void
  onViewPayment?: (lote: any) => void
  showDelete: boolean
  isDelivered?: boolean
  isFinalized?: boolean
  isLoadingPayment?: boolean
  manageAction?: {
    label: string
    icon: React.ReactNode
  }
}

function ConsignacaoList({ lotes, onDelete, onManage, onViewPayment, showDelete, isDelivered = false, isFinalized = false, isLoadingPayment = false, manageAction }: ConsignacaoListProps) {
  return (
    <>
      {/* Cards - Mobile/Tablet (< 1300px) */}
      <div className="consignado-com-cliente-cards table-full:hidden space-y-1.5 xs:space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4">
        {lotes.map((lote) => (
          <Card key={lote.id} className="border shadow-sm">
            <CardContent className="p-1.5 xs:p-2 sm:p-2.5 md:p-3 lg:p-4 space-y-1.5 xs:space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4">
              {/* Header */}
              <div className="flex flex-col gap-1 xs:gap-1.5 sm:gap-2 md:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[9px] xs:text-[10px] sm:text-xs md:text-sm lg:text-base text-foreground break-words whitespace-normal hyphens-none leading-[1.1] xs:leading-[1.2] sm:leading-normal">
                    {lote.codigo}
                  </div>
                  <div className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 break-words whitespace-normal leading-[1.1] xs:leading-[1.2] sm:leading-normal">
                    {lote.clients?.name || 'Cliente não informado'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 w-full">
                  {onManage && manageAction && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onManage(lote)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-[8px] xs:text-[9px] sm:text-xs md:text-sm h-5 xs:h-6 sm:h-7 md:h-8 lg:h-9 px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 flex items-center flex-shrink-0 min-w-0"
                    >
                      <span className="flex-shrink-0">{manageAction.icon}</span>
                      <span className="ml-0.5 break-words whitespace-normal text-[8px] xs:text-[9px] sm:text-xs md:text-sm truncate max-w-[60px] xs:max-w-[80px] sm:max-w-none">{manageAction.label}</span>
                    </Button>
                  )}
                  {isFinalized && onViewPayment && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewPayment(lote)}
                      disabled={isLoadingPayment}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 text-[8px] xs:text-[9px] sm:text-xs md:text-sm h-5 xs:h-6 sm:h-7 md:h-8 lg:h-9 px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 flex items-center flex-shrink-0 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <DollarSign className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 mr-0.5 flex-shrink-0" />
                      <span className="break-words whitespace-normal text-[8px] xs:text-[9px] sm:text-xs md:text-sm truncate max-w-[60px] xs:max-w-[80px] sm:max-w-none">Ver Pagamento</span>
                    </Button>
                  )}
                  {showDelete && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onDelete(lote.id, lote.codigo)}
                      className="text-destructive hover:text-destructive text-[8px] xs:text-[9px] sm:text-xs md:text-sm h-5 xs:h-6 sm:h-7 md:h-8 lg:h-9 px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 flex items-center flex-shrink-0 min-w-0"
                    >
                      <Trash2 className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 mr-0.5 flex-shrink-0" />
                      <span className="break-words whitespace-normal text-[8px] xs:text-[9px] sm:text-xs md:text-sm">Apagar</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-1 xs:gap-1.5 sm:gap-2 md:gap-3">
                <div>
                  <div className="text-muted-foreground mb-0.5 text-[8px] xs:text-[9px] sm:text-xs leading-[1.1]">
                    {isDelivered ? 'Entregue em' : 'Criado em'}
                  </div>
                  <div className="font-medium break-words whitespace-normal leading-[1.1] xs:leading-[1.2] sm:leading-normal text-[8px] xs:text-[9px] sm:text-xs md:text-sm">
                    {isDelivered && lote.data_entrega
                      ? formatDateSafe(lote.data_entrega, "dd/MM/yyyy HH:mm")
                      : formatDateSafe(lote.created_at, "dd/MM/yyyy")
                    }
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-0.5 text-[8px] xs:text-[9px] sm:text-xs leading-[1.1]">Prazo</div>
                  <div className="font-medium break-words whitespace-normal leading-[1.1] xs:leading-[1.2] sm:leading-normal text-[8px] xs:text-[9px] sm:text-xs md:text-sm">
                    {formatConsignacaoDate(lote.data_prevista)}
                  </div>
                </div>
                {isDelivered && (
                  <>
                    <div>
                      <div className="text-muted-foreground mb-0.5 text-[8px] xs:text-[9px] sm:text-xs leading-[1.1]">Itens</div>
                      <div className="font-medium text-[8px] xs:text-[9px] sm:text-xs md:text-sm">{lote.total_items || '–'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5 text-[8px] xs:text-[9px] sm:text-xs leading-[1.1]">Valor</div>
                      <div className="font-medium text-[8px] xs:text-[9px] sm:text-xs md:text-sm">
                        {lote.subtotal_cents 
                          ? `R$ ${(lote.subtotal_cents / 100).toFixed(2)}`
                          : '–'
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Observação */}
              {lote.observacao && (
                <div>
                  <div className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 leading-[1.1]">Observação</div>
                  <div className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm text-foreground break-words whitespace-normal hyphens-none leading-[1.2] xs:leading-[1.3] sm:leading-relaxed">
                    {lote.observacao}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela - Desktop (>= 1300px) */}
      <div className="consignado-com-cliente-table hidden table-full:block overflow-visible">
        <Table className="consignado-com-cliente-table-content">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Código</TableHead>
              <TableHead className="text-xs sm:text-sm">Consultora</TableHead>
              <TableHead className="text-xs sm:text-sm">{isDelivered ? 'Entregue em' : 'Criado em'}</TableHead>
              <TableHead className="text-xs sm:text-sm">Prazo</TableHead>
              <TableHead className="text-xs sm:text-sm">Observação</TableHead>
              {isDelivered && <TableHead className="text-right text-xs sm:text-sm">Itens</TableHead>}
              {isDelivered && <TableHead className="text-right text-xs sm:text-sm">Valor</TableHead>}
              <TableHead className="text-right text-xs sm:text-sm">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotes.map((lote) => (
              <TableRow key={lote.id}>
                <TableCell className="font-medium text-xs sm:text-sm break-words whitespace-normal hyphens-none">
                  {lote.codigo}
                </TableCell>
                <TableCell className="text-xs sm:text-sm break-words whitespace-normal hyphens-none">
                  {lote.clients?.name || 'Cliente não informado'}
                </TableCell>
                <TableCell className="text-xs sm:text-sm break-words whitespace-normal">
                  {isDelivered && lote.data_entrega
                    ? formatDateSafe(lote.data_entrega, "dd/MM/yyyy HH:mm")
                    : formatDateSafe(lote.created_at, "dd/MM/yyyy")
                  }
                </TableCell>
                <TableCell className="text-xs sm:text-sm break-words whitespace-normal">
                  {formatConsignacaoDate(lote.data_prevista)}
                </TableCell>
                <TableCell className="text-xs sm:text-sm">
                  {lote.observacao ? (
                    <div className="break-words whitespace-normal hyphens-none max-w-xs">
                      {lote.observacao}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                {isDelivered && (
                  <>
                    <TableCell className="text-right text-xs sm:text-sm">
                      {lote.total_items || '–'}
                    </TableCell>
                    <TableCell className="text-right text-xs sm:text-sm">
                      {lote.subtotal_cents 
                        ? `R$ ${(lote.subtotal_cents / 100).toFixed(2)}`
                        : '–'
                      }
                    </TableCell>
                  </>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5 sm:gap-2 flex-wrap">
                    {onManage && manageAction && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onManage(lote)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      >
                        {manageAction.icon}
                        <span className="ml-1 break-words whitespace-normal">{manageAction.label}</span>
                      </Button>
                    )}
                    {isFinalized && onViewPayment && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewPayment(lote)}
                        disabled={isLoadingPayment}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                        <span className="break-words whitespace-normal">Ver Pagamento</span>
                      </Button>
                    )}
                    {showDelete && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onDelete(lote.id, lote.codigo)}
                        className="text-destructive hover:text-destructive text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                        <span className="break-words whitespace-normal">Apagar</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}