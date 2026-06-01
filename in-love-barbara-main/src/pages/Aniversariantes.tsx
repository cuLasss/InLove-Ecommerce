
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gift, Search, Calendar, Phone, MessageCircle, Cake, Send, Edit3, Plus, Eye, History, Clock, ChevronDown, ChevronUp, CheckSquare, Square, Trash2 } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { clientsApi } from "@/lib/api"
import { birthdayMessagesAdapter, type BirthdayMessage } from "@/lib/supabase-birthday-messages-adapter"

interface Client {
  id: string
  name: string
  whatsapp?: string
  birthday?: string
  city?: string
  types?: string[]
}

interface BirthdayClient extends Client {
  daysUntilBirthday?: number
  age?: number
  isToday?: boolean
  isThisWeek?: boolean
  isThisMonth?: boolean
  hasBirthday: boolean
}

import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function Aniversariantes() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Aniversariantes')
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPeriod, setFilterPeriod] = useState("all")
  const [customMessageDialog, setCustomMessageDialog] = useState<{ open: boolean; client: BirthdayClient | null }>({ open: false, client: null })
  const [customMessage, setCustomMessage] = useState("")
  const [editMessageDialog, setEditMessageDialog] = useState<{ open: boolean; client: BirthdayClient | null }>({ open: false, client: null })
  const [addBirthdayDialog, setAddBirthdayDialog] = useState<{ open: boolean; client: BirthdayClient | null }>({ open: false, client: null })
  const [birthdayInput, setBirthdayInput] = useState("")
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Usar React Query para sincronizar com outras páginas
  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnWindowFocus: false, // ✅ OTIMIZAÇÃO: Não refaz fetch ao focar na janela
    refetchOnMount: false, // ✅ OTIMIZAÇÃO: Usa cache se ainda estiver válido
    refetchOnReconnect: false, // Não refaz fetch ao reconectar
    gcTime: 30 * 60 * 1000 // ✅ OTIMIZADO: Cache por 30 minutos
  })

  // ✅ OTIMIZAÇÃO CRÍTICA: Usar React Query para carregar mensagens (cache compartilhado)
  const { data: sentMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['birthday-messages'],
    queryFn: async () => {
      console.log('🔄 [Aniversariantes] Carregando mensagens do Supabase...')
      const messages = await birthdayMessagesAdapter.getAllMessages()
      console.log('✅ [Aniversariantes] Mensagens carregadas:', messages.length)
      return messages
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    gcTime: 30 * 60 * 1000
  })

  // Função para recarregar mensagens (usada após salvar ou migrar)
  const loadMessages = async () => {
    // Invalidar cache para forçar refetch
    await queryClient.invalidateQueries({ queryKey: ['birthday-messages'] })
  }

  // Função para migrar mensagens do localStorage para Supabase
  const migrateFromLocalStorage = async () => {
    try {
      setIsMigrating(true)
      console.log('🔄 [Aniversariantes] Iniciando migração do localStorage...')
      
      const migratedCount = await birthdayMessagesAdapter.migrateFromLocalStorage()
      
      if (migratedCount > 0) {
        // Recarregar mensagens após migração
        await loadMessages()
        
        toast({
          title: "Migração concluída",
          description: `${migratedCount} mensagens migradas do localStorage para o Supabase`,
        })
      } else {
        toast({
          title: "Nenhuma mensagem encontrada",
          description: "Não há mensagens no localStorage para migrar",
        })
      }
    } catch (error) {
      console.error('❌ [Aniversariantes] Erro na migração:', error)
      toast({
        title: "Erro na migração",
        description: "Erro ao migrar mensagens do localStorage",
        variant: "destructive"
      })
    } finally {
      setIsMigrating(false)
    }
  }

  // Carregar mensagens na inicialização
  useEffect(() => {
    loadMessages()
  }, [])

  // Função para salvar mensagem enviada
  const saveSentMessage = async (client: BirthdayClient, message: string) => {
    try {
      console.log('🔄 [Aniversariantes] Salvando mensagem no Supabase...')
      
      const messageData = {
        clientName: client.name,
        clientWhatsapp: client.whatsapp || '',
        message,
        sentAt: new Date(),
        type: 'birthday' as const
      }
      
      const savedMessage = await birthdayMessagesAdapter.saveMessage(messageData, client.id)
      
      // ✅ OTIMIZAÇÃO: Invalidar cache para recarregar mensagens
      await queryClient.invalidateQueries({ queryKey: ['birthday-messages'] })
      
      console.log('✅ [Aniversariantes] Mensagem salva:', savedMessage.id)
    } catch (error) {
      console.error('❌ [Aniversariantes] Erro ao salvar mensagem:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar mensagem no histórico",
        variant: "destructive"
      })
    }
  }

  const calculateBirthdayInfo = (birthday: string): Omit<BirthdayClient, keyof Client> => {
    const today = new Date()
    const currentYear = today.getFullYear()
    
    // Parse birthday
    const birthDate = new Date(birthday)
    const birthMonth = birthDate.getMonth()
    const birthDay = birthDate.getDate()
    
    // Calculate this year's birthday
    let thisBirthday = new Date(currentYear, birthMonth, birthDay)
    
    // If birthday already passed this year, use next year
    if (thisBirthday < today) {
      thisBirthday = new Date(currentYear + 1, birthMonth, birthDay)
    }
    
    // Calculate days until birthday
    const timeDiff = thisBirthday.getTime() - today.getTime()
    const daysUntilBirthday = Math.ceil(timeDiff / (1000 * 3600 * 24))
    
    // Calculate age
    let age = currentYear - birthDate.getFullYear()
    if (thisBirthday.getFullYear() === currentYear + 1) {
      age++ // Birthday this year already passed
    }
    
    // Check periods - corrigir lógica para que aniversário de hoje apareça em todas as categorias
    const isToday = daysUntilBirthday === 0
    const isThisWeek = daysUntilBirthday <= 7 && daysUntilBirthday >= 0
    const isThisMonth = daysUntilBirthday <= 30 && daysUntilBirthday >= 0
    
    return {
      daysUntilBirthday,
      age,
      isToday,
      isThisWeek,
      isThisMonth,
      hasBirthday: true
    }
  }

  // Processar todos os clientes usando useMemo para performance
  const clients = useMemo(() => {
    return allClients
      .map((client: Client) => {
        // Todos os clientes devem ter data de nascimento obrigatória
        const birthdayDate = client.birthday || (client as any).birth_date
        
        if (!birthdayDate || birthdayDate === 'null') {
          // Se não tem data de nascimento, não incluir na lista
          return null
        }
        
        return {
          ...client,
          hasBirthday: true,
          ...calculateBirthdayInfo(birthdayDate)
        }
      })
      .filter((client): client is BirthdayClient => client !== null)
      .sort((a: BirthdayClient, b: BirthdayClient) => {
        // Ordenar por dias até o aniversário
        return (a.daysUntilBirthday || 0) - (b.daysUntilBirthday || 0)
      })
  }, [allClients])

  const filteredClients = clients.filter((client: BirthdayClient) => {
    // Apply search filter
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.city?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    // Apply period filter
    switch (filterPeriod) {
      case "today":
        return client.isToday
      case "thisWeek":
        return client.isThisWeek
      case "thisMonth":
        return client.isThisMonth
      case "next30":
        return (client.daysUntilBirthday || 0) <= 30
      case "next60":
        return (client.daysUntilBirthday || 0) <= 60
      case "all":
      default:
        return true
    }
  })

  const defaultBirthdayMessage = (clientName: string) => {
    return `🎉 Feliz Aniversário, ${clientName}! 🎂

Esse é o seu mês, e a In Love quer te mimar como você merece! 💖

Para deixar sua comemoração ainda mais especial, preparamos não um, mas dois presentes incríveis para você:

🎁 Compre 1 produto e leve o segundo de graça! 
(O de menor valor sai por nossa conta!)

💖 Ou, se preferir, aproveite 25% de desconto em qualquer compra!

E a melhor parte? Você pode aproveitar seu presente durante todo o mês do seu aniversário!

Então escolha seu mimo e celebre do jeito que quiser!

Com carinho e muito prazer,
equipe In Love 💋`
  }

  // Função auxiliar para abrir WhatsApp com suporte ao app do Windows
  const openWhatsApp = (phoneNumber: string, message: string) => {
    // Codificar a mensagem para URL (garantir que emojis e caracteres especiais funcionem)
    const encodedMessage = encodeURIComponent(message)
    
    // Usar web.whatsapp.com que mostra a tela de seleção (Web ou Windows)
    // e garante que a mensagem seja pré-preenchida corretamente
    // Formato: https://web.whatsapp.com/send?phone=5511999999999&text=MENSAGEM
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`
    
    // Abrir WhatsApp - isso mostrará a tela de seleção primeiro
    // O usuário pode escolher entre WhatsApp Web ou Windows
    // A mensagem já estará pré-preenchida
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSendWhatsApp = async (client: BirthdayClient) => {
    const message = defaultBirthdayMessage(client.name)
    
    const whatsapp = client.whatsapp || ''
    if (!whatsapp || typeof whatsapp !== 'string') {
      toast({
        title: "Erro",
        description: "WhatsApp não informado para este cliente",
        variant: "destructive"
      })
      return
    }
    
    // Limpar número do WhatsApp (remover caracteres especiais)
    const cleanWhatsapp = whatsapp.replace(/\D/g, '')
    
    // Garantir que o número tenha o código do país (55 para Brasil)
    const phoneNumber = cleanWhatsapp.startsWith('55') ? cleanWhatsapp : `55${cleanWhatsapp}`
    
    // Salvar mensagem no histórico
    await saveSentMessage(client, message)
    
    // Abrir WhatsApp usando função auxiliar que funciona no app do Windows e no web
    openWhatsApp(phoneNumber, message)
    
    toast({
      title: "Sucesso",
      description: `Abrindo WhatsApp para ${client.name}`,
    })
  }

  const handleOpenCustomMessage = (client: BirthdayClient) => {
    setCustomMessage(defaultBirthdayMessage(client.name))
    setCustomMessageDialog({ open: true, client })
  }

  const handleOpenEditMessage = (client: BirthdayClient) => {
    setEditMessageDialog({ open: true, client })
  }

  const handleSendCustomMessage = async () => {
    const { client } = customMessageDialog
    if (!client) return

    const whatsapp = client.whatsapp || ''
    if (!whatsapp || typeof whatsapp !== 'string') {
      toast({
        title: "Erro",
        description: "WhatsApp não informado para este cliente",
        variant: "destructive"
      })
      return
    }

    if (!customMessage.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma mensagem antes de enviar",
        variant: "destructive"
      })
      return
    }

    // Limpar número do WhatsApp (remover caracteres especiais)
    const cleanWhatsapp = whatsapp.replace(/\D/g, '')
    
    // Garantir que o número tenha o código do país (55 para Brasil)
    const phoneNumber = cleanWhatsapp.startsWith('55') ? cleanWhatsapp : `55${cleanWhatsapp}`
    
    // Salvar mensagem no histórico
    await saveSentMessage(client, customMessage)
    
    // Abrir WhatsApp usando função auxiliar que funciona no app do Windows e no web
    openWhatsApp(phoneNumber, customMessage)
    
    setCustomMessageDialog({ open: false, client: null })
    setCustomMessage("")
    
    toast({
      title: "Sucesso",
      description: `Mensagem enviada para ${client.name}`,
    })
  }

  const handleAddBirthday = async () => {
    const { client } = addBirthdayDialog
    if (!client || !birthdayInput) return

    try {
      // Converter DD/MM/YYYY para YYYY-MM-DD
      const parts = birthdayInput.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        
        await clientsApi.update(client.id, {
          ...client,
          birthday: isoDate
        })

        toast({
          title: "Sucesso",
          description: `Data de nascimento adicionada para ${client.name}`,
        })

        setAddBirthdayDialog({ open: false, client: null })
        setBirthdayInput("")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar data de nascimento",
        variant: "destructive"
      })
    }
  }

  const formatBirthday = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
    }
  }

  const handleBirthdayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthday(e.target.value)
    setBirthdayInput(formatted)
  }


  const todayBirthdays = clients.filter(c => c.isToday)
  const thisWeekBirthdays = clients.filter(c => c.isThisWeek)
  const thisMonthBirthdays = clients.filter(c => c.isThisMonth)

  // Função para formatar data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Função para limpar histórico
  const clearHistory = async () => {
    try {
      console.log('🔄 [Aniversariantes] Limpando histórico no Supabase...')
      
      await birthdayMessagesAdapter.clearAllMessages()
      
      // ✅ OTIMIZAÇÃO: Invalidar cache para recarregar mensagens
      await queryClient.invalidateQueries({ queryKey: ['birthday-messages'] })
      
      setExpandedMessages(new Set())
      setSelectedMessages(new Set())
      setIsSelectionMode(false)
      setShowClearConfirmDialog(false)
      
      toast({
        title: "Histórico limpo",
        description: "Todas as mensagens foram removidas do histórico",
      })
    } catch (error) {
      console.error('❌ [Aniversariantes] Erro ao limpar histórico:', error)
      toast({
        title: "Erro",
        description: "Erro ao limpar histórico",
        variant: "destructive"
      })
    }
  }

  // Função para alternar seleção de mensagem
  const toggleMessageSelection = (messageId: string) => {
    const newSelection = new Set(selectedMessages)
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId)
    } else {
      newSelection.add(messageId)
    }
    setSelectedMessages(newSelection)
  }

  // Função para selecionar todas as mensagens
  const selectAllMessages = () => {
    setSelectedMessages(new Set(sentMessages.map(msg => msg.id)))
  }

  // Função para desmarcar todas as mensagens
  const deselectAllMessages = () => {
    setSelectedMessages(new Set())
  }

  // Função para excluir mensagens selecionadas
  const deleteSelectedMessages = async () => {
    if (selectedMessages.size === 0) return

    try {
      console.log('🔄 [Aniversariantes] Excluindo mensagens selecionadas...')
      
      await birthdayMessagesAdapter.deleteMultipleMessages(Array.from(selectedMessages))
      
      // ✅ OTIMIZAÇÃO: Invalidar cache para recarregar mensagens
      await queryClient.invalidateQueries({ queryKey: ['birthday-messages'] })
      
      setSelectedMessages(new Set())
      setIsSelectionMode(false)
      
      toast({
        title: "Mensagens excluídas",
        description: `${selectedMessages.size} mensagem(ns) foram removidas do histórico`,
      })
    } catch (error) {
      console.error('❌ [Aniversariantes] Erro ao excluir mensagens:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir mensagens",
        variant: "destructive"
      })
    }
  }

  // Função para excluir uma única mensagem
  const deleteSingleMessage = async (messageId: string) => {
    try {
      console.log('🔄 [Aniversariantes] Excluindo mensagem:', messageId)
      
      await birthdayMessagesAdapter.deleteMessage(messageId)
      
      // ✅ OTIMIZAÇÃO: Invalidar cache para recarregar mensagens
      await queryClient.invalidateQueries({ queryKey: ['birthday-messages'] })
      
      setSelectedMessages(prev => {
        const newSet = new Set(prev)
        newSet.delete(messageId)
        return newSet
      })
      
      toast({
        title: "Mensagem excluída",
        description: "Mensagem removida do histórico",
      })
    } catch (error) {
      console.error('❌ [Aniversariantes] Erro ao excluir mensagem:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir mensagem",
        variant: "destructive"
      })
    }
  }

  // Função para entrar/sair do modo de seleção
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      setSelectedMessages(new Set())
    }
  }

  // Função para alternar expansão da mensagem
  const toggleMessageExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  // Função para gerar prévia da mensagem
  const getMessagePreview = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Aniversariantes</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground break-words mt-1">Acompanhe os aniversários dos seus clientes</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="aniversariantes" className="w-full">
          <div className="w-full overflow-x-hidden">
            <TabsList className="grid w-full grid-cols-2 !h-auto min-h-[2.75rem] sm:min-h-[2.5rem] gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-md bg-muted">
              <TabsTrigger 
                value="aniversariantes" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
              >
                <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Aniversariantes</span>
            </TabsTrigger>
              <TabsTrigger 
                value="historico" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 rounded-sm"
              >
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Histórico ({sentMessages.length})</span>
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="aniversariantes" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 tablet:grid-cols-4 gap-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Cake className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{todayBirthdays.length}</div>
              <p className="text-xs text-yellow-600">aniversários hoje</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{thisWeekBirthdays.length}</div>
              <p className="text-xs text-blue-600">próximos 7 dias</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <Gift className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{thisMonthBirthdays.length}</div>
              <p className="text-xs text-green-600">próximos 30 dias</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cadastros</CardTitle>
              <Phone className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{clients.length}</div>
              <p className="text-xs text-purple-600">clientes cadastrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
                <Input
                  placeholder="Buscar por nome ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="thisWeek">Esta Semana</SelectItem>
                  <SelectItem value="thisMonth">Este Mês</SelectItem>
                  <SelectItem value="next30">Próximos 30 dias</SelectItem>
                  <SelectItem value="next60">Próximos 60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Clientes ({filteredClients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando clientes...</div>
            ) : filteredClients.length > 0 ? (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <div key={client.id} className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-3 p-4 border rounded-lg">
                    <div className="flex items-start tablet:items-center gap-3 tablet:gap-4 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <Gift className="h-8 w-8 text-primary" />
                        {client.isToday && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-sm tablet:text-base break-words">{client.name}</span>
                          {client.isToday && (
                            <Badge className="bg-yellow-500 text-yellow-900 text-xs">
                              🎂 HOJE!
                            </Badge>
                          )}
                          {client.isThisWeek && !client.isToday && (
                            <Badge variant="secondary" className="text-xs">
                              Esta semana
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {client.age} anos
                          </Badge>
                        </div>
                        <div className="text-xs tablet:text-sm text-muted-foreground break-words">
                          📱 {client.whatsapp} • 📍 {client.city}
                        </div>
                        <div className="text-xs tablet:text-sm font-medium mt-1">
                          {client.isToday ? (
                            <span className="text-yellow-600">🎉 Aniversário hoje!</span>
                          ) : (
                            <span className="text-muted-foreground">
                              🗓️ {client.daysUntilBirthday} dias para o aniversário
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 tablet:flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCustomMessage(client)}
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200 w-full tablet:w-auto text-xs tablet:text-sm"
                        title="Preparar mensagem de aniversário"
                      >
                        <MessageCircle className="h-4 w-4 text-blue-600 tablet:mr-2" />
                        <span className="hidden tablet:inline">Preparar Mensagem</span>
                        <span className="tablet:hidden">Mensagem</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Nenhum cliente encontrado</h3>
                <p className="text-muted-foreground">Não há clientes no filtro selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para preparar mensagem */}
        <Dialog open={customMessageDialog.open} onOpenChange={(open) => {
          setCustomMessageDialog({ open, client: null })
          if (!open) {
            setCustomMessage("")
          }
        }}>
          <DialogContent className="max-h-[95vh] lg:max-h-[90vh] p-0 overflow-hidden w-[95vw] max-w-md flex flex-col">
            {/* Modo preview: mostra apenas o preview com botão para editar */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-pink-50 to-purple-50 flex-shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-gray-800">🎉 Mensagem de Aniversário</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Para: <span className="font-semibold text-pink-600">{customMessageDialog.client?.name}</span>
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Preview & Actions */}
              <div className="flex-1 bg-gradient-to-br from-pink-50 to-purple-50 p-4 lg:p-6 overflow-y-auto min-h-0">
                <div className="h-full flex flex-col max-w-2xl mx-auto">
                  <div className="mb-4 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">📱 Preview</h3>
                    <div className="text-sm text-gray-600 break-words">
                      Para: <span className="font-medium">{customMessageDialog.client?.whatsapp || "número não informado"}</span>
                    </div>
                  </div>

                  {/* WhatsApp Preview */}
                  <div className="flex-1 bg-white rounded-2xl shadow-lg p-4 lg:p-6 border border-gray-100 mb-4 min-h-0 flex flex-col">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100 flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">WA</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800">WhatsApp</div>
                        <div className="text-xs text-green-600">online</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {customMessage || "Digite sua mensagem..."}
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex-shrink-0">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 text-sm flex-shrink-0">ℹ️</div>
                      <div className="text-sm text-blue-700">
                        <strong>Como funciona:</strong> Mensagem enviada via WhatsApp
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 flex-shrink-0">
                    <Button
                      onClick={() => {
                        if (customMessageDialog.client) {
                          handleOpenEditMessage(customMessageDialog.client)
                        }
                      }}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar Mensagem
                    </Button>
                    <Button
                      onClick={handleSendCustomMessage}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={!customMessageDialog.client?.whatsapp || !customMessage.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar no WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomMessageDialog({ open: false, client: null })
                        setCustomMessage("")
                      }}
                      className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 py-3 rounded-xl"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição Separado */}
        <Dialog open={editMessageDialog.open} onOpenChange={(open) => {
          setEditMessageDialog({ open, client: null })
        }}>
          <DialogContent className="max-w-3xl max-h-[95vh] lg:max-h-[90vh] p-0 overflow-hidden w-[95vw] lg:w-full flex flex-col">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-pink-50 to-purple-50 flex-shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-lg lg:text-xl font-bold text-gray-800">✏️ Editar Mensagem</DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Para: <span className="font-semibold text-pink-600">{editMessageDialog.client?.name}</span>
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Editor */}
              <div className="flex-1 p-4 lg:p-6 bg-white overflow-y-auto min-h-0">
                <div className="space-y-3 lg:space-y-4">
                  <div>
                    <Label className="text-sm lg:text-base font-semibold text-gray-700 mb-2 block">✏️ Editar Mensagem:</Label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="min-h-[400px] lg:min-h-[500px] border-2 border-gray-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 rounded-xl resize-none text-sm lg:text-base"
                      placeholder="Digite sua mensagem personalizada..."
                    />
                    <div className="mt-2 text-xs lg:text-sm text-gray-500 flex items-center gap-1">
                      💡 Você pode personalizar a mensagem padrão
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 lg:p-6 border-t bg-gray-50 flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMessageDialog({ open: false, client: null })
                    }}
                    className="w-full sm:w-auto border-gray-300 text-gray-600 hover:bg-gray-50 py-2.5 lg:py-3 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMessageDialog({ open: false, client: null })
                    }}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 lg:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Salvar e Fechar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

          </TabsContent>

          <TabsContent value="historico" className="space-y-4 sm:space-y-6 mt-3 sm:mt-4">
            {/* Header do Histórico */}
            <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
              <div className="flex-1">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground">Histórico de Mensagens</h2>
                <p className="text-sm lg:text-base text-muted-foreground">
                  {sentMessages.length} mensagens enviadas
                  {selectedMessages.size > 0 && (
                    <span className="text-primary font-medium"> • {selectedMessages.size} selecionada(s)</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Botão de migração */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={migrateFromLocalStorage}
                  disabled={isMigrating}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs lg:text-sm"
                >
                  {isMigrating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 lg:h-4 lg:w-4 border-b-2 border-blue-600 lg:mr-2"></div>
                      <span className="hidden lg:inline">Migrando...</span>
                    </>
                  ) : (
                    <>
                      <History className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                      <span className="hidden lg:inline">Migrar do Local</span>
                    </>
                  )}
                </Button>
                
                {sentMessages.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectionMode}
                      className={`text-xs lg:text-sm ${isSelectionMode ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {isSelectionMode ? (
                        <>
                          <CheckSquare className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                          <span className="hidden lg:inline">Sair</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                          <span className="hidden lg:inline">Selecionar</span>
                        </>
                      )}
                    </Button>
                    {isSelectionMode && selectedMessages.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={deleteSelectedMessages}
                        className="text-white text-xs lg:text-sm"
                      >
                        <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Excluir</span>
                      </Button>
                    )}
                    {!isSelectionMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearConfirmDialog(true)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs lg:text-sm"
                      >
                        <Trash2 className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Limpar</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Lista de Mensagens */}
            {isLoadingMessages ? (
              <Card className="shadow-card">
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <h3 className="font-semibold text-foreground mb-2">Carregando histórico...</h3>
                    <p className="text-muted-foreground">Buscando mensagens no banco de dados</p>
                  </div>
                </CardContent>
              </Card>
            ) : sentMessages.length > 0 ? (
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <CardTitle>Mensagens Enviadas</CardTitle>
                    {isSelectionMode && sentMessages.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllMessages}
                          className="text-xs lg:text-sm flex-1 min-w-[120px]"
                        >
                          Selecionar Todas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deselectAllMessages}
                          className="text-xs lg:text-sm flex-1 min-w-[120px]"
                        >
                          Desmarcar Todas
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sentMessages.map((message) => {
                      const isExpanded = expandedMessages.has(message.id)
                      const isSelected = selectedMessages.has(message.id)
                      return (
                        <div 
                          key={message.id} 
                          className={`border rounded-lg p-3 lg:p-4 transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div className="flex items-start gap-2 lg:gap-3 flex-1 overflow-hidden">
                              {isSelectionMode && (
                                <button
                                  onClick={() => toggleMessageSelection(message.id)}
                                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                                  ) : (
                                    <Square className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                                  )}
                                </button>
                              )}
                              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm lg:text-base text-foreground break-words leading-snug">{message.clientName}</h3>
                                <p className="text-xs lg:text-sm text-muted-foreground break-all leading-snug">📱 {message.clientWhatsapp}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between lg:justify-end gap-2 lg:gap-3 flex-shrink-0">
                              <div className="lg:text-right">
                                <div className="flex items-center gap-1 text-xs lg:text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span className="break-words">{formatDate(message.sentAt)}</span>
                                </div>
                                <Badge variant="secondary" className="mt-1 text-xs whitespace-nowrap">
                                  Aniversário
                                </Badge>
                              </div>
                              {!isSelectionMode && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleMessageExpansion(message.id)}
                                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {isSelectionMode && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSingleMessage(message.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
                              <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                            </div>
                          )}
                          
                          {!isExpanded && (
                            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
                              <p className="text-gray-600">
                                {getMessagePreview(message.message)}
                              </p>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => toggleMessageExpansion(message.id)}
                                className="p-0 h-auto text-blue-600 hover:text-blue-700 mt-2"
                              >
                                Ver mensagem completa
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="py-12">
                  <div className="text-center">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">Nenhuma mensagem enviada</h3>
                    <p className="text-muted-foreground">
                      As mensagens de aniversário enviadas aparecerão aqui
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog de confirmação para limpar histórico */}
        <Dialog open={showClearConfirmDialog} onOpenChange={setShowClearConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Limpeza do Histórico</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja limpar todo o histórico de mensagens? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Serão removidas <strong>{sentMessages.length}</strong> mensagem(ns) do histórico.
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowClearConfirmDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={clearHistory}
                className="text-white"
              >
                Sim, Limpar Histórico
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}