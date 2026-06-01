import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FastConsignacaoClientCombobox } from "@/components/ui/fast-consignado-client-combobox"
import { useConsignacoes } from "@/hooks/useConsignacoes"
import { format } from "date-fns"

interface NewDraftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDraftModal({ open, onOpenChange }: NewDraftModalProps) {
  const [clientId, setClientId] = useState<string>("")
  const [prazoPrevisto, setPrazoPrevisto] = useState<string>("")
  const [observacao, setObservacao] = useState<string>("")

  const { createLote } = useConsignacoes()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clientId) return

    // Validar se prazo previsto não está no passado
    if (prazoPrevisto) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const prazoDate = new Date(prazoPrevisto)
      
      if (prazoDate < hoje) {
        return // Será tratado pela validação visual
      }
    }

    try {
      console.log('🔄 [NewDraftModal] Tentando criar lote com:', JSON.stringify({
        client_id: clientId,
        data_prevista: prazoPrevisto || undefined,
        observacao: observacao || undefined
      }, null, 2))
      
      await createLote({
        client_id: clientId,
        data_prevista: prazoPrevisto || undefined, // Corrected column name
        observacao: observacao || undefined
      })
      
      // Limpar formulário e fechar modal apenas se sucesso
      setClientId("")
      setPrazoPrevisto("")
      setObservacao("")
      onOpenChange(false)
    } catch (error) {
      console.error('❌ [NewDraftModal] Erro ao criar lote:', error)
      // Não limpar formulário em caso de erro
    }
  }

  const isFormValid = clientId && (!prazoPrevisto || new Date(prazoPrevisto).getTime() >= new Date().setHours(0, 0, 0, 0))
  const isPrazoInvalido = prazoPrevisto && new Date(prazoPrevisto).getTime() < new Date().setHours(0, 0, 0, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[425px] max-w-[95vw] sm:max-w-[425px] max-h-[95vh] overflow-y-auto overflow-x-visible p-4 sm:p-5 md:p-6">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg break-words whitespace-normal hyphens-none leading-tight sm:leading-normal">
            Nova Folha de Consignação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="client" className="text-xs sm:text-sm">Cliente (Consultora) *</Label>
            <FastConsignacaoClientCombobox
              value={clientId}
              onValueChange={setClientId}
              placeholder="Selecione uma cliente consignado..."
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="prazo" className="text-xs sm:text-sm">Prazo Previsto</Label>
            <Input
              id="prazo"
              type="date"
              value={prazoPrevisto}
              onChange={(e) => setPrazoPrevisto(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className={`text-xs sm:text-sm h-9 sm:h-10 ${isPrazoInvalido ? "border-destructive" : ""}`}
            />
            {isPrazoInvalido && (
              <p className="text-[10px] sm:text-xs text-destructive break-words whitespace-normal leading-tight">
                O prazo previsto não pode ser anterior à data atual
              </p>
            )}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="observacao" className="text-xs sm:text-sm">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
              className="text-xs sm:text-sm min-h-[80px] sm:min-h-[100px] resize-none"
            />
          </div>

          <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid}
              className="bg-primary hover:bg-primary-hover w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
            >
              Criar Rascunho
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}