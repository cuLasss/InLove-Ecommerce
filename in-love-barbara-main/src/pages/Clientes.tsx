import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ClientFormDialog } from "@/components/clients/ClientFormDialog"
import { ClientEditDialog } from "@/components/clients/ClientEditDialog"
import { clientsApi } from "@/lib/api"
import { logger } from '@/lib/logger'
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Calendar,
  Filter,
  Edit,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Client {
  id: string
  name: string
  whatsapp?: string
  city?: string
  birthday?: string
  types?: string[]
  created_at: string
}

export default function Clientes() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Clientes')
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteClientConfirm, setShowDeleteClientConfirm] = useState(false)
  const [deletingClient, setDeletingClient] = useState<{ id: string; name: string } | null>(null)
  const [isDeletingClient, setIsDeletingClient] = useState(false)
  const queryClient = useQueryClient()
  const queryStartTime = useRef<number>(Date.now())

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const result = await clientsApi.getAll()
        logger.api('Loaded clients:', result?.length || 0)
        return result || []
      } catch (error) {
        logger.error('Error loading clients:', error)
        return []
      }
    },
    retry: 1,
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnMount: false, // Usa cache se ainda estiver válido
    refetchOnWindowFocus: false, // Não refaz fetch ao focar na janela
    refetchOnReconnect: false, // Não refaz fetch ao reconectar
    gcTime: 30 * 60 * 1000 // ✅ OTIMIZADO: Cache por 30 minutos
  })

  // Log de performance da query
  useEffect(() => {
    if (!isLoading) {
      const queryTime = Date.now() - queryStartTime.current
      console.log(`📊 [PERFORMANCE] Clientes - Query executada:`, {
        time: `${queryTime}ms`,
        source: error ? 'erro' : (queryTime < 100 ? 'cache' : 'network'),
        count: clients.length,
        isLoading
      })
      queryStartTime.current = Date.now()
    }
  }, [isLoading, clients.length, error])

  const totalClients = clients.length

  const handleClientCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }

  const isNewClient = (createdAt: string) => {
    const now = new Date()
    const clientCreated = new Date(createdAt)
    const diffInMinutes = (now.getTime() - clientCreated.getTime()) / (1000 * 60)
    return diffInMinutes < 5
  }

  const filteredClients = (clients || []).filter(client => {
    if (!client || !client.name) return false
    
    const matchesSearch = !searchTerm || 
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.city?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const clientTypes = Array.isArray(client.types) ? client.types : []
    const matchesFilter = !activeFilter || 
      clientTypes.some(type => {
        if (!type) return false
        const typeStr = String(type).toLowerCase()
        const filterStr = activeFilter.toLowerCase()
        return typeStr === filterStr || typeStr === filterStr.toUpperCase()
      })
    
    return matchesSearch && matchesFilter
  })

  const formatBirthdayDisplay = (birthday: string | null | undefined) => {
    if (!birthday) return "Não informado"
    try {
      const parts = birthday.split('-')
      if (parts.length === 3) {
        const [, month, day] = parts
        return `${day}/${month}`
      }
      return birthday
    } catch {
      return birthday
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsEditDialogOpen(true)
  }

  const handleClientUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }

  // Funções para seleção de clientes
  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientId])
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredClients.map(client => client.id))
    } else {
      setSelectedClients([])
    }
  }

  const clearSelection = () => {
    setSelectedClients([])
  }

  const handleDeleteClient = (clientId: string, clientName: string) => {
    setDeletingClient({ id: clientId, name: clientName })
    setShowDeleteClientConfirm(true)
  }

  const confirmDeleteClient = async () => {
    if (!deletingClient) return
    
    setIsDeletingClient(true)
      try {
      await clientsApi.delete(deletingClient.id)
        queryClient.invalidateQueries({ queryKey: ['clients'] })
        toast({
          title: "Cliente excluído",
        description: `${deletingClient.name} foi removido com sucesso.`
        })
      setShowDeleteClientConfirm(false)
      setDeletingClient(null)
      } catch (error) {
        console.error("Erro ao excluir cliente:", error)
        toast({
          title: "Erro ao excluir cliente",
          description: "Tente novamente ou entre em contato com o suporte.",
          variant: "destructive"
        })
    } finally {
      setIsDeletingClient(false)
    }
  }

  // Função para exclusão em massa
  const handleDeleteSelected = async () => {
    if (selectedClients.length === 0) return
    
    setIsDeleting(true)
    try {
      const result = await clientsApi.deleteMultiple(selectedClients)
      
      if (result) {
        const { deleted, failed } = result
        
        if (deleted > 0) {
          toast({
            title: "Clientes excluídos",
            description: `${deleted} cliente${deleted > 1 ? 's' : ''} foi${deleted > 1 ? 'ram' : ''} removido${deleted > 1 ? 's' : ''} com sucesso.`
          })
        }
        
        if (failed > 0) {
          toast({
            title: "Alguns clientes não puderam ser excluídos",
            description: `${failed} cliente${failed > 1 ? 's' : ''} não foi${failed > 1 ? 'ram' : ''} removido${failed > 1 ? 's' : ''}. Isso pode acontecer quando o cliente tem consignações associadas.`,
            variant: "destructive"
          })
        }
        
        // Limpar seleção e atualizar lista
        setSelectedClients([])
        queryClient.invalidateQueries({ queryKey: ['clients'] })
      }
    } catch (error) {
      console.error("Erro ao excluir clientes:", error)
      toast({
        title: "Erro ao excluir clientes",
        description: "Tente novamente ou entre em contato com o suporte.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'VAREJO': 'Varejo',
      'CONSIGNADO': 'Consignado', 
      'ATACADO': 'Atacado',
      'varejo': 'Varejo',
      'consignado': 'Consignado',
      'atacado': 'Atacado'
    }
    return typeLabels[type] || type
  }

  const getTypeVariant = (type: string): "default" | "secondary" | "outline" => {
    const typeLower = type.toLowerCase()
    if (typeLower === 'varejo') return 'default'
    if (typeLower === 'consignado') return 'secondary'
    return 'outline'
  }

  return (
    <PageShell>
      <style>{`
        .clients-page-header-actions {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .clients-page-header-actions button {
          white-space: nowrap;
        }
        
        @media (max-width: 846px) {
          .clients-page-header-actions {
            flex-direction: column;
            width: 100%;
          }
          
          .clients-page-header-actions button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <PageHeader 
        title="Clientes"
        description="Gerencie seus clientes e histórico de compras"
        actions={
          <div className="clients-page-header-actions">
            {selectedClients.length > 0 && (
              <>
                <Button 
                  variant="outline"
                  onClick={clearSelection}
                  className="text-muted-foreground text-xs sm:text-sm"
                >
                  <Square className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Limpar Seleção ({selectedClients.length})</span>
                  <span className="sm:hidden">Limpar ({selectedClients.length})</span>
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="text-xs sm:text-sm"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  {isDeleting ? (
                    <span>Excluindo...</span>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Excluir {selectedClients.length}</span>
                      <span className="sm:hidden">Excluir ({selectedClients.length})</span>
                    </>
                  )}
                </Button>
              </>
            )}
            <Button 
              className="bg-primary hover:bg-primary-hover text-xs sm:text-sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        }
      />

      <Card className="shadow-card" style={{ overflow: 'hidden' }}>
        <style>{`
          .filter-buttons-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            width: 100%;
            box-sizing: border-box;
            max-width: 100%;
          }
          
          .filter-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            min-width: 0;
          }
          
          .filter-button > * {
            box-sizing: border-box;
          }
          
          @media (max-width: 396px) {
            .filter-buttons-container {
              flex-direction: column;
              gap: 0.5rem;
              width: 100%;
            }
            
            .filter-button {
              width: 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              padding: 0.5rem 0.625rem !important;
              font-size: 0.75rem !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            
            .filter-button svg {
              width: 0.875rem !important;
              height: 0.875rem !important;
              min-width: 0.875rem !important;
              flex-shrink: 0 !important;
              margin-right: 0.375rem !important;
            }
            
            .filter-button span {
              font-size: 0.75rem !important;
              line-height: 1.3 !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
              flex: 1 1 auto;
              min-width: 0;
              text-align: center;
            }
          }
          
          @media (min-width: 397px) and (max-width: 639px) {
            .filter-buttons-container {
              gap: 0.5rem;
            }
            
            .filter-button {
              flex: 1 1 calc(50% - 0.25rem);
              min-width: calc(50% - 0.25rem);
              max-width: calc(50% - 0.25rem);
              padding: 0.375rem 0.5rem !important;
              font-size: 0.75rem !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            
            .filter-button span {
              font-size: 0.75rem !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
              flex: 1 1 auto;
              min-width: 0;
            }
          }
        `}</style>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
            <div className="relative flex-1">
              <Search className={`absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
              <Input
                placeholder="Buscar por nome, WhatsApp ou cidade..."
                className="pl-8 sm:pl-10 text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            <div className="filter-buttons-container">
              <Button 
                variant={activeFilter === "varejo" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveFilter(activeFilter === "varejo" ? null : "varejo")}
                className="filter-button"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Varejo</span>
              </Button>
              <Button 
                variant={activeFilter === "consignado" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveFilter(activeFilter === "consignado" ? null : "consignado")}
                className="filter-button"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Consignado</span>
              </Button>
              <Button 
                variant={activeFilter === "atacado" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveFilter(activeFilter === "atacado" ? null : "atacado")}
                className="filter-button"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Atacado</span>
              </Button>
              {(activeFilter || searchTerm) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setActiveFilter(null)
                    setSearchTerm("")
                  }}
                  className="filter-button text-muted-foreground"
                >
                  <span>Limpar filtros</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <style>{`
          .clients-header {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }
          
          .clients-header-info {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
          }
          
          .client-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid hsl(var(--border));
            transition: background-color 0.2s;
          }
          
          .client-item:hover {
            background-color: hsl(var(--muted) / 0.5);
          }
          
          .client-item-content {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 0.75rem;
            flex: 1 1 auto;
            min-width: 0;
          }
          
          .client-item-info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex: 1 1 auto;
            min-width: 0;
          }
          
          .client-item-header {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 0.5rem;
          }
          
          .client-item-name {
            font-weight: 600;
            color: hsl(var(--foreground));
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .client-item-badges {
            display: flex;
            flex-direction: row;
            gap: 0.25rem;
            flex-wrap: wrap;
          }
          
          .client-item-details {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
          }
          
          .client-item-detail {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.25rem;
          }
          
          .client-item-actions {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.5rem;
            flex-shrink: 0;
          }
          
          @media (max-width: 846px) {
            .clients-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.75rem;
            }
            
            .clients-header-info {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
              width: 100%;
            }
            
            .client-item {
              flex-direction: column;
              align-items: stretch;
              gap: 0.75rem;
              padding: 0.75rem;
            }
            
            .client-item-content {
              width: 100%;
            }
            
            .client-item-info {
              width: 100%;
            }
            
            .client-item-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
            
            .client-item-name {
              width: 100%;
            }
            
            .client-item-details {
              width: 100%;
            }
            
            .client-item-detail {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .client-item-actions {
              width: 100%;
              justify-content: stretch;
            }
            
            .client-item-actions > div {
              width: 100%;
              display: flex;
              gap: 0.5rem;
            }
            
            .client-item-actions button {
              flex: 1 1 0;
            }
          }
          
          @media (max-width: 640px) {
            .client-item {
              padding: 0.625rem;
            }
            
            .client-item-header {
              gap: 0.375rem;
            }
            
            .client-item-name {
              font-size: 0.9375rem;
            }
            
            .client-item-details {
              font-size: 0.8125rem;
            }
            
            .client-item-badges {
              font-size: 0.75rem;
            }
          }
        `}</style>
        <CardHeader>
          <CardTitle className="clients-header">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
              <span>Lista de Clientes</span>
            </div>
            <div className="clients-header-info">
              {activeFilter && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">Filtro: {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}</span>
                </div>
              )}
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {filteredClients.length} de {totalClients} clientes
              </span>
              {filteredClients.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4 flex-shrink-0"
                  />
                  <span className="text-xs whitespace-nowrap">
                    {selectedClients.length > 0 ? `${selectedClients.length} selecionados` : 'Selecionar todos'}
                  </span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Erro ao carregar clientes</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredClients.map((client) => (
                <div key={client.id} className="client-item">
                  <div className="client-item-content">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                      className="h-4 w-4 mt-1 flex-shrink-0"
                    />
                    <div className="client-item-info">
                      <div className="client-item-header">
                        <h3 className="client-item-name">{client.name}</h3>
                        <div className="client-item-badges">
                          {Array.isArray(client.types) && client.types.length > 0 ? (
                            client.types.map((type, index) => (
                              <Badge 
                                key={`${type}-${index}`} 
                                variant={getTypeVariant(type)} 
                                className="text-xs flex-shrink-0"
                              >
                                {getTypeLabel(type)}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground flex-shrink-0">
                              Sem categoria
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="client-item-details">
                        <div className="client-item-detail">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{client.whatsapp || "Não informado"}</span>
                      </div>
                        <div className="client-item-detail">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            Aniversário: {formatBirthdayDisplay(client.birthday)}
                            {client.city && <span> • {client.city}</span>}
                          </span>
                      </div>
                      </div>
                    </div>
                  </div>
                  <div className="client-item-actions">
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Edit className="h-3 w-3 sm:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="flex-1 sm:flex-none text-destructive hover:text-destructive text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 sm:mr-2 flex-shrink-0" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSuccess={handleClientCreated}
      />
      
      <ClientEditDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleClientUpdated}
        client={editingClient}
      />

      {/* Modal de confirmação de exclusão em massa */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Confirmar Exclusão</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Tem certeza que deseja excluir <strong>{selectedClients.length}</strong> cliente{selectedClients.length > 1 ? 's' : ''}?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão individual */}
      {showDeleteClientConfirm && deletingClient && typeof document !== 'undefined' 
        ? createPortal(
            <>
              <style>{`
                .delete-client-modal-backdrop {
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  bottom: 0 !important;
                  width: 100vw !important;
                  height: 100vh !important;
                  min-width: 100vw !important;
                  min-height: 100vh !important;
                  max-width: 100vw !important;
                  max-height: 100vh !important;
                  background-color: rgba(0, 0, 0, 0.5) !important;
                  z-index: 9999 !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  padding: 0.75rem !important;
                  box-sizing: border-box !important;
                  overflow: auto !important;
                  margin: 0 !important;
                  inset: 0 !important;
                }
                
                @keyframes fade-in {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
                
                @keyframes zoom-in {
                  from {
                    transform: scale(0.95);
                  }
                  to {
                    transform: scale(1);
                  }
                }
                
                .delete-client-modal-container {
                  animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
                  max-width: 28rem;
                  width: 100%;
                  box-sizing: border-box;
                  background-color: white;
                  border-radius: 0.5rem;
                  padding: 1rem;
                  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                  position: relative;
                  z-index: 10000;
                }
                
                .delete-client-modal {
                  max-width: 100%;
                  box-sizing: border-box;
                }
                
                @media (min-width: 640px) {
                  .delete-client-modal-backdrop {
                    padding: 1rem !important;
                  }
                  
                  .delete-client-modal-container {
                    padding: 1.5rem;
                  }
                }
                
                @media (max-width: 396px) {
                  .delete-client-modal-backdrop {
                    padding: 0.5rem !important;
                  }
                  
                  .delete-client-modal-container {
                    padding: 0.875rem;
                    max-width: 100%;
                    margin: 0;
                  }
                  
                  .delete-client-modal h3 {
                    font-size: 0.9375rem;
                    margin-bottom: 0.75rem;
                  }
                  
                  .delete-client-modal p {
                    font-size: 0.8125rem;
                    margin-bottom: 1rem;
                    line-height: 1.5;
                  }
                  
                  .delete-client-modal strong {
                    word-break: break-word;
                    display: inline-block;
                    max-width: 100%;
                  }
                }
                
                @media (max-width: 320px) {
                  .delete-client-modal-container {
                    padding: 0.75rem;
                  }
                  
                  .delete-client-modal h3 {
                    font-size: 0.875rem;
                  }
                  
                  .delete-client-modal p {
                    font-size: 0.75rem;
                  }
                }
              `}</style>
              <div 
                className="delete-client-modal-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !isDeletingClient) {
                    setShowDeleteClientConfirm(false)
                    setDeletingClient(null)
                  }
                }}
              >
                <div 
                  className="delete-client-modal-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="delete-client-modal">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900">
                      Confirmar Exclusão
                    </h3>
                    <div className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                      <p className="mb-2">
                        Tem certeza que deseja excluir o cliente{' '}
                        <strong className="font-semibold text-gray-900 break-words inline-block max-w-full">
                          {deletingClient.name}
                        </strong>
                        ?
                      </p>
                      <p className="text-destructive text-xs sm:text-sm font-medium mt-2">
                        Esta ação não pode ser desfeita.
                      </p>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!isDeletingClient) {
                            setShowDeleteClientConfirm(false)
                            setDeletingClient(null)
                          }
                        }}
                        disabled={isDeletingClient}
                        className="w-full sm:w-auto text-sm sm:text-base px-4 sm:px-6"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={confirmDeleteClient}
                        disabled={isDeletingClient}
                        className="w-full sm:w-auto text-sm sm:text-base px-4 sm:px-6"
                      >
                        {isDeletingClient ? 'Excluindo...' : 'Excluir Cliente'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null
      }
    </PageShell>
  )
}
