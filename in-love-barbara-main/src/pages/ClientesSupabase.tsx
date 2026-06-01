import { useState } from "react"
import { PageShell, PageHeader } from "@/components/layout/PageShell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useSupabaseClients } from "@/hooks/useSupabaseClients"
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
  RefreshCw
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SupabaseClient {
  id: string
  name: string
  whatsapp: string | null
  city: string | null
  state: string | null
  zip: string | null
  zip_code: string | null
  address: string | null
  email: string | null
  cpf: string | null
  cnpj: string | null
  birthday: string | null
  birth_date: string | null
  notes: string | null
  types: string[]
  active: boolean
  created_at: string
  updated_at: string | null
}

export default function ClientesSupabase() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { 
    clients, 
    isLoading, 
    error, 
    createClient, 
    updateClient, 
    deleteClient, 
    refresh 
  } = useSupabaseClients({
    autoRefresh: true,
    refreshInterval: 30000 // 30 segundos
  })

  const totalClients = clients.length

  const handleCreateClient = async () => {
    setIsCreating(true)
    try {
      const newClient = await createClient({
        name: `Cliente Teste ${Date.now()}`,
        whatsapp: '11999999999',
        city: 'São Paulo',
        types: ['VAREJO']
      })
      
      if (newClient) {
        toast({
          title: "Cliente criado",
          description: `${newClient.name} foi criado com sucesso.`
        })
      }
    } catch (error) {
      console.error("Erro ao criar cliente:", error)
      toast({
        title: "Erro ao criar cliente",
        description: "Tente novamente ou entre em contato com o suporte.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${clientName}"?`)) {
      try {
        const success = await deleteClient(clientId)
        if (success) {
          toast({
            title: "Cliente excluído",
            description: `${clientName} foi removido com sucesso.`
          })
        }
      } catch (error) {
        console.error("Erro ao excluir cliente:", error)
        toast({
          title: "Erro ao excluir cliente",
          description: "Tente novamente ou entre em contato com o suporte.",
          variant: "destructive"
        })
      }
    }
  }

  const handleRefresh = async () => {
    try {
      await refresh()
      toast({
        title: "Lista atualizada",
        description: "Os dados dos clientes foram atualizados."
      })
    } catch (error) {
      console.error("Erro ao atualizar:", error)
    }
  }

  const isNewClient = (createdAt: string) => {
    const now = new Date()
    const clientCreated = new Date(createdAt)
    const diffInMinutes = (now.getTime() - clientCreated.getTime()) / (1000 * 60)
    return diffInMinutes < 5
  }

  const filteredClients = clients.filter(client => {
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
      <PageHeader 
        title="Clientes (Supabase)"
        description="Gerencie seus clientes usando Supabase - Migração em andamento"
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button 
              className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
              onClick={handleCreateClient}
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? 'Criando...' : 'Novo Cliente'}
            </Button>
          </div>
        }
      />

      {/* Status da conexão */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm">
                {error ? 'Erro na conexão' : 'Conectado ao Supabase'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {totalClients} clientes
            </div>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
              <Input
                placeholder="Buscar por nome, WhatsApp ou cidade..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={activeFilter === "varejo" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveFilter(activeFilter === "varejo" ? null : "varejo")}
                className="flex-1 sm:flex-none"
              >
                <Filter className="mr-2 h-4 w-4" />
                Varejo
              </Button>
              <Button 
                variant={activeFilter === "consignado" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveFilter(activeFilter === "consignado" ? null : "consignado")}
                className="flex-1 sm:flex-none"
              >
                <Filter className="mr-2 h-4 w-4" />
                Consignado
              </Button>
              <Button 
                variant={activeFilter === "atacado" ? "default" : "outline"} 
                size="sm"
                onClick={() => setActiveFilter(activeFilter === "atacado" ? null : "atacado")}
                className="flex-1 sm:flex-none"
              >
                <Filter className="mr-2 h-4 w-4" />
                Atacado
              </Button>
              {(activeFilter || searchTerm) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setActiveFilter(null)
                    setSearchTerm("")
                  }}
                  className="flex-1 sm:flex-none text-muted-foreground"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Clientes (Supabase)
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {activeFilter && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filtro: {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}</span>
                </div>
              )}
              <span>
                {filteredClients.length} de {totalClients} clientes
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando clientes do Supabase...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Erro:</strong> {error}
              </div>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div key={client.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                      {isNewClient(client.created_at) && (
                        <Badge variant="default" className="text-xs">
                          Novo
                        </Badge>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(client.types) && client.types.length > 0 ? (
                          client.types.map((type, index) => (
                            <Badge 
                              key={`${type}-${index}`} 
                              variant={getTypeVariant(type)} 
                              className="text-xs"
                            >
                              {getTypeLabel(type)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Sem categoria
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{client.whatsapp || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>Aniversário: {formatBirthdayDisplay(client.birthday || client.birth_date)}</span>
                        {client.city && <span>• {client.city}</span>}
                      </div>
                      {client.email && (
                        <div className="text-xs text-gray-500">
                          Email: {client.email}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex gap-2 justify-center sm:justify-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Funcionalidade em desenvolvimento",
                            description: "A edição de clientes será implementada em breve."
                          })
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-3 w-3 sm:mr-2" />
                        <span className="sm:inline hidden">Editar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 sm:mr-2" />
                        <span className="sm:inline hidden">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}

