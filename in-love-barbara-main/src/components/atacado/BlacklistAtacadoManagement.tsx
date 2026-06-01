/**
 * Componente: Gerenciamento de Blacklist do Atacado
 * 
 * Interface para gerenciar clientes bloqueados no atacado
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Shield, 
  Plus, 
  User,
  CheckCircle,
  Calendar,
  ArrowLeft,
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDateSafe } from '@/lib/date-utils'
import { useBlacklistAtacado, type BlacklistFormData } from '@/hooks/useBlacklistAtacado'

interface BlacklistAtacadoManagementProps {
  onBack?: () => void
}

export function BlacklistAtacadoManagement({ onBack }: BlacklistAtacadoManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [formData, setFormData] = useState<BlacklistFormData>({
    client_id: '',
    client_name: '',
    client_type: 'ATACADO',
    reason: '',
    days_blocked: 0
  })
  
  const { toast } = useToast()
  const { 
    clients,
    blacklistEntries, 
    isLoading, 
    isClientBlocked,
    getBlockStatus,
    addToBlacklist,
    removeFromBlacklist,
    isAdding,
    isRemoving,
    refreshData
  } = useBlacklistAtacado()

  const handleAddToBlacklist = async () => {
    await addToBlacklist(formData)
    setIsAddDialogOpen(false)
    setFormData({ client_id: '', client_name: '', client_type: 'ATACADO', reason: '', days_blocked: 0 })
    setClientSearchTerm('') // Limpar busca após bloquear
    // A lista de clientes será atualizada automaticamente via invalidação de queries no hook
  }

  const handleRemoveFromBlacklist = async () => {
    if (!selectedClient) return
    
    console.log('🔍 [BlacklistAtacadoManagement] Iniciando desbloqueio para cliente:', selectedClient)
    console.log('🔍 [BlacklistAtacadoManagement] Blacklist entries antes:', blacklistEntries.map(e => ({ id: e.id, client_id: e.client_id, client_name: e.client_name })))
    
    try {
      await removeFromBlacklist(selectedClient)
      console.log('✅ [BlacklistAtacadoManagement] Desbloqueio concluído com sucesso')
      
      // Limpar o estado do cliente selecionado
      setSelectedClient(null)
      
      // O toast já é mostrado pelo hook useBlacklistAtacado
      console.log('✅ [BlacklistAtacadoManagement] Estado limpo')
    } catch (error: any) {
      console.error('❌ [BlacklistAtacadoManagement] Erro no desbloqueio:', error)
      // O toast de erro já é mostrado pelo hook useBlacklistAtacado
    }
  }

  const selectClient = (client: any) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_name: client.name,
      client_type: 'ATACADO'
    }))
  }

  // Debug: Log dos clientes disponíveis
  console.log('🔍 [BlacklistAtacadoManagement] Total de clientes do atacado:', clients.length)
  console.log('🔍 [BlacklistAtacadoManagement] Clientes:', clients.map(c => ({ 
    id: c.id, 
    name: c.name, 
    types: c.types 
  })))
  
  // Filtrar clientes baseado no termo de busca
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    (client.whatsapp && client.whatsapp.includes(clientSearchTerm))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando blacklist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 to-white min-h-screen p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5 md:p-6">
        <div className="flex flex-col desktop:flex-row desktop:items-center desktop:justify-between gap-4 desktop:gap-6">
          <div className="space-y-3 sm:space-y-4 flex-1 min-w-0 w-full desktop:w-auto">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="p-1.5 sm:p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            <div className="space-y-2 sm:space-y-3 text-center desktop:text-left">
              <div className="flex flex-col items-center desktop:flex-row desktop:items-center gap-3 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-red-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 text-red-600 flex-shrink-0" />
                </div>
                <div className="flex-1 min-w-0 w-full desktop:w-auto">
                  <h1 className="text-base sm:text-lg md:text-xl desktop:text-2xl font-bold text-slate-900 leading-tight text-center desktop:text-left px-2 desktop:px-0" style={{ wordBreak: 'normal', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
                    Blacklist de Clientes - Atacado
                  </h1>
                  <p className="text-xs sm:text-sm desktop:text-base text-slate-600 leading-relaxed mt-1 text-center desktop:text-left px-2 desktop:px-0" style={{ wordBreak: 'normal', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
                    Gerencie clientes bloqueados no atacado
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center desktop:justify-end gap-2 sm:gap-3 desktop:gap-4 w-full desktop:w-auto">
            <Button 
              variant="outline" 
              onClick={refreshData}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs sm:text-sm w-full sm:w-auto whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Atualizar</span>
              <span className="sm:hidden">Atual.</span>
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm w-full sm:w-auto whitespace-nowrap">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Bloquear Cliente</span>
                  <span className="sm:hidden">Bloquear</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="pb-2 sm:pb-3">
                <DialogTitle className="text-base sm:text-lg break-words leading-tight">Adicionar Cliente à Blacklist</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Seleção de cliente do atacado */}
                <div className="space-y-2">
                  <Label htmlFor="client-search" className="text-xs sm:text-sm">Selecionar Cliente do Atacado</Label>
                  <div className="relative">
                    <Search className={`absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 pointer-events-none transition-opacity duration-200 z-10 ${clientSearchTerm ? 'opacity-0' : 'opacity-100'}`} />
                    <Input
                      id="client-search"
                      placeholder="Digite o nome do cliente do atacado..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="pl-9 sm:pl-11 pr-4 text-xs sm:text-sm h-8 sm:h-9"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                  
                  {/* Lista de clientes filtrados */}
                  {clientSearchTerm && (
                    <div className="max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm">
                          Nenhum cliente encontrado
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className="p-2 sm:p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              selectClient(client)
                              setClientSearchTerm('')
                            }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs sm:text-sm text-gray-900 break-words leading-tight">{client.name}</div>
                                {client.whatsapp && (
                                  <div className="text-[10px] sm:text-xs text-gray-500 break-words leading-tight mt-0.5">{client.whatsapp}</div>
                                )}
                                {client.city && (
                                  <div className="text-[10px] sm:text-xs text-gray-500 break-words leading-tight mt-0.5">{client.city}</div>
                                )}
                              </div>
                              <div className="text-[10px] sm:text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap flex-shrink-0 w-fit">
                                ATACADO
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {clients.length === 0 && !isLoading && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs sm:text-sm text-yellow-800 break-words leading-tight">
                          {blacklistEntries.length > 0 
                            ? "Todos os clientes do atacado já estão bloqueados ou não há clientes cadastrados com o tipo ATACADO."
                            : "Nenhum cliente do atacado encontrado. Certifique-se de que existem clientes cadastrados com o tipo ATACADO."
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cliente selecionado */}
                {formData.client_name && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="font-medium text-xs sm:text-sm text-green-800 break-words leading-tight flex-1">
                        Cliente selecionado: {formData.client_name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Motivo do bloqueio */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-xs sm:text-sm">Motivo do Bloqueio *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Descreva o motivo do bloqueio..."
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                  />
                </div>

                {/* Dias de bloqueio */}
                <div className="space-y-2">
                  <Label htmlFor="days" className="text-xs sm:text-sm">Dias de Bloqueio</Label>
                  <Input
                    id="days"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.days_blocked || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, days_blocked: parseInt(e.target.value) || 0 }))}
                    placeholder="Digite o número de dias"
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  />
                  <p className="text-[10px] sm:text-xs text-gray-500 break-words leading-tight">
                    {formData.days_blocked > 0 
                      ? `O cliente ficará bloqueado por ${formData.days_blocked} dias`
                      : 'Digite o número de dias para o bloqueio'
                    }
                  </p>
                </div>

                {/* Botões */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    className="text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddToBlacklist}
                    disabled={isAdding || !formData.client_id || !formData.reason || formData.days_blocked < 1}
                    className="bg-red-600 hover:bg-red-700 text-xs sm:text-sm w-full sm:w-auto"
                  >
                    {isAdding ? 'Bloqueando...' : (
                      <>
                        <span className="hidden sm:inline">Bloquear Cliente</span>
                        <span className="sm:hidden">Bloquear</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Lista de clientes bloqueados */}
      <Card className="shadow-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
            <span className="break-words leading-tight">Clientes Bloqueados ({blacklistEntries.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {blacklistEntries.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <h3 className="font-semibold text-xs sm:text-sm md:text-base text-foreground mb-1 sm:mb-2 break-words leading-tight">
                Nenhum cliente bloqueado
              </h3>
              <p className="text-xs sm:text-sm break-words leading-tight">
                Adicione clientes à blacklist para protegê-los de golpistas
              </p>
            </div>
          ) : (
            <>
              {/* Tabela - Desktop (>= 1440px) */}
              <div className="hidden 2xl:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                      <TableHead className="text-xs sm:text-sm">Motivo</TableHead>
                      <TableHead className="text-xs sm:text-sm">Bloqueado em</TableHead>
                      <TableHead className="text-xs sm:text-sm">Bloqueado até</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklistEntries.map((entry) => {
                      const blockStatus = getBlockStatus(entry)
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                              <span className="break-words leading-tight">{entry.client_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <span className="text-gray-600 break-words leading-tight max-w-[200px] block" title={entry.reason}>
                              {entry.reason}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                            {formatDateSafe(entry.blocked_at, "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                              {formatDateSafe(entry.blocked_until, "dd/MM/yyyy HH:mm")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${blockStatus.color} text-xs whitespace-nowrap`}>
                              {blockStatus.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClient(entry.client_id)
                                  }}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs sm:text-sm"
                                >
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                                  Desbloquear
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                                <AlertDialogHeader className="pb-2 sm:pb-3">
                                  <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg break-words leading-tight">
                                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                                    Desbloquear Cliente
                                  </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3">
                    <p className="text-xs sm:text-sm break-words leading-tight">
                      Tem certeza que deseja desbloquear <strong>{entry.client_name}</strong>?
                    </p>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm font-medium text-yellow-800 mb-1 break-words leading-tight">
                        Detalhes do Bloqueio:
                      </div>
                      <div className="text-xs sm:text-sm text-yellow-700 space-y-1 break-words leading-tight">
                        <div><strong>Motivo:</strong> {entry.reason}</div>
                        <div><strong>Bloqueado em:</strong> {new Date(entry.blocked_at).toLocaleDateString('pt-BR')}</div>
                        <div><strong>Bloqueio até:</strong> {new Date(entry.blocked_until).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm font-medium text-green-800 break-words leading-tight">
                        ⚠️ Esta ação permitirá que o cliente volte a fazer compras no atacado imediatamente.
                      </div>
                    </div>
                  </div>
                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                                <AlertDialogCancel className="text-xs sm:text-sm w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleRemoveFromBlacklist}
                                  className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm w-full sm:w-auto"
                                  disabled={isRemoving}
                                >
                                  {isRemoving ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2 flex-shrink-0"></div>
                                      Desbloqueando...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                                      Confirmar Desbloqueio
                                    </>
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Cards - Mobile/Tablet/Desktop (< 1440px) */}
            <div className="2xl:hidden space-y-3 sm:space-y-4">
              {blacklistEntries.map((entry) => {
                const blockStatus = getBlockStatus(entry)
                return (
                  <div key={entry.id} className="border border-red-200 rounded-lg p-2 xs:p-3 sm:p-4 bg-red-50 hover:bg-red-100 transition-colors overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-2 xs:gap-3 mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5 xs:gap-2 flex-1 min-w-0 overflow-hidden">
                        <User className="h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-medium text-[11px] xs:text-xs sm:text-sm text-gray-900 break-words leading-tight">{entry.client_name}</h3>
                          <Badge className={`${blockStatus.color} text-[9px] xs:text-[10px] sm:text-xs mt-1 whitespace-nowrap w-fit`}>
                            {blockStatus.text}
                          </Badge>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedClient(entry.client_id)
                            }}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 text-[10px] xs:text-xs px-2 py-1 h-auto flex-shrink-0 w-full xs:w-auto"
                          >
                            <CheckCircle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-1 flex-shrink-0" />
                            <span className="hidden icon:inline">Desbloquear</span>
                            <span className="icon:hidden">Desbl.</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                          <AlertDialogHeader className="pb-2 sm:pb-3">
                            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg break-words leading-tight">
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                              Desbloquear Cliente
                            </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3">
                    <p className="text-xs sm:text-sm break-words leading-tight">
                      Tem certeza que deseja desbloquear <strong>{entry.client_name}</strong>?
                    </p>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm font-medium text-yellow-800 mb-1 break-words leading-tight">
                        Detalhes do Bloqueio:
                      </div>
                      <div className="text-xs sm:text-sm text-yellow-700 space-y-1 break-words leading-tight">
                        <div><strong>Motivo:</strong> {entry.reason}</div>
                        <div><strong>Bloqueado em:</strong> {new Date(entry.blocked_at).toLocaleDateString('pt-BR')}</div>
                        <div><strong>Bloqueio até:</strong> {new Date(entry.blocked_until).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                      <div className="text-xs sm:text-sm font-medium text-green-800 break-words leading-tight">
                        ⚠️ Esta ação permitirá que o cliente volte a fazer compras no atacado imediatamente.
                      </div>
                    </div>
                  </div>
                </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                            <AlertDialogCancel className="text-xs sm:text-sm w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRemoveFromBlacklist}
                              className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm w-full sm:w-auto"
                              disabled={isRemoving}
                            >
                              {isRemoving ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2 flex-shrink-0"></div>
                                  Desbloqueando...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                                  Confirmar Desbloqueio
                                </>
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                  {/* Informações */}
                  <div className="space-y-2 xs:space-y-2 sm:space-y-3">
                    {/* Motivo */}
                    <div>
                      <div className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 mb-0.5 xs:mb-1 whitespace-nowrap font-medium">Motivo:</div>
                      <div className="text-[11px] xs:text-xs sm:text-sm text-gray-700 break-words leading-tight">{entry.reason}</div>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-1 icon:grid-cols-2 gap-1.5 xs:gap-2 sm:gap-3">
                      <div>
                        <div className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 mb-0.5 xs:mb-1 whitespace-nowrap font-medium">Bloqueado em:</div>
                        <div className="text-[11px] xs:text-xs sm:text-sm text-gray-700 break-words leading-tight">
                          {formatDateSafe(entry.blocked_at, "dd/MM/yyyy HH:mm")}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 mb-0.5 xs:mb-1">
                          <Calendar className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                          <div className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 whitespace-nowrap font-medium">Bloqueado até:</div>
                        </div>
                        <div className="text-[11px] xs:text-xs sm:text-sm text-gray-700 break-words leading-tight pl-0 icon:pl-3.5 sm:pl-6">
                          {formatDateSafe(entry.blocked_until, "dd/MM/yyyy HH:mm")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
