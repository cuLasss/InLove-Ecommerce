
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScannerSheet } from "@/components/scan/ScannerSheet";
import { useScanner } from "@/hooks/useScanner";
import { ArrowLeft, Plus, ShoppingCart, FileText, QrCode } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { consignacaoApi, clientsApi } from "@/lib/api"

interface ConsignacaoItem {
  id: string
  product_id: string
  qty: number
  unit_price_cents: number
  commission_percent: number
  products: {
    id: string
    name: string
    brand: string
    size: string
    short_code: string
    stock: number
    stock_consigned: number
  }
}

interface Client {
  id: string
  name: string
  whatsapp: string
}

export default function ConsignacaoNovo() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Scanner hook
  const scanner = useScanner({
    onResult: (result) => handleScan(result.raw)
  });
  
  // State
  const [consignacaoId, setConsignacaoId] = useState<string | null>(null)
  const [step, setStep] = useState(1) // 1: Setup, 2: Scanner, 3: Review
  const [items, setItems] = useState<ConsignacaoItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [defaultCommission, setDefaultCommission] = useState<number>(30)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientsApi.getByType("CONSIGNADO")
      setClients(data)
    } catch (error) {
      console.error("Error loading clients:", error)
    }
  }

  const loadConsignacaoItems = async () => {
    if (!consignacaoId) return
    try {
      const data = await consignacaoApi.getItems(consignacaoId)
      setItems(data)
    } catch (error) {
      console.error("Error loading consignacao items:", error)
    }
  }

  const handleStartConsignacao = async () => {
    if (!selectedClient) {
      toast({
        title: "Erro",
        description: "Selecione um cliente",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const consignacaoData = {
        client_id: selectedClient,
        status: "RASCUNHO",
        commission_default_percent: defaultCommission,
        representative_name: "Admin",
        city: "Carandaí"
      }

      const consignacao = await consignacaoApi.create(consignacaoData)
      setConsignacaoId(consignacao.id)
      setStep(2)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao iniciar consignação",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleScan = async (code: string) => {
    if (!consignacaoId) return

    try {
      const item = await consignacaoApi.addItem(consignacaoId, code)
      await loadConsignacaoItems()
      
      toast({
        title: "Produto adicionado",
        description: `${item.products.name} - Qtd: ${item.qty}`,
      })
    } catch (error: any) {
      toast({
        title: "Erro", 
        description: error.message || "Produto não encontrado ou sem estoque",
        variant: "destructive"
      })
    }
  }

  const handleUpdateCommission = (itemId: string, commission: number) => {
    setItems(items.map(item => 
      item.id === itemId ? { ...item, commission_percent: commission } : item
    ))
  }

  const calculateTotals = () => {
    const itemsTotal = items.reduce((acc, item) => acc + (item.unit_price_cents * item.qty), 0)
    const commissionTotal = items.reduce((acc, item) => {
      const itemTotal = item.unit_price_cents * item.qty
      const commission = item.commission_percent || defaultCommission
      return acc + (itemTotal * commission / 100)
    }, 0)
    
    return { itemsTotal, commissionTotal }
  }

  const handleCreateFolha = async () => {
    if (!consignacaoId) return

    try {
      setIsLoading(true)
      await consignacaoApi.createFinal(consignacaoId)
      
      toast({
        title: "Folha criada",
        description: "Consignação criada com sucesso",
      })
      
      navigate(`/consignado/${consignacaoId}`)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar folha",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/consignado")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Novo Consignado</h1>
              <p className="text-muted-foreground">Passo 1: Dados da consignação</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuração da Consignação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente do tipo CONSIGNADO" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.whatsapp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comissão Padrão (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(Number(e.target.value))}
                />
              </div>

              <Button 
                onClick={handleStartConsignacao}
                disabled={isLoading || !selectedClient}
                className="w-full bg-primary hover:bg-primary-hover"
              >
                {isLoading ? "Iniciando..." : "Iniciar Scanner"}
              </Button>
            </CardContent>
          </Card>
        </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Scanner de Produtos</h1>
                <p className="text-muted-foreground">Passo 2: Adicione produtos para consignação</p>
              </div>
            </div>
            <Button 
              onClick={() => setStep(3)}
              disabled={items.length === 0}
              className="bg-primary hover:bg-primary-hover"
            >
              Conferir Pedido ({items.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner */}
            <div className="flex justify-center">
              <Button onClick={scanner.open} size="lg" className="w-full max-w-sm">
                <QrCode className="h-5 w-5 mr-2" />
                Abrir Scanner
              </Button>
            </div>
            <ScannerSheet {...scanner.props} />

            {/* Items List */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos Selecionados ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{item.products.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.products.brand} • {item.products.size} • {item.products.short_code}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Restam: {item.products.stock} • Consignado: {item.products.stock_consigned}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">R$ {(item.unit_price_cents / 100).toFixed(2)}</div>
                          <div className="text-sm">Qtd: {item.qty}</div>
                          <div className="text-sm text-blue-600">
                            {item.commission_percent || defaultCommission}% comissão
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        Total da Nota: R$ {(calculateTotals().itemsTotal / 100).toFixed(2)}
                      </div>
                      <div className="text-lg font-semibold text-primary">
                        Total Comissão: R$ {(calculateTotals().commissionTotal / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Escaneie produtos para adicionar à consignação
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    )
  }

  // Step 3: Review
  const { itemsTotal, commissionTotal } = calculateTotals()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setStep(2)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Revisar Consignação</h1>
            <p className="text-muted-foreground">Passo 3: Revise e crie a folha</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Produtos ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.products.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.products.brand} • {item.products.size} • R$ {(item.unit_price_cents / 100).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Qtd</div>
                        <div className="font-medium">{item.qty}</div>
                      </div>

                      <div className="w-20">
                        <Label className="text-xs">% Comissão</Label>
                        <Input
                          type="number"
                          value={item.commission_percent || defaultCommission}
                          onChange={(e) => handleUpdateCommission(item.id, Number(e.target.value))}
                          className="text-xs"
                        />
                      </div>

                      <div className="text-right min-w-[80px]">
                        <div className="font-semibold">
                          R$ {(item.unit_price_cents * item.qty / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600">
                          Comissão: R$ {((item.unit_price_cents * item.qty * (item.commission_percent || defaultCommission) / 100) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Consignação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total da Nota:</span>
                    <span className="font-semibold">R$ {(itemsTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Comissão:</span>
                    <span className="font-semibold text-primary">R$ {(commissionTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Comissão Média:</span>
                    <span>{items.length > 0 ? ((commissionTotal / itemsTotal) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateFolha}
                  disabled={isLoading || items.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? "Criando..." : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Criar Folha
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  Após criar a folha, o status mudará para "Com a cliente"
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}