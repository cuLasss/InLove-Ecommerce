import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Edit3, Trash2, Phone, Users, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { universalDataAdapter } from "@/lib/universal-data-adapter"

interface Collaborator {
  id: string
  name: string
  role: string
  whatsapp: string
  created_at: string
}

import { usePerformanceLogger } from "@/hooks/usePerformanceLogger"

export default function Colaboradoras() {
  // ✅ LOG DE PERFORMANCE
  usePerformanceLogger('Colaboradoras')
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<Collaborator | null>(null)
  
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    role: "COLAB",
    whatsapp: ""
  })
  
  const { toast } = useToast()

  // Função para formatar WhatsApp
  const formatWhatsApp = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '')
    
    // Aplica a formatação baseada no tamanho
    if (numbers.length <= 2) {
      return `(${numbers}`
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else if (numbers.length <= 10) {
      // Telefone fixo: (XX) XXXX-XXXX (8 dígitos após DDD)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
    } else if (numbers.length <= 11) {
      // Celular: (XX) XXXXX-XXXX (9 dígitos após DDD)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    } else {
      // Limita a 11 dígitos máximo
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  // Carregar colaboradoras
  const loadCollaborators = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 [Colaboradoras] Carregando colaboradoras...')
      
      const response = await universalDataAdapter.getCollaborators()
      if (response.error) {
        throw new Error(response.error.message)
      }
      const data = response.data || []
      
      console.log('✅ [Colaboradoras] Colaboradoras carregadas:', data?.length || 0)
      setCollaborators(data || [])
    } catch (error) {
      console.error('❌ [Colaboradoras] Erro geral ao carregar colaboradoras:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar colaboradoras",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCollaborators()
  }, [])

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 [Colaboradoras] Salvando colaboradora:', formData)
      
      if (editingCollaborator) {
        // Update existing collaborator
        console.log('🔄 [Colaboradoras] Atualizando colaboradora ID:', editingCollaborator.id)
        const response = await universalDataAdapter.updateCollaborator(editingCollaborator.id, {
          name: formData.name,
          role: formData.role,
          whatsapp: formData.whatsapp
        })
        if (response.error) {
          throw new Error(response.error.message)
        }
        
        console.log('✅ [Colaboradoras] Colaboradora atualizada com sucesso')
        toast({
          title: "Sucesso",
          description: "Colaboradora atualizada com sucesso!",
        })
      } else {
        // Create new collaborator
        console.log('🔄 [Colaboradoras] Criando nova colaboradora')
        const response = await universalDataAdapter.createCollaborator({
          name: formData.name,
          role: formData.role,
          whatsapp: formData.whatsapp
        })
        if (response.error) {
          throw new Error(response.error.message)
        }
        
        console.log('✅ [Colaboradoras] Colaboradora criada com sucesso')
        toast({
          title: "Sucesso",
          description: "Colaboradora cadastrada com sucesso!",
        })
      }
      
      handleOpenDialog(false)
      loadCollaborators()
    } catch (error) {
      console.error('❌ [Colaboradoras] Erro geral ao salvar colaboradora:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar colaboradora",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator)
    setFormData({
      name: collaborator.name,
      role: collaborator.role,
      whatsapp: collaborator.whatsapp
    })
    setIsDialogOpen(true)
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open)
    // Se estiver abrindo o dialog e não for edição, limpa o formulário
    if (open && !editingCollaborator) {
      setFormData({ name: "", role: "COLAB", whatsapp: "" })
    }
    // Se estiver fechando, limpa tudo
    if (!open) {
      setEditingCollaborator(null)
      setFormData({ name: "", role: "COLAB", whatsapp: "" })
    }
  }

  const handleDelete = (collaborator: Collaborator) => {
    if (collaborator.role === 'ADMIN') {
      toast({
        title: "Erro",
        description: "Não é possível remover administradores",
        variant: "destructive"
      })
      return
    }

    setCollaboratorToDelete(collaborator)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!collaboratorToDelete) return

    try {
      setIsLoading(true)
      const response = await universalDataAdapter.deleteCollaborator(collaboratorToDelete.id)
      
      if (response.error) {
        throw new Error(response.error.message)
      }
      
      toast({
        title: "Sucesso",
        description: "Colaboradora removida com sucesso!",
      })
      
      setDeleteDialogOpen(false)
      setCollaboratorToDelete(null)
      await loadCollaborators()
    } catch (error) {
      console.error('Erro ao remover colaboradora:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao remover colaboradora",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h1 className="text-xl lg:text-3xl font-bold text-foreground">Colaboradoras</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Gerencie equipe e acompanhe desempenho</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-hover w-full sm:w-auto text-sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Nova Colaboradora
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCollaborator ? "Editar Colaboradora" : "Nova Colaboradora"}
              </DialogTitle>
            </DialogHeader>
            <div className="sr-only">
              {editingCollaborator ? "Formulário para editar dados da colaboradora" : "Formulário para cadastrar nova colaboradora"}
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome da colaboradora"
                />
              </div>
              <div>
                <Label htmlFor="role">Função</Label>
                <Select value={formData.role || "COLAB"} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="COLAB">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp || ""}
                  onChange={(e) => {
                    const formatted = formatWhatsApp(e.target.value)
                    setFormData({...formData, whatsapp: formatted})
                  }}
                  placeholder="(31) 99999-9999"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite apenas números. Fixo: (XX) XXXX-XXXX | Celular: (XX) XXXXX-XXXX
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenDialog(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || !formData.name}>
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cadastro de Colaboradoras */}
      <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Colaboradoras Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando colaboradoras...</div>
              ) : collaborators.length > 0 ? (
                <div className="space-y-4">
                  {collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium">{collaborator.name}</span>
                          <Badge variant={collaborator.role === 'ADMIN' ? 'default' : 'secondary'}>
                            {collaborator.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {collaborator.whatsapp}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(collaborator)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        {collaborator.role !== 'ADMIN' && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDelete(collaborator)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Nenhuma colaboradora cadastrada</h3>
                  <p className="text-muted-foreground">Adicione colaboradoras para começar</p>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg">Remover Colaboradora</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Esta ação não pode ser desfeita
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-foreground">
              Tem certeza que deseja remover a colaboradora{" "}
              <span className="font-semibold text-foreground">
                {collaboratorToDelete?.name}
              </span>
              ?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Todos os registros e histórico desta colaboradora serão mantidos, mas ela não poderá mais acessar o sistema.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setCollaboratorToDelete(null)
              }}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Removendo..." : "Sim, Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}