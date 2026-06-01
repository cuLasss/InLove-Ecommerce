import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { ResponsiveGrid } from "@/components/ui/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDateSafe } from "@/lib/date-utils"
import { useConsignacoes } from "@/hooks/useConsignacoes"
import { logger } from '@/lib/logger'
import { 
  Plus, 
  Handshake, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  MoreHorizontal,
  Eye,
  Truck,
  Calculator,
  XCircle,
  Calendar,
  Users
} from "lucide-react"
// Removido import da função externa - implementação direta no componente

export default function ConsignacaoLotes() {
  logger.debug('ConsignacaoLotes iniciado')
  
  const navigate = useNavigate()
  const { 
    lotes, 
    loadingLotes, 
    entregarLote, 
    iniciarConferencia, 
    cancelarLote,
    isEntregando,
    isCancelando
  } = useConsignacoes()


  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'RASCUNHO': { label: 'Rascunho', variant: 'outline' },
      'ENTREGUE': { label: 'Com Cliente', variant: 'default' },
      'EM_ANDAMENTO': { label: 'Em Andamento', variant: 'default' },
      'EM_CONFERENCIA': { label: 'Em Conferência', variant: 'secondary' },
      'FINALIZADO': { label: 'Finalizado', variant: 'default' },
      'CANCELADO': { label: 'Cancelado', variant: 'destructive' }
    }
    
    const config = statusConfig[status] || { label: status, variant: 'outline' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

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

  const filterLotesByStatus = (status: string[]) => {
    return lotes.filter(lote => status.includes(lote.status))
  }

  const stats = {
    comCliente: filterLotesByStatus(['ENTREGUE', 'EM_ANDAMENTO']).length,
    aguardando: filterLotesByStatus(['EM_CONFERENCIA']).length,
    finalizado: filterLotesByStatus(['FINALIZADO']).length,
    rascunhos: filterLotesByStatus(['RASCUNHO']).length
  }

  const LoteTable = ({ lotes }: { lotes: any[] }) => {
    logger.debug('LoteTable renderizando com', lotes.length, 'lotes')
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lotes.map((lote) => {
          // LOGS AGRESSIVOS PARA DEBUG DEFINITIVO
          logger.debug('Renderizando lote:', {
            id: lote.id.slice(-8),
            status: lote.status,
            data_prevista: lote.data_prevista,
            data_prevista_type: typeof lote.data_prevista,
            client_name: lote.clients?.name
          })
          
          // TESTE DIRETO DA FUNÇÃO
          const testeData = formatDateSafe(lote.data_prevista, "dd/MM/yyyy", "Sem prazo definido")
          logger.debug('Resultado da função:', testeData)
          
          return (
          <TableRow key={lote.id}>
            <TableCell>
              <div>
                <div className="font-medium">{lote.clients?.name || 'Cliente não informado'}</div>
                <div className="text-sm text-muted-foreground">
                  {lote.clients?.whatsapp && `📱 ${lote.clients.whatsapp}`}
                </div>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(lote.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatTime(lote.created_at)}
            </TableCell>
            <TableCell>
              {/* 
                SOLUÇÃO DEFINITIVA E AGRESSIVA - TESTE VISUAL DIRETO
                
                PROBLEMA: Data não aparece na interface
                SOLUÇÃO: Implementação mais simples e direta possível
                
                LOGS: Verificar console para debug completo
              */}
              <div className="text-sm">
                <Calendar className="h-4 w-4 inline mr-1" />
                {/* FORMATAÇÃO PADRONIZADA COM dd/MM/yyyy */}
                <span style={{color: 'red', fontWeight: 'bold'}}>
                  {formatDateSafe(lote.data_prevista, "dd/MM/yyyy", "Sem prazo definido")}
                </span>
                {/* DEBUG VISUAL */}
                <div style={{fontSize: '10px', color: 'blue'}}>
                  DEBUG: {lote.data_prevista || 'NULL'}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/consignado/lotes/${lote.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  
                  {lote.status === 'RASCUNHO' && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => entregarLote(lote.id)}
                        disabled={isEntregando}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Entregar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => cancelarLote(lote.id)}
                        disabled={isCancelando}
                        className="text-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {(['ENTREGUE', 'EM_ANDAMENTO'].includes(lote.status)) && (
                    <DropdownMenuItem onClick={() => iniciarConferencia(lote.id)}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Iniciar Conferência
                    </DropdownMenuItem>
                  )}
                  
                  {lote.status === 'EM_CONFERENCIA' && (
                    <DropdownMenuItem onClick={() => navigate(`/consignado/acerto/${lote.id}`)}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Fazer Acerto
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
          )
          })}
        {lotes.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              Nenhum lote encontrado
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    )
  }

  if (loadingLotes) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <PageShell>
      <PageHeader 
        title="Lotes de Consignação"
        description="Gerencie folhas de consignação"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate("/consignado/lotes/entregues")}
            >
              <Truck className="mr-2 h-4 w-4" />
              Lotes Entregues
            </Button>
            <Button 
              className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
              onClick={() => navigate("/consignado/nova")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Lote
            </Button>
          </div>
        }
      />

      {/* Status Cards */}
      <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Cliente</CardTitle>
            <Handshake className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.comCliente}</div>
            <p className="text-xs text-muted-foreground">Lotes ativos</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Acerto</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aguardando}</div>
            <p className="text-xs text-muted-foreground">Para conferência</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finalizado}</div>
            <p className="text-xs text-muted-foreground">Este período</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rascunhos}</div>
            <p className="text-xs text-muted-foreground">Em preparo</p>
          </CardContent>
        </Card>
      </ResponsiveGrid>

      {/* Tabs por Status */}
      <Tabs defaultValue="com-cliente" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="com-cliente" className="text-xs sm:text-sm p-2 sm:p-3">
            Com Cliente ({stats.comCliente})
          </TabsTrigger>
          <TabsTrigger value="aguardando" className="text-xs sm:text-sm p-2 sm:p-3">
            Aguardando ({stats.aguardando})
          </TabsTrigger>
          <TabsTrigger value="finalizado" className="text-xs sm:text-sm p-2 sm:p-3">
            Finalizados ({stats.finalizado})
          </TabsTrigger>
          <TabsTrigger value="rascunhos" className="text-xs sm:text-sm p-2 sm:p-3">
            Rascunhos ({stats.rascunhos})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="com-cliente" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Lotes com Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoteTable lotes={filterLotesByStatus(['ENTREGUE', 'EM_ANDAMENTO'])} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aguardando" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Aguardando Acerto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoteTable lotes={filterLotesByStatus(['EM_CONFERENCIA'])} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finalizado" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Lotes Finalizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoteTable lotes={filterLotesByStatus(['FINALIZADO'])} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rascunhos" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Rascunhos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoteTable lotes={filterLotesByStatus(['RASCUNHO'])} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}