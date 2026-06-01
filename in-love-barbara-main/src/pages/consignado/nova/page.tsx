import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConsignacaoClientCombobox } from "@/components/ui/consignado-client-combobox"
import { ArrowLeft, Plus, Users, Calendar, Handshake } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useConsignacoes } from "@/hooks/useConsignacoes"

export default function ConsignacaoNova() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { createLote, consultoras, isCreating } = useConsignacoes()
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [selectedConsultora, setSelectedConsultora] = useState<string>("")
  const [defaultCommission, setDefaultCommission] = useState<number>(30)
  const [dataPrevista, setDataPrevista] = useState<string>("")
  const [observacao, setObservacao] = useState<string>("")

  const handleCreateLote = async () => {
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Selecione um cliente",
        variant: "destructive"
      })
      return
    }

    try {
      // Calculate default due date (15 days from now)
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 15)

      const loteData = {
        client_id: selectedClient,
        consultora_id: selectedConsultora || undefined,
        commission_default_percent: defaultCommission,
        data_prevista: dataPrevista || defaultDueDate.toISOString().split('T')[0],
        observacao: observacao || undefined,
        representative_name: "Admin",
        city: "Carandaí"
      }

      await createLote(loteData)
    } catch (error) {
      console.error('Error creating lote:', error)
    }
  }


  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/consignado/lotes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Lote de Consignação</h1>
          <p className="text-muted-foreground">Configure os dados do lote antes de adicionar produtos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Dados do Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Cliente *
            </Label>
            <ConsignacaoClientCombobox
              value={selectedClient}
              onValueChange={setSelectedClient}
              placeholder="Selecione um cliente habilitado para consignação"
            />
          </div>

          {/* Consultora (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="consultora">
              Consultora (Opcional)
            </Label>
            <Select value={selectedConsultora} onValueChange={setSelectedConsultora}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma consultora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma consultora</SelectItem>
                {consultoras.map(consultora => (
                  <SelectItem key={consultora.id} value={consultora.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{consultora.nome}</span>
                      <span className="text-sm text-muted-foreground">
                        Comissão padrão: {consultora.comissao_default_pct}%
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Comissão Padrão */}
          <div className="space-y-2">
            <Label htmlFor="commission">
              Comissão Padrão (%)
            </Label>
            <Input
              id="commission"
              type="number"
              min="0"
              max="100"
              value={defaultCommission}
              onChange={(e) => setDefaultCommission(Number(e.target.value))}
              placeholder="30"
            />
            <p className="text-sm text-muted-foreground">
              Percentual de comissão que será aplicado por padrão aos produtos
            </p>
          </div>

          {/* Data Prevista para Devolução */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data Prevista para Devolução
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-muted-foreground">
              Se não informado, será definido 15 dias a partir de hoje
            </p>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Observações
            </Label>
            <Textarea
              id="notes"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais sobre esta consignação..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline" 
              onClick={() => navigate("/consignado/lotes")}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateLote}
              disabled={isCreating || !selectedClient}
              className="flex-1 bg-primary hover:bg-primary-hover"
            >
              {isCreating ? "Criando..." : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Lote
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <strong>Próximos passos:</strong>
            <br />
            1. Após criar o lote, você poderá adicionar produtos usando o scanner
            <br />
            2. Quando estiver pronto, entregue o lote para a cliente
            <br />
            3. Registre vendas, devoluções e perdas conforme necessário
          </div>
        </CardContent>
      </Card>
    </div>
  )
}