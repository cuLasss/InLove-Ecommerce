/**
 * Componente Principal da Tela de Rascunho de Consignação
 * 
 * Este componente implementa a interface completa para gerenciar
 * rascunhos de consignação com o novo sistema baseado em lotes.
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { consignacaoApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { formatConsignacaoDate as formatDate } from '@/lib/date-utils'

export default function ConsignacaoLoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [codigoInput, setCodigoInput] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [consignacao, setConsignacao] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  
  // Buscar dados da consignação
  React.useEffect(() => {
    const loadConsignacao = async () => {
      if (!id) return
      
      try {
        setIsLoading(true)
        
        // Buscar todas as consignações e encontrar pelo ID
        const allConsignacoes = await consignacaoApi.getAll('RASCUNHO', 1, 100)
        const foundConsignacao = Array.isArray(allConsignacoes) 
          ? allConsignacoes.find(cons => cons.id === id) 
          : allConsignacoes?.data?.find((cons: any) => cons.id === id)
          
        if (foundConsignacao) {
          setConsignacao(foundConsignacao)
          
          // Buscar itens da consignação
          const { data: consignacaoItems } = await import('@/lib/universal-data-adapter').then(adapter => 
            adapter.default.getConsignacaoItems(id)
          )
          setItens(consignacaoItems || [])
          
          console.log('📋 Consignação encontrada:', foundConsignacao)
          console.log('📦 Itens da consignação:', consignacaoItems)
        } else {
          console.error('❌ Consignação não encontrada:', id)
        }
      } catch (error) {
        console.error('❌ Erro ao carregar consignação:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadConsignacao()
  }, [id])

  // ============================================================================
  // HANDLERS SIMPLIFICADOS PARA MODO LOCAL
  // ============================================================================

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔄 Funcionalidade de adicionar item será implementada em breve')
    setCodigoInput('')
  }

  const handleUpdateStatus = async () => {
    console.log('🔄 Funcionalidade de atualizar status será implementada em breve')
  }

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando lote...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!consignacao) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Consignação não encontrada ou não foi possível carregar os dados.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const canEdit = consignacao.status === 'RASCUNHO'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/consignado')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Lote {consignacao.codigo}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={consignacao.status === 'RASCUNHO' ? 'secondary' : 'default'}>
                {consignacao.status}
              </Badge>
              {consignacao.cliente_name && (
                <span className="text-sm text-muted-foreground">
                  Cliente: {consignacao.cliente_name}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleUpdateStatus()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Entregar
            </Button>
          </div>
        )}
      </div>

      {/* Informações do Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informações do Lote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente</Label>
              <p className="text-sm">{consignacao.cliente_name || 'Não informado'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data de Criação</Label>
              <p className="text-sm">
                {consignacao.created_at ? formatDate(consignacao.created_at) : 'Não disponível'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prazo</Label>
              <p className="text-sm">
                {consignacao.data_prevista ? formatDate(consignacao.data_prevista) : 'Não definido'}
              </p>
            </div>
          </div>
          
          {consignacao.observacao && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Observações</Label>
              <p className="text-sm text-muted-foreground">{consignacao.observacao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner/Add Item - Only show if not delivered */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Adicionar Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="codigo">Código do Produto</Label>
                <Input
                  id="codigo"
                  placeholder="Digite ou escaneie o código"
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scanner
                </Button>
                <Button 
                  type="submit" 
                  disabled={!codigoInput.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Itens do Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens do Lote ({itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {itens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum item adicionado ao lote</p>
            </div>
          ) : (
            <div className="space-y-4">
              {itens.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">Item {item.id}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Produto ID: {item.product_id}</span>
                        <span>Quantidade: {item.qty}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {item.qty} unid.
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{itens.length}</div>
              <div className="text-sm text-muted-foreground">Total de Itens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{itens.reduce((sum, item) => sum + item.qty, 0)}</div>
              <div className="text-sm text-muted-foreground">Quantidade Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{consignacao.status}</div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanner será implementado futuramente */}
    </div>
  )
}
