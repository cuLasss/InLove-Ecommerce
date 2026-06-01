/**
 * Componente: Itens Já Salvos da Folha - Design Compacto
 * 
 * Interface limpa e moderna seguindo estética compacta do site
 */

import React, { useState, useEffect } from 'react'

// Função auxiliar para obter chave do localStorage baseada no folhaCodigo
const getCommissionStorageKey = (folhaCodigo: string) => `commissions_${folhaCodigo}`

// Função auxiliar para limpar comissões de uma folha específica
export const clearCommissionsForFolha = (folhaCodigo: string) => {
  try {
    const storageKey = getCommissionStorageKey(folhaCodigo)
    const globalStorageKey = `global_commission_${folhaCodigo}`
    localStorage.removeItem(storageKey)
    localStorage.removeItem(globalStorageKey)
    console.log('🧹 [ItensJaSalvos] Comissões limpas para folha:', folhaCodigo)
  } catch (error) {
    console.error('❌ [ItensJaSalvos] Erro ao limpar comissões:', error)
  }
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Package, 
  Minus, 
  Plus, 
  Trash2,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Settings,
  Calculator,
  TrendingDown,
  TrendingUp,
  Check,
  Edit3,
  Percent
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useFolhaConsignacao } from '@/hooks/useFolhaConsignacao'
import { useToast } from '@/hooks/use-toast'

interface ItensJaSalvosProps {
  folhaCodigo: string
  onItemUpdated?: () => void
}

export function ItensJaSalvos({ folhaCodigo, onItemUpdated }: ItensJaSalvosProps) {
  const [itemCommissions, setItemCommissions] = useState<Record<string, number>>({})
  const [globalCommission, setGlobalCommission] = useState<string>('15')
  const [isEditingGlobal, setIsEditingGlobal] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const { toast } = useToast()

  // Carregar comissões salvas do localStorage quando o componente montar
  useEffect(() => {
    try {
      const storageKey = getCommissionStorageKey(folhaCodigo)
      const savedCommissions = localStorage.getItem(storageKey)
      if (savedCommissions) {
        const parsedCommissions = JSON.parse(savedCommissions)
        // Validar se os dados carregados são válidos
        if (typeof parsedCommissions === 'object' && parsedCommissions !== null) {
          setItemCommissions(parsedCommissions)
          console.log('📊 [ItensJaSalvos] Comissões carregadas para folha', folhaCodigo, ':', parsedCommissions)
        } else {
          console.warn('⚠️ [ItensJaSalvos] Dados de comissão inválidos no localStorage:', parsedCommissions)
        }
      } else {
        console.log('📊 [ItensJaSalvos] Nenhuma comissão salva encontrada para folha', folhaCodigo)
      }
    } catch (error) {
      console.error('❌ [ItensJaSalvos] Erro ao carregar comissões:', error)
      // Em caso de erro, limpar dados corrompidos
      try {
        const storageKey = getCommissionStorageKey(folhaCodigo)
        localStorage.removeItem(storageKey)
        console.log('🧹 [ItensJaSalvos] Dados corrompidos removidos')
      } catch (cleanupError) {
        console.error('❌ [ItensJaSalvos] Erro ao limpar dados corrompidos:', cleanupError)
      }
    }
  }, [folhaCodigo])

  // Salvar comissões no localStorage sempre que elas mudarem
  useEffect(() => {
    try {
      // Não salvar se ainda não há itens (componente inicializando)
      if (Object.keys(itemCommissions).length === 0) {
        return
      }
      
      const storageKey = getCommissionStorageKey(folhaCodigo)
      localStorage.setItem(storageKey, JSON.stringify(itemCommissions))
      console.log('💾 [ItensJaSalvos] Comissões salvas para folha', folhaCodigo, ':', itemCommissions)
    } catch (error) {
      console.error('❌ [ItensJaSalvos] Erro ao salvar comissões:', error)
    }
  }, [itemCommissions, folhaCodigo])

  // Salvar comissão global no localStorage
  useEffect(() => {
    try {
      const globalStorageKey = `global_commission_${folhaCodigo}`
      localStorage.setItem(globalStorageKey, globalCommission)
      console.log('💾 [ItensJaSalvos] Comissão global salva:', globalCommission)
    } catch (error) {
      console.error('❌ [ItensJaSalvos] Erro ao salvar comissão global:', error)
    }
  }, [globalCommission, folhaCodigo])

  // Carregar comissão global salva do localStorage
  useEffect(() => {
    try {
      const globalStorageKey = `global_commission_${folhaCodigo}`
      const savedGlobalCommission = localStorage.getItem(globalStorageKey)
      if (savedGlobalCommission) {
        setGlobalCommission(savedGlobalCommission)
        console.log('📊 [ItensJaSalvos] Comissão global carregada:', savedGlobalCommission)
      }
    } catch (error) {
      console.error('❌ [ItensJaSalvos] Erro ao carregar comissão global:', error)
    }
  }, [folhaCodigo])
  
  const { 
    folhaData, 
    isLoading, 
    error, 
    isAddingItem, 
    isRemovingItem,
    addItem, 
    removeItem, 
    refreshData 
  } = useFolhaConsignacao({ folhaCodigo })

  const items = folhaData?.items || []
  const totalItems = folhaData?.total_items || 0
  const totalValue = folhaData?.total_value_cents || 0

  // Agrupar itens por produto_id para evitar duplicação
  const groupedItems = items.reduce((acc: any[], item: any) => {
    const existingItem = acc.find(group => group.product_id === item.product_id)
    
    if (existingItem) {
      existingItem.qty += item.qty
      existingItem.subtotal_cents = existingItem.preco_base_cents * existingItem.qty
    } else {
      acc.push({ 
        ...item,
        commissionId: `group_${item.product_id}`
      })
    }
    
    return acc
  }, [])

  // Recalcular totais baseados nos itens agrupados
  const recalculatedTotalItems = groupedItems.reduce((sum, item) => sum + item.qty, 0)
  const recalculatedTotalValue = groupedItems.reduce((sum, item) => sum + item.subtotal_cents, 0)

  // NÃO inicializar comissões automaticamente - deixar que o usuário defina quando necessário

  // Função para aplicar comissão global
  const handleApplyGlobalCommission = async () => {
    const commissionValue = parseFloat(globalCommission)
    
    // Se valor está vazio ou inválido, reseta para padrão
    if (isNaN(commissionValue) || globalCommission === '') {
      setIsEditingGlobal(false)
      return
    }
    
    if (commissionValue < 0 || commissionValue > 100) {
      toast({
        title: "❌ Valor inválido",
        description: "A comissão deve estar entre 0% e 100%",
        variant: "destructive"
      })
      return
    }
    
    try {
      // ATUALIZAÇÃO IMEDIATA DO ESTADO LOCAL (para feedback visual instantâneo)
      const newCommissions: Record<string, number> = {}
      if (groupedItems) {
        groupedItems.forEach((item: any) => {
          newCommissions[item.commissionId] = commissionValue
        })
      }
      setItemCommissions(newCommissions)
      setIsEditingGlobal(false)

      // SALVAMENTO NO BANCO EM SEGUNDO PLANO (async)
      const saveToDatabase = async () => {
        try {
          // Buscar consignacao_id da folha atual
          const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
          const { data: consignacoes } = await universalDataAdapter.getConsignacoes()
          const consignacao = consignacoes?.find((c: any) => c.codigo === folhaCodigo)
          
          if (!consignacao) {
            console.error('❌ [ItensJaSalvos] Consignação não encontrada:', folhaCodigo)
            return
          }

          // Atualizar no banco de dados para cada item
          const { consignacaoApi } = await import('@/lib/api')
          
          for (const item of groupedItems) {
            await consignacaoApi.updateItemCommission(item.commissionId, commissionValue, item.product_id, consignacao.id)
          }
          
          console.log('✅ [ItensJaSalvos] Comissões globais salvas no banco:', { commissionValue, totalItems: groupedItems.length })
          
          // Toast de confirmação
          toast({
            title: "✅ Comissão aplicada globalmente",
            description: `Comissão de ${commissionValue}% aplicada a ${groupedItems.length} item(s)`,
            duration: 3000
          })
        } catch (error) {
          console.error('❌ [ItensJaSalvos] Erro ao salvar comissões globais no banco:', error)
          toast({
            title: "❌ Erro ao salvar comissões",
            description: "As comissões foram aplicadas localmente, mas houve erro ao salvar no banco",
            variant: "destructive"
          })
        }
      }

      // Executar salvamento em segundo plano
      saveToDatabase()
      
    } catch (error) {
      console.error('❌ [ItensJaSalvos] Erro ao aplicar comissão global:', error)
      toast({
        title: "❌ Erro ao aplicar comissão",
        description: "Tente novamente",
        variant: "destructive"
      })
    }
  }

  // Função para atualizar comissão individual
  const handleUpdateCommission = async (itemId: string, value: string) => {
    try {
      // Encontrar o item agrupado para obter product_id
      const groupedItem = groupedItems.find(item => item.commissionId === itemId)
      if (!groupedItem) {
        console.error('❌ [ItensJaSalvos] Item agrupado não encontrado:', itemId)
        return
      }

      // ATUALIZAÇÃO IMEDIATA DO ESTADO LOCAL (para feedback visual instantâneo)
      if (value === '' || value === '0') {
        // Se campo vazio ou zero, remove o item das comissões para usar padrão
        setItemCommissions(prev => {
          const newCommissions = { ...prev }
          delete newCommissions[itemId]
          return newCommissions
        })
      } else {
        const parsedValue = parseFloat(value)
        if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
          setItemCommissions(prev => ({
            ...prev,
            [itemId]: parsedValue
          }))
        }
      }

      // SALVAMENTO NO BANCO EM SEGUNDO PLANO (async)
      const saveToDatabase = async () => {
        try {
          // Buscar consignacao_id da folha atual
          const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
          const { data: consignacoes } = await universalDataAdapter.getConsignacoes()
          const consignacao = consignacoes?.find((c: any) => c.codigo === folhaCodigo)
          
          if (!consignacao) {
            console.error('❌ [ItensJaSalvos] Consignação não encontrada:', folhaCodigo)
            return
          }

          const commissionValue = value === '' || value === '0' ? 0 : parseFloat(value)
          
          // Atualizar no banco de dados
          const { consignacaoApi } = await import('@/lib/api')
          await consignacaoApi.updateItemCommission(itemId, commissionValue, groupedItem.product_id, consignacao.id)
          
          console.log('✅ [ItensJaSalvos] Comissão salva no banco:', { itemId, commissionValue })
          
          // Toast de confirmação
          toast({
            title: "✅ Comissão atualizada",
            description: `Comissão definida como ${commissionValue}%`,
            duration: 2000
          })
    } catch (error) {
          console.error('❌ [ItensJaSalvos] Erro ao salvar comissão no banco:', error)
        }
      }

      // Executar salvamento em segundo plano
      saveToDatabase()
      
    } catch (error) {
      console.error('❌ [ItensJaSalvos] Erro ao atualizar comissão:', error)
    }
  }

  // Função para obter a comissão de um item (converte para decimal)
  const getCommissionDecimal = (itemId: string) => {
    // Se não há comissão definida, retorna 0 (sem comissão)
    return (itemCommissions[itemId] || 0) / 100
  }

  // Função para calcular o valor líquido considerando a comissão customizada
  const calculateNetValue = (itemId: string, subtotal: number) => {
    const commissionRate = 1 - getCommissionDecimal(itemId)
    return subtotal * commissionRate
  }

  // Função para calcular o valor da comissão
  const calculateCommissionValue = (itemId: string, subtotal: number) => {
    return subtotal * getCommissionDecimal(itemId)
  }

  // Calcular totais de comissão e líquido
  const totalCommissionValue = groupedItems.reduce((sum, item) => 
    sum + calculateCommissionValue(item.commissionId, item.subtotal_cents / 100), 0
  )
  const totalNetValue = groupedItems.reduce((sum, item) => 
    sum + calculateNetValue(item.commissionId, item.subtotal_cents / 100), 0
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Carregando itens salvos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center justify-center p-6">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700 mr-4">Erro ao carregar itens: {error}</span>
          <Button onClick={refreshData} variant="outline" size="sm" className="text-red-700 border-red-300">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="consignado-itens-ja-salvos bg-white shadow-sm">
      {/* Header Compacto */}
      <CardHeader className="pb-3 px-4 sm:px-4 md:px-5 lg:px-5 xl:px-6">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 xl:gap-4">
          <div className="flex items-center gap-2 sm:gap-2 md:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 sm:h-4 sm:w-4 md:h-4 md:w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 break-words whitespace-normal hyphens-none leading-tight">Itens Já Salvos</h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-slate-700 whitespace-nowrap">{recalculatedTotalItems} item{recalculatedTotalItems !== 1 ? 's' : ''} confirmado{recalculatedTotalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          {/* Controle Global Compacto */}
          <div className="consignado-global-controls flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
            <div className="consignado-commission-control flex items-center gap-1.5 sm:gap-1.5 md:gap-2 bg-slate-50 px-2 sm:px-2 md:px-3 py-1.5 sm:py-1.5 md:py-2 rounded-lg border border-slate-200 flex-1 sm:flex-initial">
              <Calculator className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
              {isEditingGlobal ? (
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-1">
                  <Input
                    type="number"
                    value={globalCommission}
                    onChange={(e) => {
                      const value = e.target.value
                      setGlobalCommission(value === '' ? '' : e.target.value)
                    }}
                    min="0"
                    max="100"
                    className="w-12 sm:w-16 md:w-16 h-7 sm:h-8 md:h-8 text-center border-0 bg-white text-slate-900 font-semibold text-[10px] sm:text-xs md:text-sm flex-1 sm:flex-initial"
                    placeholder="15"
                    autoFocus
                  />
                  <Check 
                    className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-green-600 cursor-pointer hover:text-green-700 flex-shrink-0"
                    onClick={handleApplyGlobalCommission}
                  />
                  <button 
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0"
                    onClick={() => setIsEditingGlobal(false)}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm sm:text-base md:text-lg font-bold text-blue-700 whitespace-nowrap flex-1 sm:flex-initial text-center sm:text-left">{globalCommission}%</span>
                  <button 
                    className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                    onClick={() => setIsEditingGlobal(true)}
                  >
                    <Edit3 className="h-3 w-3 text-slate-600" />
                  </button>
                  <Button
                    size="sm"
                    onClick={handleApplyGlobalCommission}
                    className="bg-blue-500 hover:bg-blue-600 text-white h-7 sm:h-8 md:h-8 px-2 sm:px-2 md:px-3 text-[10px] sm:text-xs md:text-sm whitespace-nowrap flex-shrink-0"
                  >
                    Aplicar
                  </Button>
                </>
              )}
            </div>
            
            <Button variant="outline" onClick={refreshData} disabled={isAddingItem || isRemovingItem} size="sm" className="consignado-refresh-button text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-8 px-2 sm:px-2 md:px-3 whitespace-nowrap w-full sm:w-auto flex items-center justify-center">
              <RefreshCw className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1.5 flex-shrink-0" />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Alerts Compactos */}
        <div className="mb-4 space-y-3">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Somente visualização:</strong> Para adicionar ou modificar quantidades, use os itens em "Rascunho" acima e clique em "Salvar Itens".
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 text-sm">
              <strong>Cálculo de Comissão Personalizada:</strong> Por padrão, não há comissão (0%). 
              Use o controle global ou modifique individualmente cada item. Valores líquidos são calculados automaticamente.
            </AlertDescription>
          </Alert>
        </div>

        {/* Tabela Compacta */}
        {groupedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum item salvo nesta folha ainda.</p>
            <p className="text-sm">Adicione produtos usando o código ou scanner acima.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabela - Desktop (acima de 1008px) */}
            <div className="consignado-saved-table-container rounded-xl border border-slate-200 overflow-hidden">
            <Table className="consignado-saved-table">
              <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-slate-700 min-w-[180px]">Produto</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right whitespace-nowrap">Preço Base</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center whitespace-nowrap">Quantidade</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right whitespace-nowrap">Subtotal</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center whitespace-nowrap">Comissão</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right whitespace-nowrap">Total Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {groupedItems.map((item) => (
                    <TableRow key={item.commissionId} className="hover:bg-slate-50/50">
                      {/* Produto */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-blue-600" />
                          </div>
                      <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900 truncate">{item.product_name}</div>
                            <div className="text-slate-500 text-sm truncate">Código: {item.product_code}</div>
                        </div>
                      </div>
                    </TableCell>

                      {/* Preço Base */}
                      <TableCell className="text-right py-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{formatCurrency(item.preco_base_cents / 100)}</div>
                    </TableCell>

                      {/* Quantidade */}
                      <TableCell className="text-center py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-0">
                          {item.qty}
                        </Badge>
                      </TableCell>

                      {/* Subtotal */}
                      <TableCell className="text-right py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formatCurrency(item.subtotal_cents / 100)}</div>
                      </TableCell>

                      {/* Comissão */}
                      <TableCell className="text-center py-4">
                        <div className="space-y-2 flex flex-col items-center min-w-[100px]">
                          {editingItem === item.commissionId ? (
                            <>
                              <Input
                                type="number"
                                value={itemCommissions[item.commissionId]?.toString() || ''}
                                onChange={(e) => handleUpdateCommission(item.commissionId, e.target.value)}
                                min="0"
                                max="100"
                                className="w-16 h-7 text-center border-green-200 bg-green-50 text-green-800 font-semibold text-sm"
                                placeholder="Ex: 15"
                                autoFocus
                                onBlur={() => setEditingItem(null)}
                              />
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-0 text-sm">
                                {itemCommissions[item.commissionId] || 0}%
                              </Badge>
                              <button
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                                onClick={() => setEditingItem(item.commissionId)}
                              >
                                <Edit3 className="h-3 w-3 text-slate-600" />
                              </button>
                            </div>
                          )}
                          <div className="text-xs text-red-600 font-medium whitespace-nowrap">
                            {formatCurrency(calculateCommissionValue(item.commissionId, item.subtotal_cents / 100))}
                          </div>
                      </div>
                    </TableCell>

                      {/* Total Final */}
                      <TableCell className="text-right py-4 whitespace-nowrap">
                        <div className="flex flex-col items-end space-y-1">
                          <div className="font-bold text-green-600">
                            {formatCurrency(calculateNetValue(item.commissionId, item.subtotal_cents / 100))}
                          </div>
                          <div className="text-xs text-slate-500 uppercase tracking-wide">Líquido</div>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {/* Cards - Mobile/Tablet (abaixo de 1008px) */}
            <div className="consignado-saved-cards space-y-3">
              {groupedItems.map((item) => (
                <Card key={item.commissionId} className="consignado-saved-card">
                  <CardContent className="p-4 space-y-3">
                    {/* Header do card */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm break-words">{item.product_name}</div>
                          <div className="text-xs text-slate-500 break-words">
                            Código: {item.product_code}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Informações do produto em grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Preço Base</div>
                        <div className="font-medium">{formatCurrency(item.preco_base_cents / 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Quantidade</div>
                        <div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-0">
                            {item.qty}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                        <div className="font-semibold">{formatCurrency(item.subtotal_cents / 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Final</div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(calculateNetValue(item.commissionId, item.subtotal_cents / 100))}
                        </div>
                        <div className="text-xs text-slate-500 uppercase">Líquido</div>
                      </div>
                    </div>

                    {/* Comissão */}
                    <div className="space-y-2 border-t pt-3">
                      <div className="text-xs text-muted-foreground mb-2">Comissão</div>
                      <div className="flex items-center justify-between">
                        {editingItem === item.commissionId ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              type="number"
                              value={itemCommissions[item.commissionId]?.toString() || ''}
                              onChange={(e) => handleUpdateCommission(item.commissionId, e.target.value)}
                              min="0"
                              max="100"
                              className="w-20 h-8 text-center border-green-200 bg-green-50 text-green-800 font-semibold text-sm"
                              placeholder="Ex: 15"
                              autoFocus
                              onBlur={() => setEditingItem(null)}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-0 text-sm">
                                {itemCommissions[item.commissionId] || 0}%
                              </Badge>
                              <button
                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                                onClick={() => setEditingItem(item.commissionId)}
                              >
                                <Edit3 className="h-4 w-4 text-slate-600" />
                              </button>
                            </div>
                            <div className="text-sm font-medium text-red-600">
                              {formatCurrency(calculateCommissionValue(item.commissionId, item.subtotal_cents / 100))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo Compacto */}
            <div className="consignado-financial-summary bg-slate-50 rounded-xl p-4">
              <h4 className="text-base font-semibold text-slate-900 mb-3 text-center">Resumo Financeiro</h4>
              
              <div className="consignado-summary-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{recalculatedTotalItems}</div>
                  <div className="text-slate-600 text-sm break-words">Total de Itens</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900 break-words">{formatCurrency(recalculatedTotalValue / 100)}</div>
                  <div className="text-slate-600 text-sm break-words">Valor Bruto</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600 break-words">{formatCurrency(totalCommissionValue)}</div>
                  <div className="text-slate-600 text-sm break-words">Comissão Total</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 break-words">{formatCurrency(totalNetValue)}</div>
                  <div className="text-slate-600 text-sm break-words">Valor Líquido</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}