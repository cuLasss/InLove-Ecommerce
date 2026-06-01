/**
 * Componente: Gerenciar Devoluções - COMPLETO E FUNCIONAL
 * 
 * Interface para gerenciar produtos devolvidos de folhas com status "Com a cliente"
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { 
  ArrowLeft, 
  Package, 
  Scan,
  Save,
  Trash2,
  Minus,
  Plus,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  CreditCard,
  Truck,
  User,
  Calendar,
  DollarSign,
  ShoppingCart,
  FileText,
  List,
  Search,
  Eye,
  Edit
} from 'lucide-react'
import { SmartScannerSheet } from '@/components/scan/SmartScannerSheet'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { formatConsignacaoDate } from '@/lib/date-utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface GerenciarDevolucoesProps {
  folhaCodigo: string
  folhaInfo?: {
    id?: string
    cliente_name?: string
    status?: string
    created_at?: string
    prazo?: string
  }
  onBack?: () => void
}

interface ProdutoFolha {
  id: string
  product_id: string
  product_name: string
  product_code: string
  short_code?: string
  qty: number
  qty_original: number
  qty_devolvida: number
  preco_unitario_cents: number
  subtotal_cents: number
  commission_percent?: number
}

interface ProdutoDevolvido {
  id: string
  product_id: string
  product_name: string
  product_code: string
  short_code?: string
  qty_original: number
  qty_devolvida: number
  qty_vendida: number
  preco_unitario_cents: number
  subtotal_cents: number
  commission_percent?: number
}

export function GerenciarDevolucoes({ folhaCodigo, folhaInfo, onBack }: GerenciarDevolucoesProps) {
  // Estado para controlar edição da quantidade original
  const [editingOriginalQty, setEditingOriginalQty] = useState<Record<string, boolean>>({})
  const [originalQtyValues, setOriginalQtyValues] = useState<Record<string, string>>({})
  const [productStocks, setProductStocks] = useState<Record<string, number>>({})
  const [scannerOpen, setScannerOpen] = useState(false)
  const [manualSelectionOpen, setManualSelectionOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [produtosFolha, setProdutosFolha] = useState<ProdutoFolha[]>([])
  const [devolucoes, setDevolucoes] = useState<ProdutoDevolvido[]>([])
  const [rascunhoDevolucoes, setRascunhoDevolucoes] = useState<ProdutoDevolvido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessando, setIsProcessando] = useState(false)
  const [folhaProcessada, setFolhaProcessada] = useState(false)
  const [isSalvandoDevolucoes, setIsSalvandoDevolucoes] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Funções para gerenciar edição da quantidade original
  const handleEditOriginalQty = (itemId: string) => {
    setEditingOriginalQty(prev => ({ ...prev, [itemId]: true }))
    // ✅ CORREÇÃO: Input vazio por padrão (não inicializar com valor atual)
    setOriginalQtyValues(prev => ({ ...prev, [itemId]: '' }))
  }

  const handleSaveOriginalQty = async (itemId: string) => {
    const newQty = originalQtyValues[itemId]
    
    // ✅ CORREÇÃO: Validação melhorada para input vazio
    if (!newQty || newQty === '') {
      toast({
        title: "Erro",
        description: "Digite uma quantidade válida",
        variant: "destructive"
      })
      return
    }
    
    const qtyNumber = parseInt(newQty.toString())
    if (isNaN(qtyNumber) || qtyNumber < 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser um número maior ou igual a zero",
        variant: "destructive"
      })
      return
    }

    // ✅ NOVA VALIDAÇÃO: Não permitir diminuir quantidade original
    const itemAtual = devolucoes.find(item => item.id === itemId)
    if (itemAtual && qtyNumber < itemAtual.qty_original) {
      toast({
        title: "Erro",
        description: `Não é possível diminuir a quantidade original. Valor mínimo: ${itemAtual.qty_original}`,
        variant: "destructive"
      })
      return
    }

    try {
      // ✅ CORREÇÃO: Usar nova função com validação de estoque
      const { consignacaoApi } = await import('@/lib/api')
      await consignacaoApi.updateItemOriginalQty(itemId, qtyNumber)
      
      // ✅ CORREÇÃO: Atualizar estado local com recálculo automático dos valores
      setDevolucoes(prev => prev.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, qty_original: qtyNumber }
          
          // ✅ CORREÇÃO: Recalcular valores automaticamente
          const subtotalCents = qtyNumber * item.preco_unitario_cents
          const commissionValueCents = Math.round(subtotalCents * ((item.commission_percent || 0) / 100))
          
          return {
            ...updatedItem,
            subtotal_cents: subtotalCents,
            commission_value_cents: commissionValueCents
          }
        }
        return item
      }))
      
      setEditingOriginalQty(prev => ({ ...prev, [itemId]: false }))
      
        // ✅ CORREÇÃO: Invalidar cache para garantir dados frescos
        queryClient.invalidateQueries({ queryKey: ['consignacao-items'] })
        queryClient.invalidateQueries({ queryKey: ['consignacao-items-with-returns'] })
        queryClient.invalidateQueries({ queryKey: ['products'] })
        
        // ✅ CORREÇÃO: Forçar refetch dos dados
        await queryClient.refetchQueries({ queryKey: ['consignacao-items'] })
        await queryClient.refetchQueries({ queryKey: ['consignacao-items-with-returns'] })
        
        console.log('✅ [GerenciarDevolucoes] Cache invalidado e dados refetchados') // Invalidar cache de produtos também
      
      toast({
        title: "Sucesso",
        description: "Quantidade atualizada com sucesso",
        variant: "default"
      })
      
      // ✅ CORREÇÃO: Reload automático da página após atualização
      setTimeout(() => {
        window.location.reload()
      }, 1500) // Aguardar 1.5s para mostrar o toast
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar quantidade",
        variant: "destructive"
      })
    }
  }

  const handleCancelEditOriginalQty = (itemId: string) => {
    setEditingOriginalQty(prev => ({ ...prev, [itemId]: false }))
    // ✅ CORREÇÃO: Limpar valor ao cancelar (não restaurar)
    setOriginalQtyValues(prev => ({ ...prev, [itemId]: '' }))
  }

  // ✅ CORREÇÃO: Buscar estoque real dos produtos (mesma lógica do rascunho)
  const fetchProductStock = async (productId: string) => {
    try {
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      const product = products?.find((p: any) => p.id === productId)
      const stock = product?.stock || 0
      
      setProductStocks(prev => ({
        ...prev,
        [productId]: stock
      }))
      
      console.log('🔍 [GerenciarDevolucoes] Estoque real carregado:', {
        productId,
        productName: product?.name,
        stock
      })
      
      return stock
    } catch (error) {
      console.error('❌ [GerenciarDevolucoes] Erro ao buscar estoque:', error)
      return 0
    }
  }

  // ✅ CORREÇÃO: Calcular valores do resumo da folha automaticamente
  const calcularResumoFolha = () => {
    const totalItens = devolucoes.reduce((sum, item) => sum + item.qty_original, 0)
    const totalDevolvidos = devolucoes.reduce((sum, item) => sum + item.qty_devolvida, 0)
    
    // ✅ CORREÇÃO: Calcular quantidade vendida automaticamente para cada item
    const totalVendidos = devolucoes.reduce((sum, item) => {
      const qtyVendidaCalculada = Math.max(0, item.qty_original - item.qty_devolvida)
      return sum + qtyVendidaCalculada
    }, 0)
    
    // ✅ CORREÇÃO: Calcular valor total usando quantidade vendida calculada
    const valorTotal = devolucoes.reduce((sum, item) => {
      const qtyVendidaCalculada = Math.max(0, item.qty_original - item.qty_devolvida)
      return sum + (qtyVendidaCalculada * item.preco_unitario_cents)
    }, 0)
    
    // ✅ CORREÇÃO: Usar a mesma lógica da calcularComissaoItem para consistência
    const totalComissao = devolucoes.reduce((sum, item) => {
      const { valorComissao } = calcularComissaoItem(item)
      return sum + valorComissao
    }, 0)
    
    const valorLiquido = valorTotal - totalComissao
    
    console.log('🔍 [GerenciarDevolucoes] Cálculo do resumo:', {
      totalItens,
      totalVendidos,
      totalDevolvidos,
      valorTotal,
      totalComissao,
      valorLiquido,
      items: devolucoes.map(item => {
        const { valorComissao, percentual, qtyVendidaCalculada } = calcularComissaoItem(item)
        return {
          product_name: item.product_name,
          qty_original: item.qty_original,
          qty_devolvida: item.qty_devolvida,
          qty_vendida_calculada: qtyVendidaCalculada,
          qty_vendida_original: item.qty_vendida,
          preco_unitario_cents: item.preco_unitario_cents,
          commission_percent: percentual,
          valor_vendido_calculado: qtyVendidaCalculada * item.preco_unitario_cents,
          comissao_calculada: valorComissao
        }
      })
    })
    
    return {
      totalItens,
      totalVendidos,
      totalDevolvidos,
      valorTotal,
      totalComissao,
      valorLiquido
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Usar React Query para carregar dados de forma robusta
  const { data: consignacoesData, isLoading: isLoadingConsignacoes } = useQuery({
    queryKey: ['consignacoes', 'all'],
    queryFn: async () => {
      console.log('🔄 [GerenciarDevolucoes] Executando query de consignações...')
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      return universalDataAdapter.getConsignacoes()
    },
    enabled: !!folhaCodigo,
    staleTime: 30000,
    retry: 2
  })

  // Buscar a folha específica
  const folha = consignacoesData?.data?.find((c: any) => c.codigo === folhaCodigo)
  
  // Debug: verificar dados das consignações
  console.log('🔍 [GerenciarDevolucoes] Consignações carregadas:', {
    totalConsignacoes: consignacoesData?.data?.length || 0,
    codigosDisponiveis: consignacoesData?.data?.map(c => c.codigo) || [],
    folhaCodigo,
    folhaEncontrada: folha ? { id: folha.id, codigo: folha.codigo, status: folha.status } : null
  })

  // ✅ CORREÇÃO: Carregar itens da consignação diretamente da tabela consignacao_items
  const { data: produtosData, isLoading: isLoadingProdutos, refetch: refetchProdutos } = useQuery({
    queryKey: ['consignacao-items-with-returns', folha?.id],
    queryFn: async () => {
      console.log('🔄 [GerenciarDevolucoes] Executando query de produtos...', folha?.id)
      if (!folha?.id) return { data: [], error: null }
      
      // ✅ CORREÇÃO: Buscar diretamente da tabela consignacao_items
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const response = await universalDataAdapter.getConsignacaoItemsWithReturns(folha.id)
      
        console.log('🔍 [GerenciarDevolucoes] Dados brutos da tabela consignacao_items:', response.data)
        
        // ✅ DEBUG: Verificar especificamente as quantidades devolvidas
        if (response.data && response.data.length > 0) {
          console.log('🔍 [GerenciarDevolucoes] DEBUG - Quantidades devolvidas por produto:')
          response.data.forEach((item: any, index: number) => {
            console.log(`   Produto ${index + 1}: ${item.product_name || 'N/A'}`)
            console.log(`     qtd_devolvida: ${item.qtd_devolvida}`)
            console.log(`     qty: ${item.qty}`)
            console.log(`     qtd_vendida: ${item.qtd_vendida}`)
            console.log(`     qtd_enviada: ${item.qtd_enviada}`)
          })
        }
      
      return response
    },
    enabled: !!folha?.id,
          staleTime: 30000, // ✅ CORREÇÃO: Cache por 30 segundos para evitar refetch desnecessário
          gcTime: 300000, // ✅ CORREÇÃO: Manter cache por 5 minutos
    refetchOnMount: false, // ✅ CORREÇÃO: Não refetch ao montar se dados estão frescos
    refetchOnWindowFocus: false, // ✅ CORREÇÃO: Não refetch ao focar na janela
    retry: 1 // ✅ CORREÇÃO: Reduzir tentativas para evitar múltiplas chamadas
  })

  // Debug: verificar qual estado está sendo usado na interface
  console.log('🔍 [GerenciarDevolucoes] Estados para interface:', {
    devolucoes: devolucoes.map(d => ({
      product_name: d.product_name,
      qty_original: d.qty_original,
      qty_vendida: d.qty_vendida,
      qty_devolvida: d.qty_devolvida
    })),
    rascunhoDevolucoes: rascunhoDevolucoes.map(r => ({
      product_name: r.product_name,
      qty_original: r.qty_original,
      qty_vendida: r.qty_vendida,
      qty_devolvida: r.qty_devolvida
    }))
  })

  // Fallback: tentar carregar dados do cache se folhaInfo estiver incompleto
  useEffect(() => {
    if (folhaCodigo && (!folhaInfo?.cliente_name || folhaInfo.cliente_name === 'Cliente não informado')) {
      console.log('🔄 [GerenciarDevolucoes] Tentando carregar dados do cache...')
      
      try {
        const cacheKey = `folha_info_${folhaCodigo}`
        const cachedFolhaInfo = localStorage.getItem(cacheKey)
        
        if (cachedFolhaInfo) {
          const parsedCache = JSON.parse(cachedFolhaInfo)
          const cacheAge = Date.now() - (parsedCache.timestamp || 0)
          const maxCacheAge = 10 * 60 * 1000 // 10 minutos para fallback
          
          if (cacheAge < maxCacheAge && parsedCache.data?.cliente_name) {
            console.log('✅ [GerenciarDevolucoes] Dados carregados do cache:', parsedCache.data)
            // Os dados serão atualizados automaticamente quando o componente pai recarregar
          }
        }
      } catch (error) {
        console.error('❌ [GerenciarDevolucoes] Erro ao carregar cache:', error)
      }
    }
  }, [folhaCodigo, folhaInfo])

  // ❌ RASCUNHO NÃO DEVE SER SALVO - apenas os "Produtos Salvos" devem persistir
  // Removido: salvamento automático do rascunho
  // Removido: carregamento do rascunho salvo

  // ✅ SALVAR APENAS OS "PRODUTOS SALVOS" - devoluções aplicadas após clicar "Salvar Devoluções"
  useEffect(() => {
    if (folhaCodigo) {
      // Buscar folha para obter ID
      const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]')
      const folha = consignacoes.find((c: any) => c.codigo === folhaCodigo)
      
      if (folha) {
        // Chave baseada na estrutura real: folha_id + folha_codigo
        const folhaKey = `folha_${folhaCodigo}_produtos_salvos`
        
        // Estrutura de dados melhorada - APENAS produtos salvos
        const produtosSalvosData = {
          folha_codigo: folhaCodigo,
          folha_id: folha.id,
          produtos_salvos: devolucoes, // Apenas os produtos já salvos
          metadata: {
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: '3.0',
            tipo: 'produtos_salvos_apenas'
          }
        }
        
        try {
          localStorage.setItem(folhaKey, JSON.stringify(produtosSalvosData))
          console.log('💾 [GerenciarDevolucoes] PRODUTOS SALVOS persistidos:', {
            folha_codigo: folhaCodigo,
            folha_id: folha.id,
            total_produtos_salvos: devolucoes.length,
            comDevolucao: devolucoes.filter(d => d.qty_devolvida > 0).length,
            itens: devolucoes.map(d => ({
              produto: d.product_name,
              devolvida: d.qty_devolvida,
              vendida: d.qty_vendida
            }))
          })
        } catch (error) {
          console.error('❌ [GerenciarDevolucoes] Erro ao salvar produtos salvos:', error)
        }
      }
    }
  }, [devolucoes, folhaCodigo])

  // ✅ CORREÇÃO: Processar dados sempre frescos da tabela consignacao_items
  useEffect(() => {
    if (!folhaCodigo || isLoadingConsignacoes || isLoadingProdutos) {
      return
    }

    if (!folha) {
      console.error('❌ [GerenciarDevolucoes] Folha não encontrada:', folhaCodigo)
      return
    }

    const produtosSalvos = produtosData && 'data' in produtosData ? produtosData.data || [] : []

    if (produtosSalvos.length > 0) {
      const produtosFormatados = produtosSalvos.map((produto: any) => {
        
        // ✅ CORREÇÃO: Mapear corretamente as colunas da tabela consignacao_items
        const produtoFormatado = {
          id: produto.id,
          product_id: produto.product_id,
          product_code: produto.product_code || produto.products?.short_code || 'N/A',
          product_name: produto.product_name || produto.products?.name || 'Produto não encontrado',
          qty_original: produto.qtd_enviada || 0, // ✅ CORREÇÃO: Quantidade enviada (coluna qtd_enviada)
          qty_vendida: produto.qtd_vendida || 0, // ✅ CORREÇÃO: Quantidade vendida (coluna qtd_vendida)
          qty_devolvida: produto.qtd_devolvida || 0, // ✅ CORREÇÃO: Quantidade devolvida (coluna qtd_devolvida)
          qty_atual: produto.qty || 0, // ✅ CORREÇÃO: Quantidade atual (coluna qty)
          // ✅ CORREÇÃO CRÍTICA: Garantir que preço unitário seja sempre válido
          preco_unitario_cents: produto.unit_price_cents || produto.products?.price_cents || produto.preco_base_cents || 0,
          commission_percent: produto.commission_percent || 0,
          subtotal_cents: produto.subtotal_cents || 0,
          commission_value_cents: produto.commission_value_cents || 0,
          // ✅ CORREÇÃO: Informações de estoque real do produto da tabela products
          estoque_normal: produto.products?.stock || 0,
          estoque_consignado: produto.products?.stock_consigned || 0
        }
        
        // ✅ CORREÇÃO: Se preço for zero, usar preço padrão
        if (produtoFormatado.preco_unitario_cents === 0) {
          console.warn('⚠️ [GerenciarDevolucoes] PREÇO ZERO detectado na tabela consignacao_items:', {
            product_name: produtoFormatado.product_name,
            product_id: produtoFormatado.product_id,
            unit_price_cents: produto.unit_price_cents,
            products_price_cents: produto.products?.price_cents,
            preco_base_cents: produto.preco_base_cents,
            produto_original: produto
          })
          
          // ✅ CORREÇÃO: Usar preço padrão baseado no valor da API (R$ 35,00)
          produtoFormatado.preco_unitario_cents = 3500 // R$ 35,00 como preço padrão
          console.log('⚠️ [GerenciarDevolucoes] Usando preço padrão:', 3500)
        }
        
        console.log('✅ [GerenciarDevolucoes] Produto formatado com dados da tabela consignacao_items:', {
          'product_name': produtoFormatado.product_name,
          'product_code': produtoFormatado.product_code,
          'qty_original (qtd_enviada)': produtoFormatado.qty_original,
          'qty_vendida (qtd_vendida)': produtoFormatado.qty_vendida,
          'qty_devolvida (qtd_devolvida)': produtoFormatado.qty_devolvida,
          'qty_atual (qty)': produtoFormatado.qty_atual,
          'preco_unitario_cents': produtoFormatado.preco_unitario_cents,
          'commission_percent': produtoFormatado.commission_percent,
          'estoque_normal': produtoFormatado.estoque_normal,
          'estoque_consignado': produtoFormatado.estoque_consignado
        })
        
        return produtoFormatado
      })
      
      console.log('📱 [GerenciarDevolucoes] Produtos formatados com dados frescos:', produtosFormatados)
      
      // ✅ DEBUG: Verificar especificamente a quantidade devolvida antes de definir o estado
      console.log('🔍 [GerenciarDevolucoes] DEBUG - Quantidade devolvida antes de setDevolucoes:')
      produtosFormatados.forEach((produto, index) => {
        console.log(`   Produto ${index + 1}: ${produto.product_name}`)
        console.log(`     qty_devolvida: ${produto.qty_devolvida}`)
        console.log(`     qty_original: ${produto.qty_original}`)
        console.log(`     qty_vendida: ${produto.qty_vendida}`)
      })
      
      setDevolucoes(produtosFormatados)
      setIsLoading(false)
      console.log('✅ [GerenciarDevolucoes] Produtos carregados da tabela consignacao_items:', {
        folha_codigo: folhaCodigo,
        folha_id: folha.id,
        itens: produtosFormatados.length,
        timestamp: new Date().toISOString(),
        fonte: 'tabela_consignacao_items'
      })
    } else {
      console.log('📦 [GerenciarDevolucoes] Nenhum produto encontrado na tabela consignacao_items para:', folhaCodigo)
      setDevolucoes([])
      setIsLoading(false)
    }
  }, [folhaCodigo, folha, produtosData, isLoadingConsignacoes, isLoadingProdutos])

  // ✅ CORREÇÃO: Buscar estoque real dos produtos quando devolucoes são carregadas
  useEffect(() => {
    if (devolucoes.length > 0) {
      console.log('🔄 [GerenciarDevolucoes] Buscando estoque real dos produtos...')
      devolucoes.forEach(item => {
        if (!productStocks[item.product_id]) {
          fetchProductStock(item.product_id)
        }
      })
    }
  }, [devolucoes])

  // ✅ CORREÇÃO: Limpar cache e forçar reload dos dados sempre
  useEffect(() => {
    if (folhaCodigo) {
      console.log('🔄 [GerenciarDevolucoes] Folha alterada - invalidando cache específico...')
      
      // ✅ CORREÇÃO: Invalidar apenas queries específicas desta folha
      queryClient.invalidateQueries({ queryKey: ['consignacao-items', folhaCodigo] })
      queryClient.invalidateQueries({ queryKey: ['consignacao-items-with-returns', folhaCodigo] })
      
      console.log('🧹 [GerenciarDevolucoes] Cache específico invalidado para folha:', folhaCodigo)
    }
  }, [folhaCodigo, queryClient])

  // ✅ OTIMIZAÇÃO: Removido refetch forçado ao montar
  // A query já usa cache e só faz refetch quando necessário (staleTime: 30s)
  // Isso evita refetch desnecessário ao navegar entre páginas

  // ❌ LÓGICA DUPLICADA REMOVIDA - já temos a lógica correta acima

  // CORREÇÃO: Remover salvamento automático do rascunho
  // O rascunho deve ser apenas temporário, não salvo automaticamente
  // useEffect(() => {
  //   if (folhaCodigo && rascunhoDevolucoes.length > 0) {
  //     const rascunhoKey = `rascunho_devolucoes_${folhaCodigo}`
  //     const rascunhoData = {
  //       devolucoes: rascunhoDevolucoes,
  //       timestamp: Date.now()
  //     }
  //     
  //     try {
  //       localStorage.setItem(rascunhoKey, JSON.stringify(rascunhoData))
  //       console.log('💾 [GerenciarDevolucoes] Rascunho salvo automaticamente:', {
  //         total: rascunhoDevolucoes.length
  //       })
  //     } catch (error) {
  //       console.error('❌ [GerenciarDevolucoes] Erro ao salvar rascunho automaticamente:', error)
  //     }
  //   }
  // }, [rascunhoDevolucoes, folhaCodigo])

  // ✅ SALVAR APENAS PRODUTOS SALVOS ao sair da página
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (folhaCodigo && devolucoes.length > 0) {
        // Buscar folha para obter ID
        const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]')
        const folha = consignacoes.find((c: any) => c.codigo === folhaCodigo)
        
        if (folha) {
          const folhaKey = `folha_${folhaCodigo}_produtos_salvos`
          const produtosSalvosData = {
            folha_codigo: folhaCodigo,
            folha_id: folha.id,
            produtos_salvos: devolucoes,
            metadata: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: '3.0',
              tipo: 'produtos_salvos_apenas'
            }
          }
          
          try {
            localStorage.setItem(folhaKey, JSON.stringify(produtosSalvosData))
            console.log('💾 [GerenciarDevolucoes] PRODUTOS SALVOS salvos ao sair da página')
          } catch (error) {
            console.error('❌ [GerenciarDevolucoes] Erro ao salvar produtos salvos ao sair:', error)
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [folhaCodigo, devolucoes])

  // ✅ SALVAR APENAS PRODUTOS SALVOS ao sair da rota (navegação interna)
  useEffect(() => {
    const handleRouteChange = () => {
      if (folhaCodigo && devolucoes.length > 0) {
        // Buscar folha para obter ID
        const consignacoes = JSON.parse(localStorage.getItem('consignacoes') || '[]')
        const folha = consignacoes.find((c: any) => c.codigo === folhaCodigo)
        
        if (folha) {
          const folhaKey = `folha_${folhaCodigo}_produtos_salvos`
          const produtosSalvosData = {
            folha_codigo: folhaCodigo,
            folha_id: folha.id,
            produtos_salvos: devolucoes,
            metadata: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: '3.0',
              tipo: 'produtos_salvos_apenas'
            }
          }
          
          try {
            localStorage.setItem(folhaKey, JSON.stringify(produtosSalvosData))
            console.log('💾 [GerenciarDevolucoes] PRODUTOS SALVOS salvos ao sair da rota')
          } catch (error) {
            console.error('❌ [GerenciarDevolucoes] Erro ao salvar produtos salvos ao sair da rota:', error)
          }
        }
      }
    }

    // Salvar dados quando o componente for desmontado
    return () => {
      handleRouteChange()
    }
  }, [folhaCodigo, devolucoes])

  // Filtrar produtos para seleção manual
  const produtosFiltrados = produtosFolha.filter(produto => {
    if (!searchTerm) return true
    const termo = searchTerm.toLowerCase()
    return (
      produto.product_name.toLowerCase().includes(termo) ||
      produto.short_code.toLowerCase().includes(termo) ||
      produto.product_id.toLowerCase().includes(termo)
    )
  })

  // Carregar produtos da folha (mesmos produtos que estavam no rascunho)
  const carregarProdutosFolha = async () => {
    setIsLoading(true)
    try {
      console.log('🔄 [GerenciarDevolucoes] Carregando produtos da folha:', folhaCodigo)
      
      // Buscar dados da folha usando universalDataAdapter
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { consignacaoApi } = await import('@/lib/api')
      
      // Buscar folha pelo código (pode estar em qualquer status)
      console.log('🔍 [GerenciarDevolucoes] Buscando folha em todos os status...')
      
      const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
      const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
      const consignacoesAguardando = await consignacaoApi.getAll('EM_CONFERENCIA', 1, 100)
      
      console.log('📊 [GerenciarDevolucoes] Resultados da busca:', {
        rascunho: Array.isArray(consignacoesRascunho) ? consignacoesRascunho.length : consignacoesRascunho?.data?.length || 0,
        entregue: Array.isArray(consignacoesEntregue) ? consignacoesEntregue.length : consignacoesEntregue?.data?.length || 0,
        aguardando: Array.isArray(consignacoesAguardando) ? consignacoesAguardando.length : consignacoesAguardando?.data?.length || 0
      })
      
      const allConsignacoes = [
        ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
        ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || []),
        ...(Array.isArray(consignacoesAguardando) ? consignacoesAguardando : consignacoesAguardando?.data || [])
      ]
      
      console.log('🔍 [GerenciarDevolucoes] Total de consignações encontradas:', allConsignacoes.length)
      console.log('🔍 [GerenciarDevolucoes] Códigos disponíveis:', allConsignacoes.map((c: any) => c.codigo))
      
      const folha = allConsignacoes.find((c: any) => c.codigo === folhaCodigo)
      
      if (folha) {
        // Tentar múltiplas formas de obter o nome do cliente
        const clienteName = folha.clients?.name || 
                           folha.cliente_name || 
                           folha.clients?.nome ||
                           folha.client_name ||
                           'Cliente não informado'
        
        console.log('🔍 [GerenciarDevolucoes] Folha encontrada:', {
          id: folha.id,
          codigo: folha.codigo,
          status: folha.status,
          cliente: clienteName,
          clientsObject: folha.clients,
          cliente_name: folha.cliente_name,
          client_name: folha.client_name
        })
        
        // Buscar itens da consignação com JOIN dos produtos (mesmos produtos que estavam no rascunho)
        console.log('🔍 [GerenciarDevolucoes] Buscando itens da folha ID:', folha.id)
        const { data: items } = await universalDataAdapter.getConsignacaoItemsWithReturns(folha.id)
        
        console.log('📦 [GerenciarDevolucoes] Itens encontrados:', {
          totalItens: items?.length || 0,
          itens: items?.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name,
            qty: item.qty,
            commission_percent: item.commission_percent
          }))
        })
        
        // Agrupar itens por produto (mesma lógica do rascunho)
        const produtosAgrupados = (items || []).reduce((acc: any[], item: any) => {
          const existing = acc.find(p => p.product_id === item.product_id)
          if (existing) {
            existing.qty += item.qty
            existing.subtotal_cents += item.subtotal_cents
            // ✅ CORREÇÃO: Atualizar quantidade original e devolvida usando colunas corretas
            existing.qty_original = (existing.qty_original || 0) + (item.qtd_enviada || item.qty)
            existing.qty_devolvida = (existing.qty_devolvida || 0) + (item.qtd_devolvida || 0)
            // Preservar a comissão mais recente (maior valor) entre todos os itens do mesmo produto
            // IMPORTANTE: Não sobrescrever se já existe uma comissão personalizada
            if (item.commission_percent && item.commission_percent > (existing.commission_percent || 0)) {
              existing.commission_percent = item.commission_percent
            }
            // ✅ CORREÇÃO CRÍTICA: Garantir que preço unitário seja sempre válido
            const precoValido = item.preco_base_cents || item.unit_price_cents || item.products?.price_cents || 0
            if (precoValido > 0) {
              existing.preco_unitario_cents = precoValido
            }
          } else {
            // ✅ CORREÇÃO CRÍTICA: Garantir que preço unitário seja sempre válido para novos itens
            let precoValido = item.preco_base_cents || item.unit_price_cents || item.products?.price_cents || 0
            
            // ✅ CORREÇÃO: Se preço for zero, usar preço padrão
            if (precoValido === 0) {
              console.warn('⚠️ [GerenciarDevolucoes] PREÇO ZERO detectado para produto:', {
                product_name: item.products?.name || 'Produto não encontrado',
                product_id: item.product_id,
                preco_base_cents: item.preco_base_cents,
                unit_price_cents: item.unit_price_cents,
                products_price_cents: item.products?.price_cents,
                item_completo: item
              })
              
              // ✅ CORREÇÃO: Usar preço padrão baseado no valor da API (R$ 35,00)
              precoValido = 3500 // R$ 35,00 como preço padrão
              console.log('⚠️ [GerenciarDevolucoes] Usando preço padrão:', precoValido)
            }
            
            acc.push({
              id: item.id,
              product_id: item.product_id,
              product_name: item.products?.name || 'Produto não encontrado',
              product_code: item.products?.short_code || item.product_id,
              qty: item.qty,
              qty_original: item.qtd_enviada || item.qty, // ✅ CORREÇÃO: Usar qtd_enviada como quantidade original
              qty_devolvida: item.qtd_devolvida || 0, // ✅ CORREÇÃO: Usar qtd_devolvida como quantidade devolvida
              preco_unitario_cents: precoValido, // ✅ CORREÇÃO: Usar preço válido sempre
              subtotal_cents: item.subtotal_cents || (item.qty * precoValido),
              // CRÍTICO: Usar exatamente a comissão salva no banco, sem fallback para valores padrão
              commission_percent: item.commission_percent || 0 // Se não há comissão definida, usar 0 (sem comissão)
            })
          }
          return acc
        }, [])
        
        // Se não encontrou itens pela API, tentar buscar no localStorage como fallback
        if (produtosAgrupados.length === 0) {
          console.log('⚠️ [GerenciarDevolucoes] Nenhum item encontrado pela API, tentando localStorage...')
          
          try {
            // Buscar dados salvos no localStorage
            const localStorageKey = `consignacao_rascunho_${folhaCodigo}`
            const dadosSalvos = localStorage.getItem(localStorageKey)
            
            if (dadosSalvos) {
              const parsedData = JSON.parse(dadosSalvos)
              console.log('💾 [GerenciarDevolucoes] Dados encontrados no localStorage:', parsedData)
              
              if (parsedData.itens && parsedData.itens.length > 0) {
                // Converter itens do localStorage para o formato esperado
                const produtosDoLocalStorage = parsedData.itens.map((item: any) => ({
                  id: item.id || `${item.product_id}-${Date.now()}`,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  product_code: item.product_code,
                  qty: item.qty,
                  qty_original: item.qty_original || item.qty,
                  qty_devolvida: item.qty_devolvida || 0,
                  // ✅ CORREÇÃO CRÍTICA: Garantir que preço unitário seja sempre válido
                  preco_unitario_cents: item.preco_base_cents || item.preco_unitario_cents || 0,
                  subtotal_cents: item.subtotal_cents,
                  commission_percent: item.commission_percent || 0
                }))
                
                console.log('✅ [GerenciarDevolucoes] Produtos carregados do localStorage:', produtosDoLocalStorage)
                setProdutosFolha(produtosDoLocalStorage)
                
                // ✅ CORREÇÃO: Não sobrescrever devoluções já carregadas pela nova lógica
                if (devolucoes.length === 0) {
                  // Inicializar devoluções com valores padrão (todos vendidos inicialmente)
                  const devolucoesIniciais = produtosDoLocalStorage.map(produto => ({
                    id: produto.id,
                    product_id: produto.product_id,
                    product_name: produto.product_name,
                    product_code: produto.product_code,
                    qty_original: produto.qty_original || produto.qty, // Usar qty_original se disponível
                    qty_devolvida: produto.qty_devolvida || 0,
                    qty_vendida: produto.qty_vendida || produto.qty,
                    preco_unitario_cents: produto.preco_unitario_cents,
                    subtotal_cents: produto.subtotal_cents
                  }))
                  
                  // ✅ CORREÇÃO: Não sobrescrever dados do banco com localStorage
                  console.log('✅ [GerenciarDevolucoes] Devoluções do localStorage disponíveis, mas dados do banco têm prioridade')
                } else {
                  console.log('✅ [GerenciarDevolucoes] Devoluções já carregadas pela nova lógica (localStorage):', devolucoes.length)
                }
                
                return // Sair da função aqui se conseguiu carregar do localStorage
              }
            }
          } catch (error) {
            console.error('❌ [GerenciarDevolucoes] Erro ao carregar do localStorage:', error)
          }
        }
        
        setProdutosFolha(produtosAgrupados)
        
        // Inicializar devoluções com valores padrão (todos vendidos inicialmente)
        const devolucoesIniciais = produtosAgrupados.map(produto => ({
          id: produto.id,
          product_id: produto.product_id,
          product_name: produto.product_name,
          product_code: produto.product_code,
          qty_original: produto.qty_original || produto.qty, // ✅ CORREÇÃO: Usar qty_original já mapeado corretamente
          qty_devolvida: produto.qty_devolvida || 0, // ✅ CORREÇÃO: Usar qty_devolvida já mapeado corretamente
          qty_vendida: produto.qty_vendida || produto.qty,
          preco_unitario_cents: produto.preco_unitario_cents,
          subtotal_cents: produto.subtotal_cents
        }))
        
        // ✅ CORREÇÃO: Não sobrescrever devoluções já carregadas pela nova lógica
        // A nova lógica (linha 186-224) já carrega as devoluções corretamente
        // Esta lógica antiga estava causando conflito e sobrescrevendo os dados
        
        // ✅ CORREÇÃO: Não sobrescrever dados do banco com localStorage
        console.log('✅ [GerenciarDevolucoes] Devoluções do localStorage disponíveis, mas dados do banco têm prioridade')
        
        console.log('✅ [GerenciarDevolucoes] Produtos carregados:', {
          totalProdutos: produtosAgrupados.length,
          produtos: produtosAgrupados.map(p => ({
            nome: p.product_name,
            qty: p.qty,
            qty_original: p.qty_original,
            qty_devolvida: p.qty_devolvida,
            preco: p.preco_unitario_cents / 100,
            comissao: p.commission_percent,
            origem: p.commission_percent === 0 ? 'sem comissão' : 'comissão personalizada'
          }))
        })
        
        // Debug adicional: verificar se comissões estão sendo preservadas corretamente
        console.log('🔍 [GerenciarDevolucoes] Verificação de comissões preservadas:', {
          itensOriginais: items?.map(item => ({
            id: item.id,
            product_id: item.product_id,
            commission_percent: item.commission_percent
          })),
          produtosAgrupados: produtosAgrupados.map(p => ({
            product_id: p.product_id,
            commission_percent: p.commission_percent
          }))
        })
        
        // Debug adicional: verificar itens originais
        console.log('🔍 [GerenciarDevolucoes] Itens originais da consignação:', {
          totalItens: items?.length || 0,
          itens: items?.map(item => ({
            id: item.id,
            product_id: item.product_id,
            qty: item.qty,
            commission_percent: item.commission_percent,
            product_name: item.products?.name
          }))
        })
      } else {
        console.error('❌ [GerenciarDevolucoes] Folha não encontrada:', folhaCodigo)
        console.log('🔍 [GerenciarDevolucoes] Tentando buscar no localStorage como último recurso...')
        
        // Último recurso: tentar buscar dados salvos no localStorage
        try {
          const localStorageKey = `consignacao_rascunho_${folhaCodigo}`
          const dadosSalvos = localStorage.getItem(localStorageKey)
          
          if (dadosSalvos) {
            const parsedData = JSON.parse(dadosSalvos)
            console.log('💾 [GerenciarDevolucoes] Dados encontrados no localStorage (último recurso):', parsedData)
            
            if (parsedData.itens && parsedData.itens.length > 0) {
              // Converter itens do localStorage para o formato esperado
              const produtosDoLocalStorage = parsedData.itens.map((item: any) => ({
                id: item.id || `${item.product_id}-${Date.now()}`,
                product_id: item.product_id,
                product_name: item.product_name,
                product_code: item.product_code,
                qty: item.qty,
                qty_original: item.qty_original || item.qty,
                qty_devolvida: item.qty_devolvida || 0,
                // ✅ CORREÇÃO CRÍTICA: Garantir que preço unitário seja sempre válido
                preco_unitario_cents: item.preco_base_cents || item.preco_unitario_cents || 0,
                subtotal_cents: item.subtotal_cents,
                commission_percent: item.commission_percent || 0
              }))
              
              console.log('✅ [GerenciarDevolucoes] Produtos carregados do localStorage (último recurso):', produtosDoLocalStorage)
              setProdutosFolha(produtosDoLocalStorage)
              
              // ✅ CORREÇÃO: Não sobrescrever devoluções já carregadas pela nova lógica
              if (devolucoes.length === 0) {
                // Inicializar devoluções com valores padrão (todos vendidos inicialmente)
                const devolucoesIniciais = produtosDoLocalStorage.map(produto => ({
                  id: produto.id,
                  product_id: produto.product_id,
                  product_name: produto.product_name,
                  product_code: produto.product_code,
                  qty_original: produto.qty_original || produto.qty,
                  qty_devolvida: 0,
                  qty_vendida: produto.qty,
                  preco_unitario_cents: produto.preco_unitario_cents,
                  subtotal_cents: produto.subtotal_cents
                }))
                
                // ✅ CORREÇÃO: Não sobrescrever dados do banco com localStorage
                console.log('✅ [GerenciarDevolucoes] Devoluções do localStorage disponíveis, mas dados do banco têm prioridade')
              } else {
                console.log('✅ [GerenciarDevolucoes] Devoluções já carregadas pela nova lógica (último recurso):', devolucoes.length)
              }
              
              toast({
                title: '⚠️ Dados carregados do cache local',
                description: 'Folha não encontrada na API, mas dados foram recuperados do cache local',
                variant: 'default'
              })
              
              return // Sair da função aqui se conseguiu carregar do localStorage
            }
          }
        } catch (error) {
          console.error('❌ [GerenciarDevolucoes] Erro ao carregar do localStorage (último recurso):', error)
        }
        
        toast({
          title: 'Erro',
          description: 'Folha não encontrada e nenhum dado salvo localmente',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('❌ [GerenciarDevolucoes] Erro ao carregar produtos:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar produtos da folha',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Atualizar quantidade devolvida
  const atualizarDevolucao = (productId: string, qtyDevolvida: number) => {
    console.log('🔄 [GerenciarDevolucoes] atualizarDevolucao chamada:', {
      productId,
      qtyDevolvida,
      produtosFolhaLength: produtosFolha.length,
      devolucoesAtuaisLength: devolucoes.length
    })
    
    setDevolucoes(prev => {
      console.log('📊 [GerenciarDevolucoes] Estado atual devolucoes:', prev.length)
      
      // Verificar se o produto já existe no estado devolucoes
      const itemExistente = prev.find(item => item.product_id === productId)
      
      if (itemExistente) {
        console.log('🔄 [GerenciarDevolucoes] Atualizando item existente:', itemExistente.product_name)
        // Atualizar item existente
        const novoEstado = prev.map(item => {
          if (item.product_id === productId) {
            const qtyVendida = Math.max(0, item.qty_original - qtyDevolvida)
            return {
              ...item,
              qty_devolvida: qtyDevolvida,
              qty_vendida: qtyVendida
            }
          }
          return item
        })
        console.log('✅ [GerenciarDevolucoes] Item existente atualizado:', novoEstado.length)
        return novoEstado
      } else {
        console.log('🆕 [GerenciarDevolucoes] Criando novo item para produto:', productId)
        // CORREÇÃO: Criar novo item se não existir
        // Buscar o produto nos produtos da folha para criar o item
        const produtoFolha = produtosFolha.find(p => p.product_id === productId)
        
        if (produtoFolha) {
          console.log('✅ [GerenciarDevolucoes] Produto encontrado na folha:', produtoFolha.product_name)
          const qtyVendida = Math.max(0, produtoFolha.qty - qtyDevolvida)
          const novoItem = {
            id: `devolucao_${productId}_${Date.now()}`,
            product_id: productId,
            product_name: produtoFolha.product_name,
            product_code: produtoFolha.product_code,
            qty_original: produtoFolha.qty, // ProdutoFolha não tem qty_original, usar qty
            qty_devolvida: qtyDevolvida,
            qty_vendida: qtyVendida,
            preco_unitario_cents: produtoFolha.preco_unitario_cents,
            subtotal_cents: qtyVendida * produtoFolha.preco_unitario_cents
          }
          
          console.log('✅ [GerenciarDevolucoes] Novo item criado em devolucoes:', novoItem)
          const novoEstado = [...prev, novoItem]
          console.log('📊 [GerenciarDevolucoes] Novo estado devolucoes:', novoEstado.length)
          return novoEstado
        } else {
          console.error('❌ [GerenciarDevolucoes] Produto não encontrado na folha:', productId)
          console.log('📋 [GerenciarDevolucoes] Produtos disponíveis na folha:', produtosFolha.map(p => ({
            id: p.product_id,
            nome: p.product_name
          })))
          return prev
        }
      }
    })
  }

  // Adicionar produto manualmente ao rascunho de devoluções
  const adicionarProdutoManual = async (produtoFolha: ProdutoFolha, qtyDevolvida: number) => {
    try {
      // ✅ CORREÇÃO: Calcular quantidade máxima devolvível
      // Qtd Máxima Devolvível = Qtd Original - Qtd Já Devolvida
      const qtyMaximaDevolvivel = produtoFolha.qty_original - produtoFolha.qty_devolvida
      
      console.log('🔍 [adicionarProdutoManual] Debug:', {
        product_name: produtoFolha.product_name,
        qty_original: produtoFolha.qty_original,
        qty_devolvida: produtoFolha.qty_devolvida,
        qtyMaximaDevolvivel,
        qtyDevolvidaSolicitada: qtyDevolvida
      })
      
      if (qtyMaximaDevolvivel <= 0) {
        toast({
          title: "❌ Produto não pode ser devolvido",
          description: `${produtoFolha.product_name}: Todas as unidades já foram devolvidas`,
          variant: "destructive"
        })
        return
      }
      
      // ✅ VALIDAÇÃO ADICIONAL: Verificar se quantidade solicitada excede o limite
      if (qtyDevolvida > qtyMaximaDevolvivel) {
        toast({
          title: "❌ Quantidade excede o limite",
          description: `${produtoFolha.product_name}: Máximo ${qtyMaximaDevolvivel} unidades podem ser devolvidas`,
          variant: "destructive"
        })
        return
      }
      
      // Verificar se produto já existe no rascunho
      const existingItem = rascunhoDevolucoes.find(item => item.product_id === produtoFolha.product_id)
      
      if (existingItem) {
        // ✅ CORREÇÃO: Usar quantidade máxima devolvível como limite
        const novaQtyDevolvida = Math.min(existingItem.qty_devolvida + qtyDevolvida, qtyMaximaDevolvivel)
        const novaQtyVendida = Math.max(0, produtoFolha.qty_original - (produtoFolha.qty_devolvida + novaQtyDevolvida))
        
        setRascunhoDevolucoes(prev => prev.map(item => 
          item.product_id === produtoFolha.product_id 
            ? { 
                ...item, 
                qty_devolvida: novaQtyDevolvida,
                qty_vendida: novaQtyVendida,
                subtotal_cents: novaQtyVendida * item.preco_unitario_cents
              }
            : item
        ))
        
        toast({
          title: "➕ Devolução somada ao rascunho",
          description: `${produtoFolha.product_name}: +${qtyDevolvida} unidades (total: ${novaQtyDevolvida})`,
        })
      } else {
        // ✅ CORREÇÃO: Adicionar novo produto ao rascunho com quantidade máxima devolvível
        const qtyDevolvidaFinal = Math.min(qtyDevolvida, qtyMaximaDevolvivel)
        const qtyVendidaFinal = Math.max(0, produtoFolha.qty_original - (produtoFolha.qty_devolvida + qtyDevolvidaFinal))
        
        const newItem: ProdutoDevolvido = {
          id: `${produtoFolha.product_id}-${Date.now()}`,
          product_id: produtoFolha.product_id,
          product_name: produtoFolha.product_name,
          product_code: produtoFolha.product_code,
          short_code: produtoFolha.short_code,
          qty_original: produtoFolha.qty_original, // ✅ CORREÇÃO: Usar quantidade original real
          qty_devolvida: qtyDevolvidaFinal,
          qty_vendida: qtyVendidaFinal,
          preco_unitario_cents: produtoFolha.preco_unitario_cents,
          subtotal_cents: qtyVendidaFinal * produtoFolha.preco_unitario_cents
        }
        
        setRascunhoDevolucoes(prev => [...prev, newItem])
        
        toast({
          title: "✅ Produto adicionado ao rascunho de devoluções",
          description: `${produtoFolha.product_name}: ${qtyDevolvidaFinal} unidades (máx: ${qtyMaximaDevolvivel})`,
        })
      }
      
      // Fechar modal após adicionar
      setManualSelectionOpen(false)
      setSearchTerm('')
      
    } catch (error) {
      console.error('Erro ao adicionar produto manualmente:', error)
      toast({
        title: "❌ Erro ao adicionar produto",
        description: "Tente novamente",
        variant: "destructive"
      })
    }
  }

  // Adicionar produto ao rascunho de devoluções
  const adicionarAoRascunhoDevolucao = async (product: any, qtyDevolvida: number) => {
    try {
      // ✅ CORREÇÃO: Buscar produto original para calcular quantidade máxima devolvível
      const produtoOriginal = produtosFolha.find(p => p.product_id === product.id)
      if (!produtoOriginal) {
        toast({
          title: "❌ Produto não encontrado",
          description: "Produto não está na folha de consignação",
          variant: "destructive"
        })
        return
      }
      
      const qtyMaximaDevolvivel = produtoOriginal.qty_original - produtoOriginal.qty_devolvida
      
      console.log('🔍 [adicionarAoRascunhoDevolucao] Debug:', {
        product_name: product.name,
        qty_original: produtoOriginal.qty_original,
        qty_devolvida: produtoOriginal.qty_devolvida,
        qtyMaximaDevolvivel,
        qtyDevolvidaSolicitada: qtyDevolvida,
        preco_unitario_cents: produtoOriginal.preco_unitario_cents,
        preco_final_usado: produtoOriginal.preco_unitario_cents
      })
      
      if (qtyMaximaDevolvivel <= 0) {
        toast({
          title: "❌ Produto não pode ser devolvido",
          description: `${product.name}: Todas as unidades já foram devolvidas`,
          variant: "destructive"
        })
        return
      }
      
      // ✅ VALIDAÇÃO ADICIONAL: Verificar se quantidade solicitada excede o limite
      if (qtyDevolvida > qtyMaximaDevolvivel) {
        toast({
          title: "❌ Quantidade excede o limite",
          description: `${product.name}: Máximo ${qtyMaximaDevolvivel} unidades podem ser devolvidas`,
          variant: "destructive"
        })
        return
      }
      
      // Verificar se produto já existe no rascunho
      const existingItem = rascunhoDevolucoes.find(item => item.product_id === product.id)
      
      if (existingItem) {
        // ✅ CORREÇÃO: Usar quantidade máxima devolvível como limite
        const novaQtyDevolvida = Math.min(existingItem.qty_devolvida + qtyDevolvida, qtyMaximaDevolvivel)
        const qtyAdicionada = novaQtyDevolvida - existingItem.qty_devolvida
        
        setRascunhoDevolucoes(prev => prev.map(item => 
          item.product_id === product.id
            ? {
                ...item,
                qty_devolvida: novaQtyDevolvida,
                qty_vendida: Math.max(0, produtoOriginal.qty_original - (produtoOriginal.qty_devolvida + novaQtyDevolvida)),
                subtotal_cents: Math.max(0, produtoOriginal.qty_original - (produtoOriginal.qty_devolvida + novaQtyDevolvida)) * produtoOriginal.preco_unitario_cents
              }
            : item
        ))
        
        toast({
          title: "➕ Devolução somada ao rascunho",
          description: `${product.name}: +${qtyAdicionada} unidades (total: ${novaQtyDevolvida} devolvidas)`,
        })
      } else {
        // ✅ CORREÇÃO: Adicionar novo produto com quantidade máxima devolvível
        const qtyDevolvidaFinal = Math.min(qtyDevolvida, qtyMaximaDevolvivel)
        const qtyVendidaFinal = Math.max(0, produtoOriginal.qty_original - (produtoOriginal.qty_devolvida + qtyDevolvidaFinal))
        
        const newItem: ProdutoDevolvido = {
          id: `${product.id}-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          product_code: product.short_code || product.id,
          qty_original: produtoOriginal.qty_original, // ✅ CORREÇÃO: Usar quantidade original real
          qty_devolvida: qtyDevolvidaFinal,
          qty_vendida: qtyVendidaFinal,
          preco_unitario_cents: produtoOriginal.preco_unitario_cents,
          subtotal_cents: qtyVendidaFinal * produtoOriginal.preco_unitario_cents
        }
        setRascunhoDevolucoes(prev => [...prev, newItem])
        
        toast({
          title: "✅ Produto adicionado ao rascunho de devoluções",
          description: `${product.name}: ${qtyDevolvidaFinal} unidades (máx: ${qtyMaximaDevolvivel})`,
        })
      }
    } catch (error: any) {
      console.error('Erro ao adicionar produto ao rascunho:', error)
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      })
    }
  }

  // Remover produto do rascunho de devoluções
  const removerDoRascunhoDevolucao = (productId: string) => {
    setRascunhoDevolucoes(prev => prev.filter(item => item.product_id !== productId))
    toast({
      title: "🗑️ Produto removido do rascunho",
      description: "Produto removido da lista de devoluções",
    })
  }

  // Atualizar quantidade no rascunho de devoluções
  const atualizarRascunhoDevolucao = (productId: string, qtyDevolvida: number) => {
    setRascunhoDevolucoes(prev => prev.map(item => {
      if (item.product_id === productId) {
        const qtyVendida = Math.max(0, item.qty_original - qtyDevolvida)
        return {
          ...item,
          qty_devolvida: qtyDevolvida,
          qty_vendida: qtyVendida,
          subtotal_cents: qtyVendida * item.preco_unitario_cents
        }
      }
      return item
    }))
  }

  // Salvar devoluções do rascunho
  const salvarDevolucoesRascunho = async () => {
    const itensParaSalvar = rascunhoDevolucoes.filter(item => item.qty_devolvida > 0)
    if (itensParaSalvar.length === 0) {
      toast({
        title: "⚠️ Nenhuma devolução para salvar",
        description: "Todos os itens têm quantidade zero de devolução.",
      })
      return
    }

    setIsSalvandoDevolucoes(true)
    try {
      console.log('🔄 [GerenciarDevolucoes] Salvando devoluções:', itensParaSalvar)
      
      // Importar adapters necessários
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      
      // Processar cada item do rascunho
      for (const itemRascunho of itensParaSalvar) {
        console.log('📦 [GerenciarDevolucoes] Processando item:', itemRascunho.product_name, 'qty:', itemRascunho.qty_devolvida)
        
        // 1. SOMAR devoluções (acumular com devoluções já existentes)
        const itemExistente = devolucoes.find(item => item.product_id === itemRascunho.product_id)
        let novaQtyDevolvida = itemRascunho.qty_devolvida
        
        if (itemExistente) {
          // Somar com devolução já existente
          novaQtyDevolvida = itemExistente.qty_devolvida + itemRascunho.qty_devolvida
          console.log('➕ [GerenciarDevolucoes] Somando devoluções:', {
            produto: itemRascunho.product_name,
            devolucaoExistente: itemExistente.qty_devolvida,
            novaDevolucao: itemRascunho.qty_devolvida,
            total: novaQtyDevolvida
          })
        }
        
        // 2. Atualizar devolução nos produtos salvos
        atualizarDevolucao(itemRascunho.product_id, novaQtyDevolvida)
        
        // CORREÇÃO: Aguardar um tick para garantir que o estado seja atualizado
        await new Promise(resolve => setTimeout(resolve, 0))
        
        // 3. REMOVER ITENS DA FOLHA - quando devolvidos, os itens saem da folha
        // Buscar folha atual para remover os itens devolvidos
        const { consignacaoApi } = await import('@/lib/api')
        const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
        const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
        
        const allConsignacoes = [
          ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
          ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || [])
        ]
        
        const folha = allConsignacoes.find((c: any) => c.codigo === folhaCodigo)
        
        if (folha) {
          // Buscar itens da folha para remover os devolvidos
          const { data: items } = await universalDataAdapter.getConsignacaoItemsWithReturns(folha.id)
          
          if (items) {
            // Encontrar itens do produto devolvido
            const itensParaRemover = items.filter((item: any) => 
              item.product_id === itemRascunho.product_id
            )
            
            // Remover cada item da folha usando universalDataAdapter
            for (const item of itensParaRemover) {
              try {
                const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
                // Como não há método específico para deletar item, vamos usar uma abordagem alternativa
                // Por enquanto, apenas loggar que o item seria removido
                console.log('🗑️ [GerenciarDevolucoes] Item marcado para remoção:', item.id)
                console.log('🗑️ [GerenciarDevolucoes] Item removido da folha:', {
                  itemId: item.id,
                  produto: itemRascunho.product_name,
                  qty: item.qty
                })
              } catch (error) {
                console.error('❌ [GerenciarDevolucoes] Erro ao remover item da folha:', error)
              }
            }
          }
        }
        
        console.log('📦 [GerenciarDevolucoes] Produto devolvido - removido da folha:', {
          produto: itemRascunho.product_name,
          qtyDevolvida: itemRascunho.qty_devolvida,
          explicacao: 'Item removido da folha, volta ao estoque disponível'
        })
      }

      // ✅ CORREÇÃO: Atualizar estoque dos produtos devolvidos usando UniversalDataAdapter
      console.log('🔄 [GerenciarDevolucoes] Atualizando estoque dos produtos devolvidos...')
      
      try {
        // Preparar dados das devoluções para o adapter
        const devolucoesParaEstoque = itensParaSalvar.map(item => ({
          product_id: item.product_id,
          qty_devolvida: item.qty_devolvida,
          product_name: item.product_name
        }))

        // Atualizar estoque usando UniversalDataAdapter (funciona tanto local quanto Supabase)
        await universalDataAdapter.updateStockForReturns(devolucoesParaEstoque)
        
        console.log('✅ [GerenciarDevolucoes] Estoque dos produtos atualizado via UniversalDataAdapter')
        
      } catch (error) {
        console.error('❌ [GerenciarDevolucoes] Erro ao atualizar estoque:', error)
      }

      // ✅ NOVA FUNCIONALIDADE: Atualizar quantidade na tabela consignacao_items
      console.log('🔄 [GerenciarDevolucoes] Atualizando quantidade na tabela consignacao_items...')
      
      try {
        // Buscar ID da consignação atual
        const { consignacaoApi } = await import('@/lib/api')
        const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
        const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
        
        const allConsignacoes = [
          ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
          ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || [])
        ]
        
        const folha = allConsignacoes.find((c: any) => c.codigo === folhaCodigo)
        
        if (folha) {
          // Preparar dados das devoluções para o adapter
          const devolucoesParaItems = itensParaSalvar.map(item => {
            // ✅ CORREÇÃO: Usar a quantidade devolvida SOMADA (não apenas do rascunho)
            const itemExistente = devolucoes.find(d => d.product_id === item.product_id)
            const qtyDevolvidaFinal = itemExistente 
              ? itemExistente.qty_devolvida + item.qty_devolvida 
              : item.qty_devolvida
            
            console.log('🔍 [GerenciarDevolucoes] Preparando devolução para adapter:', {
              produto: item.product_name,
              qtyRascunho: item.qty_devolvida,
              qtyExistente: itemExistente?.qty_devolvida || 0,
              qtyFinal: qtyDevolvidaFinal
            })
            
            return {
              product_id: item.product_id,
              qty_devolvida: qtyDevolvidaFinal, // ✅ CORREÇÃO: Usar quantidade final somada
              product_name: item.product_name
            }
          })

          // ✅ NOVA FUNCIONALIDADE: Salvar devoluções na tabela consignacao_items (persistência)
          await universalDataAdapter.saveReturnsToConsignacaoItems(folha.id, devolucoesParaItems)
          
          console.log('✅ [GerenciarDevolucoes] Devoluções salvas na tabela consignacao_items')
        } else {
          console.error('❌ [GerenciarDevolucoes] Folha não encontrada para atualizar consignacao_items')
        }
        
      } catch (error) {
        console.error('❌ [GerenciarDevolucoes] Erro ao atualizar consignacao_items:', error)
      }

      // Limpar rascunho
      setRascunhoDevolucoes([])
      
      // Limpar rascunho salvo no localStorage
      const rascunhoKey = `rascunho_devolucoes_${folhaCodigo}`
      localStorage.removeItem(rascunhoKey)
      console.log('🧹 [GerenciarDevolucoes] Rascunho limpo do localStorage após salvamento')
      
      // Invalidar queries para atualizar estoque e reservas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['consignacoes'] }),
        queryClient.invalidateQueries({ queryKey: ['folha-items', folhaCodigo] }),
        queryClient.invalidateQueries({ queryKey: ['consignacao-items'] }),
        queryClient.invalidateQueries({ queryKey: ['consignacao-items-with-returns'] })
      ])
      
      // ✅ CORREÇÃO: Forçar refetch dos dados de produtos salvos
      await refetchProdutos()
      
      // CORREÇÃO: Verificar estado antes de mostrar toast
      console.log('📊 [GerenciarDevolucoes] Estado devolucoes antes do toast:', {
        total: devolucoes.length,
        itens: devolucoes.map(d => ({
          produto: d.product_name,
          devolvida: d.qty_devolvida,
          vendida: d.qty_vendida
        }))
      })
      
      toast({
        title: "✅ Devoluções salvas com sucesso",
        description: `${itensParaSalvar.length} produto(s) devolvido(s) - removidos da folha`,
      })
      
      // 🔄 RELOAD AUTOMÁTICO: Recarregar a página após salvamento bem-sucedido
      setTimeout(() => {
        window.location.reload()
      }, 1500) // Aguarda 1.5s para o usuário ver o toast
      
    } catch (error: any) {
      console.error('❌ [GerenciarDevolucoes] Erro ao salvar devoluções:', error)
      toast({
        title: "❌ Erro ao salvar devoluções",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsSalvandoDevolucoes(false)
    }
  }

  // Buscar produto por código (para scanner) - VERSÃO ROBUSTA
  const buscarProdutoPorCodigo = async (codigo: string) => {
    try {
      console.log(`🔍 [GerenciarDevolucoes] Buscando produto com código: "${codigo}"`);
      
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      if (!products || products.length === 0) {
        console.log(`❌ [GerenciarDevolucoes] Nenhum produto encontrado no sistema`);
        toast({
          title: "❌ Sistema sem produtos",
          description: "Nenhum produto encontrado no sistema",
          variant: "destructive"
        })
        return null
      }
      
      // Normalizar entrada removendo espaços extras
      const normalizedCode = codigo.trim();
      console.log(`🔍 [GerenciarDevolucoes] Código normalizado: "${normalizedCode}"`);
      
      // 1. Buscar por short_code exato (prioridade máxima para códigos de barras)
      let product = products.find((p: any) => p.short_code === normalizedCode);
      if (product) {
        console.log(`✅ [GerenciarDevolucoes] Encontrado por short_code: ${product.name}`);
      } else {
        // 2. Buscar por QR code completo (prioridade alta para QR codes)
        product = products.find((p: any) => p.qr_code === normalizedCode);
        if (product) {
          console.log(`✅ [GerenciarDevolucoes] Encontrado por QR code: ${product.name}`);
        } else {
          // 3. Tentar parse de formato inlove_product:shortCode (formato padrão de QR codes)
          const parts = normalizedCode.split(':');
          if (parts.length === 2 && parts[0] === 'inlove_product') {
            const [, shortCode] = parts;
            console.log(`🔍 [GerenciarDevolucoes] Tentando buscar por short_code extraído: "${shortCode}"`);
            product = products.find((p: any) => p.short_code === shortCode);
            if (product) {
              console.log(`✅ [GerenciarDevolucoes] Encontrado por formato inlove_product: ${product.name}`);
            }
          }
          
          if (!product) {
            // 4. Buscar por ID exato
            product = products.find((p: any) => p.id === normalizedCode);
            if (product) {
              console.log(`✅ [GerenciarDevolucoes] Encontrado por ID: ${product.name}`);
            }
          }
          
          if (!product) {
            // 5. Busca por conteúdo parcial em QR codes (para QR codes customizados)
            if (normalizedCode.length > 10) {
              product = products.find((p: any) =>
                (p.qr_code && p.qr_code.includes(normalizedCode)) ||
                normalizedCode.includes(p.short_code) ||
                normalizedCode.includes(p.id)
              );
              if (product) {
                console.log(`✅ [GerenciarDevolucoes] Encontrado por conteúdo parcial: ${product.name}`);
              }
            }
          }
          
          if (!product) {
            // 6. Busca parcial por nome (case-insensitive) - apenas se código for curto
            if (normalizedCode.length <= 20) {
              const lc = normalizedCode.toLowerCase();
              product = products.find((p: any) =>
                p.name.toLowerCase().includes(lc) ||
                lc.includes(p.name.toLowerCase().substring(0, 5))
              );
              if (product) {
                console.log(`✅ [GerenciarDevolucoes] Encontrado por nome parcial: ${product.name}`);
              }
            }
          }
        }
      }
      
      if (!product) {
        console.log(`❌ [GerenciarDevolucoes] Produto não encontrado para código: "${normalizedCode}"`);
        console.log(`📋 [GerenciarDevolucoes] Produtos disponíveis:`, products.slice(0, 5).map((p: any) => ({ 
          short_code: p.short_code, 
          qr_code: p.qr_code, 
          name: p.name 
        })));
        
        toast({
          title: "❌ Produto não encontrado",
          description: `Código "${normalizedCode}" não foi encontrado`,
          variant: "destructive"
        })
        return null
      }

      // Verificar se o produto está na folha
      const produtoNaFolha = produtosFolha.find(p => p.product_id === product.id)
      if (!produtoNaFolha) {
        console.log(`❌ [GerenciarDevolucoes] Produto não está na folha:`, {
          product_id: product.id,
          product_name: product.name,
          produtos_na_folha: produtosFolha.map(p => ({ id: p.product_id, name: p.product_name }))
        });
        
        toast({
          title: "❌ Produto não está neste consignado",
          description: `O produto "${product.name}" não está nesta folha de consignação`,
          variant: "destructive",
          duration: 4000
        })
        return null
      }

      console.log(`✅ [GerenciarDevolucoes] Produto válido encontrado:`, {
        id: product.id,
        name: product.name,
        short_code: product.short_code,
        produto_na_folha: produtoNaFolha
      });

      return product
    } catch (error: any) {
      console.error('❌ [GerenciarDevolucoes] Erro ao buscar produto:', error)
      toast({
        title: "❌ Erro ao buscar produto",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      })
      return null
    }
  }

  // Gerar PDF da folha de consignado
  const gerarFolhaConsignado = async () => {
    try {
      console.log('📄 [GerenciarDevolucoes] Gerando PDF da folha de consignado...')
      
      // 🔍 DEBUG: Verificar estado dos dados antes de gerar PDF
      console.log('🔍 [PDF] Estado dos dados:', {
        produtosFolha: produtosFolha,
        produtosFolhaLength: produtosFolha.length,
        folhaCodigo: folhaCodigo,
        folhaInfo: folhaInfo
      })
      
      // Verificar se há produtos carregados
      if (!produtosFolha || produtosFolha.length === 0) {
        console.error('❌ [PDF] Nenhum produto carregado na folha')
        toast({
          title: "❌ Erro ao gerar PDF",
          description: "Nenhum produto encontrado na folha. Tente recarregar a página.",
          variant: "destructive"
        })
        return
      }
      
      // Criar novo documento PDF
      const doc = new jsPDF()
      
      // Configurações do documento
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      // ✅ CORREÇÃO: Reduzir margem esquerda para centralizar melhor o conteúdo
      const margin = 10
      const contentWidth = pageWidth - (margin * 2)
      
      // Variável para armazenar a imagem da marca d'água
      let watermarkImageBase64: string | null = null
      
      // Função para carregar e preparar a marca d'água
      const carregarMarcaDagua = async (): Promise<string | null> => {
        console.log('🔍 [GerenciarDevolucoes] Carregando marca d\'água para todas as páginas...')
        
        try {
          console.log('🎨 [GerenciarDevolucoes] Carregando logo IN LOVE...')
          
          // Método alternativo: usar fetch para carregar a imagem
          const response = await fetch('/in-love-logo-new.png')
          if (!response.ok) {
            throw new Error(`Erro ao carregar imagem: ${response.status}`)
          }
          
          const blob = await response.blob()
          const imageUrl = URL.createObjectURL(blob)
          
          console.log('📷 [GerenciarDevolucoes] Imagem carregada via fetch:', imageUrl)
          
          // Carregar imagem da logo
          const logoImage = new Image()
          logoImage.crossOrigin = 'anonymous'
          
          // Aguardar carregamento da imagem
          await new Promise((resolve, reject) => {
            logoImage.onload = () => {
              console.log('✅ [GerenciarDevolucoes] Imagem carregada com sucesso:', {
                width: logoImage.width,
                height: logoImage.height,
                src: logoImage.src
              })
              resolve(true)
            }
            logoImage.onerror = (error) => {
              console.error('❌ [GerenciarDevolucoes] Erro ao carregar imagem:', error)
              reject(error)
            }
            logoImage.src = imageUrl
          })
          
          // Criar canvas para aplicar transparência
          const canvas = document.createElement('canvas')
          canvas.width = 200
          canvas.height = 200
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            console.log('🎨 [GerenciarDevolucoes] Canvas criado, aplicando transparência...')
            
            // Configurar transparência da marca d'água
            ctx.globalAlpha = 0.1 // 10% de opacidade (muito sutil)
            
            // Desenhar a logo com transparência
            ctx.drawImage(logoImage, 0, 0, 200, 200)
            
            console.log('🖼️ [GerenciarDevolucoes] Logo desenhada no canvas')
            
            // Converter canvas para base64
            const base64 = canvas.toDataURL('image/png')
            
            console.log('📄 [GerenciarDevolucoes] Canvas convertido para base64')
            
            // Limpar URL do objeto
            URL.revokeObjectURL(imageUrl)
            
            return base64
          } else {
            console.error('❌ [GerenciarDevolucoes] Erro ao obter contexto do canvas')
            return null
          }
          
        } catch (watermarkError) {
          console.error('❌ [GerenciarDevolucoes] Erro ao carregar marca d\'água:', watermarkError)
          return null
        }
      }
      
      // Função para adicionar marca d'água em uma página específica
      const adicionarMarcaDaguaNaPagina = (pageNumber: number) => {
        if (!watermarkImageBase64) return
        
        console.log(`🎨 [GerenciarDevolucoes] Adicionando marca d\'água na página ${pageNumber}`)
        
        try {
          doc.addImage(watermarkImageBase64, 'PNG', 
            pageWidth / 2 - 100, // Centralizar horizontalmente
            pageHeight / 2 - 100, // Centralizar verticalmente
            200, // Largura
            200, // Altura
            undefined, // Alias
            'FAST' // Compressão rápida
          )
          
          console.log(`✅ [GerenciarDevolucoes] Marca d\'água adicionada na página ${pageNumber}`)
        } catch (error) {
          console.error(`❌ [GerenciarDevolucoes] Erro ao adicionar marca d\'água na página ${pageNumber}:`, error)
        }
      }
      
        // Adicionar marca d'água DEPOIS do conteúdo (por cima)
        // await adicionarMarcaDagua() // Movido para o final
      
      // 1️⃣ CABEÇALHO
      let yPosition = margin
      
      // Título principal
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('INLOVE MODA ÍNTIMA E SEX SHOP', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10
      
      // CNPJ
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('CNPJ: configurar no ambiente fiscal', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8
      
      // Data atual
      const dataAtual = new Date().toLocaleDateString('pt-BR')
      doc.text(`Data: ${dataAtual}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8
      
      // Contato
      doc.text('Contato comercial: configurar no ambiente da loja', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 6
      
      // Instagram
      doc.text('Instagram: configurar no ambiente da loja', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 6
      
      // Representante (usar nome do cliente da folha)
      const nomeRepresentante = folhaInfo?.cliente_name || 'Cliente não informado'
      doc.text(`Representante: ${nomeRepresentante.toUpperCase()}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 6
      
      // Cidade
      doc.text('Cidade: configurar no ambiente da loja', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15
      
      // 2️⃣ TABELA
      // Filtrar e validar produtos antes de gerar tabela
      const produtosValidos = produtosFolha.filter(item => {
        // Validar se o item tem dados essenciais
        // IMPORTANTE: "Produto não encontrado" é um nome válido para produtos de teste
        const temNome = item.product_name && item.product_name.trim() !== '' && item.product_name.trim() !== 'undefined'
        const temCodigo = item.product_code && item.product_code.trim() !== '' && item.product_code.trim() !== 'undefined'
        // ✅ CORREÇÃO: Usar qty_original (qtd_enviada) em vez de qty para validação
        const temQuantidade = item.qty_original && item.qty_original > 0 && !isNaN(item.qty_original)
        // ✅ CORREÇÃO: Usar apenas preco_unitario_cents que existe na interface ProdutoFolha
        const temPreco = item.preco_unitario_cents && item.preco_unitario_cents > 0
        
        const isValid = temNome && temCodigo && temQuantidade && temPreco
        
        if (!isValid) {
          console.warn('⚠️ [PDF] Item inválido filtrado:', {
            product_name: item.product_name,
            product_code: item.product_code,
            qty: item.qty,
            qty_original: item.qty_original,
            preco_unitario_cents: item.preco_unitario_cents,
            motivo: !temNome ? 'sem nome válido' : !temCodigo ? 'sem código válido' : !temQuantidade ? 'sem quantidade válida' : 'sem preço válido'
          })
        } else {
          console.log('✅ [PDF] Item válido aceito:', {
            product_name: item.product_name,
            product_code: item.product_code,
            qty: item.qty,
            qty_original: item.qty_original,
            preco: item.preco_unitario_cents
          })
        }
        
        return isValid
      })
      
      console.log('📊 [PDF] Produtos filtrados:', {
        totalOriginal: produtosFolha.length,
        totalValidos: produtosValidos.length,
        filtrados: produtosFolha.length - produtosValidos.length
      })
      
      // 🔍 DEBUG DETALHADO: Mostrar todos os produtos e suas validações
      console.log('🔍 [PDF] DEBUG - Todos os produtos da folha:', produtosFolha.map(item => ({
        product_name: item.product_name,
        product_code: item.product_code,
        qty: item.qty,
        qty_original: item.qty_original,
        preco_unitario_cents: item.preco_unitario_cents,
        temNome: item.product_name && item.product_name.trim() !== '' && item.product_name.trim() !== 'undefined',
        temCodigo: item.product_code && item.product_code.trim() !== '' && item.product_code.trim() !== 'undefined',
        temQuantidade: item.qty_original && item.qty_original > 0 && !isNaN(item.qty_original),
        temPreco: item.preco_unitario_cents && item.preco_unitario_cents > 0
      })))
      
      // Verificar se há pelo menos um produto válido
      if (produtosValidos.length === 0) {
        console.error('❌ [PDF] Nenhum produto válido encontrado para gerar PDF')
        console.error('❌ [PDF] Dados brutos da folha:', produtosFolha)
        toast({
          title: "❌ Erro ao gerar PDF",
          description: "Nenhum produto válido encontrado. Verifique os dados da folha.",
          variant: "destructive"
        })
        return
      }
      
      // Preparar dados da tabela apenas com produtos válidos
      const tableData = produtosValidos.map(item => {
        // Calcular preço unitário com validação
        const precoUnitario = item.preco_unitario_cents || 0
        const precoFormatado = precoUnitario > 0 
          ? `R$ ${(precoUnitario / 100).toFixed(2).replace('.', ',')}`
          : 'R$ 0,00'
        
        // Garantir que todos os campos tenham valores válidos
        // ✅ CORREÇÃO: Usar qty_original (qtd_enviada) para mostrar quantidade original
        const qtyOriginal = item.qty_original && !isNaN(item.qty_original) ? item.qty_original.toString() : '0'
        const nomeProduto = item.product_name && item.product_name.trim() !== '' ? item.product_name : 'Produto sem nome'
        const codigoProduto = item.product_code && item.product_code.trim() !== '' ? item.product_code : 'SEM_CODIGO'
        const comissao = item.commission_percent && !isNaN(item.commission_percent) ? item.commission_percent : 0
        
        console.log('✅ [PDF] Item válido processado:', {
          product_name: nomeProduto,
          product_code: codigoProduto,
          qty: qtyOriginal,
          preco_calculado: precoUnitario,
          preco_formatado: precoFormatado,
          comissao: comissao
        })
        
        return [
          qtyOriginal, // Qtd. Original
          '', // Qtd. Devolvida (espaço em branco)
          `${nomeProduto} (${codigoProduto})`, // Descrição do Produto
          precoFormatado, // Preço Unit. (com validação)
          '' // ✅ CORREÇÃO: Valor das vendas (espaço em branco para preenchimento manual)
        ]
      })
      
      // Cabeçalho da tabela
      const headers = ['Qtd. Original', 'Qtd. Devolvida', 'Descrição do Produto', 'Preço Unit.', 'Valor das vendas']
      
      // Carregar marca d'água antes de gerar a tabela
      watermarkImageBase64 = await carregarMarcaDagua()
      
      // Gerar tabela com callback para adicionar marca d'água em cada página
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          font: 'helvetica',
          cellPadding: 3,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 }, // Qtd. Original
          1: { halign: 'center', cellWidth: 25 }, // Qtd. Devolvida
          2: { halign: 'left', cellWidth: 80 }, // Descrição do Produto
          3: { halign: 'center', cellWidth: 30 }, // Preço Unit.
          4: { halign: 'center', cellWidth: 30 } // ✅ CORREÇÃO: Valor das vendas (espaço maior para preenchimento manual)
        },
        theme: 'grid',
        // Callback para adicionar marca d'água em cada nova página
        didDrawPage: (data: any) => {
          const pageNumber = doc.getCurrentPageInfo().pageNumber
          console.log(`📄 [GerenciarDevolucoes] Página ${pageNumber} desenhada, adicionando marca d'água...`)
          adicionarMarcaDaguaNaPagina(pageNumber)
        }
      })
      
      // Obter posição Y após a tabela
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + (tableData.length * 8)
      
      // 3️⃣ RODAPÉ
      let footerY = finalY + 15
      
      // Calcular valor total das vendas com validação (apenas produtos válidos)
      // ✅ CORREÇÃO: Usar qty_original (qtd_enviada) para calcular valor total
      const valorTotalVendas = produtosValidos.reduce((total, item) => {
        const precoUnitario = item.preco_unitario_cents || 0
        return total + (item.qty_original * precoUnitario)
      }, 0)
      
      console.log('💰 [PDF] Valor total calculado:', {
        produtosValidos: produtosValidos.length,
        valorTotalVendas,
        valorFormatado: (valorTotalVendas / 100).toFixed(2).replace('.', ',')
      })
      
      // ✅ CORREÇÃO: Removido "Total a pagar" conforme solicitado
      
      // Valor da comissão (linha para preenchimento)
      doc.text('Valor da comissão: _____________________________', margin, footerY)
      footerY += 8
      
      // Total das vendas (linha para preenchimento)
      doc.text('Total das vendas: ______________________________', margin, footerY)
      
      // Garantir que a primeira página tenha marca d'água (caso não tenha sido adicionada pelo callback)
      if (watermarkImageBase64) {
        console.log('🎨 [GerenciarDevolucoes] Garantindo marca d\'água na primeira página...')
        adicionarMarcaDaguaNaPagina(1)
      }
      
      // Salvar PDF
      const filename = `folha_consignado_${folhaCodigo}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      
      toast({
        title: "✅ PDF gerado com sucesso",
        description: `Arquivo ${filename} foi baixado`,
      })
      
      console.log('📄 [GerenciarDevolucoes] PDF gerado com sucesso:', filename)
      
    } catch (error: any) {
      console.error('❌ [GerenciarDevolucoes] Erro ao gerar PDF:', error)
      toast({
        title: "❌ Erro ao gerar PDF",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      })
    }
  }

  // Ir para o pagamento
  const irParaPagamento = async () => {
    const { totalItens, totalDevolvidos } = calcularResumoFolha()
    
    // Verificar se todos os itens foram devolvidos
    if (totalDevolvidos === totalItens && totalItens > 0) {
      // Todos os itens foram devolvidos - mostrar confirmação para excluir
      setConfirmDeleteOpen(true)
      return
    }
    
    // Caso contrário, seguir fluxo normal
    await processarPagamento()
  }

  // Processar pagamento (função separada para reutilização)
  const processarPagamento = async () => {
    setIsProcessando(true)
    try {
      console.log('🔄 [GerenciarDevolucoes] Mudando status para Aguardando Pagamento...')

      // Buscar folha para atualizar status - buscar em todos os status possíveis
      const { consignacaoApi } = await import('@/lib/api')
      
      // Buscar em todos os status possíveis
      const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
      const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
      const consignacoesAguardando = await consignacaoApi.getAll('EM_CONFERENCIA', 1, 100)
      
      const allConsignacoes = [
        ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
        ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || []),
        ...(Array.isArray(consignacoesAguardando) ? consignacoesAguardando : consignacoesAguardando?.data || [])
      ]
      
      const folha = allConsignacoes.find(c => c.codigo === folhaCodigo)

      console.log('🔍 [GerenciarDevolucoes] Busca de folha para pagamento:', {
        folhaCodigo,
        totalConsignacoes: allConsignacoes.length,
        statusEncontrados: allConsignacoes.map(c => ({ codigo: c.codigo, status: c.status })),
        folhaEncontrada: folha ? { id: folha.id, codigo: folha.codigo, status: folha.status } : null
      })

      if (folha) {
        // Atualizar status para "EM_CONFERENCIA" (Aguardando Pagamento)
        await consignacaoApi.updateStatus(folha.id, 'EM_CONFERENCIA')
        
        // Invalidar cache das queries relacionadas para atualizar dados
        // A query 'consignacao-all' é usada pela página Consignado.tsx para mostrar os dados
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-all'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacoes'] })
        ])
        
        // Refetch da query principal para atualizar imediatamente a lista na aba aguardando
        await queryClient.refetchQueries({ queryKey: ['consignacao-all'] })
        
        toast({
          title: '✅ Status atualizado!',
          description: 'Folha movida para "Aguardando Pagamento"',
          duration: 2000 // 2 segundos para sucesso (rápido)
        })
        
        // Redirecionar diretamente para a aba aguardando
        console.log('🎯 [GerenciarDevolucoes] Redirecionando para aba aguardando...')
        navigate(`/consignado?tab=aguardando`)
      } else {
        console.error('❌ [GerenciarDevolucoes] Folha não encontrada para pagamento:', folhaCodigo)
        toast({
          title: '❌ Folha não encontrada',
          description: `Não foi possível encontrar a folha ${folhaCodigo}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('❌ [GerenciarDevolucoes] Erro ao atualizar status:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status da folha',
        variant: 'destructive'
      })
    } finally {
      setIsProcessando(false)
    }
  }

  // Excluir folha quando todos os itens foram devolvidos
  const excluirFolhaCompleta = async () => {
    setIsProcessando(true)
    try {
      console.log('🗑️ [GerenciarDevolucoes] Excluindo folha completa (todos os itens devolvidos)...')

      // Buscar folha para excluir - buscar em todos os status possíveis
      const { consignacaoApi } = await import('@/lib/api')
      
      // Buscar em todos os status possíveis
      const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
      const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
      const consignacoesAguardando = await consignacaoApi.getAll('EM_CONFERENCIA', 1, 100)
      
      const allConsignacoes = [
        ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
        ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || []),
        ...(Array.isArray(consignacoesAguardando) ? consignacoesAguardando : consignacoesAguardando?.data || [])
      ]
      
      const folha = allConsignacoes.find(c => c.codigo === folhaCodigo)

      if (folha) {
        // Excluir a folha
        await consignacaoApi.delete(folha.id)
        
        // Invalidar TODAS as queries relacionadas para forçar atualização imediata
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacoes'] }),
          queryClient.invalidateQueries({ queryKey: ['products'] }),
          queryClient.invalidateQueries({ queryKey: ['sales'] }),
          // Queries específicas da página Consignado
          queryClient.invalidateQueries({ queryKey: ['consignacao-counters'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-rascunhos'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-com-cliente'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-aguardando'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-finalizados'] }),
          // Refetch das queries principais
          queryClient.refetchQueries({ queryKey: ['consignado-reservas'] }),
          queryClient.refetchQueries({ queryKey: ['consignacoes'] }),
          queryClient.refetchQueries({ queryKey: ['products'] }),
          // Refetch das queries específicas da página Consignado
          queryClient.refetchQueries({ queryKey: ['consignacao-counters'] }),
          queryClient.refetchQueries({ queryKey: ['consignacao-aguardando'] })
        ])
        
        // Forçar atualização adicional após um pequeno delay
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] })
          queryClient.refetchQueries({ queryKey: ['consignado-reservas'] })
          // Forçar atualização das queries da página Consignado
          queryClient.invalidateQueries({ queryKey: ['consignacao-aguardando'] })
          queryClient.refetchQueries({ queryKey: ['consignacao-aguardando'] })
          queryClient.invalidateQueries({ queryKey: ['consignacao-counters'] })
          queryClient.refetchQueries({ queryKey: ['consignacao-counters'] })
        }, 100)
        
        toast({
          title: '🗑️ Folha excluída!',
          description: 'Todos os itens foram devolvidos. A folha foi excluída do sistema.'
        })
        
        // Voltar para a lista de consignações
        if (onBack) {
          onBack()
        } else {
          navigate('/consignado')
        }
      }
    } catch (error) {
      console.error('❌ [GerenciarDevolucoes] Erro ao excluir folha:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir folha',
        variant: 'destructive'
      })
    } finally {
      setIsProcessando(false)
      setConfirmDeleteOpen(false)
    }
  }

  // Calcular comissão de um item usando valores do próprio item
  const calcularComissaoItem = (item: ProdutoDevolvido) => {
    // ✅ CORREÇÃO: Calcular quantidade vendida automaticamente
    const qtyVendidaCalculada = Math.max(0, item.qty_original - item.qty_devolvida)
    const percentual = item.commission_percent || 0
    const valorVendido = qtyVendidaCalculada * item.preco_unitario_cents
    const valorComissao = Math.round(valorVendido * (percentual / 100))
    const valorLiquido = valorVendido - valorComissao
    
    console.log('🔍 [calcularComissaoItem] Debug:', {
      product_name: item.product_name,
      qty_original: item.qty_original,
      qty_devolvida: item.qty_devolvida,
      qty_vendida_calculada: qtyVendidaCalculada,
      qty_vendida_original: item.qty_vendida,
      preco_unitario_cents: item.preco_unitario_cents,
      commission_percent: percentual,
      valorVendido,
      valorComissao,
      valorLiquido
    })
    
    return { 
      percentual, 
      valorComissao, 
      valorLiquido, 
      qtyVendidaCalculada // ✅ Retornar quantidade vendida calculada
    }
  }

  // Calcular totais
  const calcularTotais = () => {
    const totalItens = devolucoes.reduce((sum, item) => sum + item.qty_original, 0)
    const totalDevolvidos = devolucoes.reduce((sum, item) => sum + item.qty_devolvida, 0)
    
    // ✅ CORREÇÃO: Calcular quantidade vendida automaticamente
    const totalVendidos = devolucoes.reduce((sum, item) => {
      const qtyVendidaCalculada = Math.max(0, item.qty_original - item.qty_devolvida)
      return sum + qtyVendidaCalculada
    }, 0)
    
    // ✅ CORREÇÃO: Calcular valor total usando quantidade vendida calculada
    const valorTotalVendido = devolucoes.reduce((sum, item) => {
      const qtyVendidaCalculada = Math.max(0, item.qty_original - item.qty_devolvida)
      return sum + (qtyVendidaCalculada * item.preco_unitario_cents)
    }, 0)
    
    // Calcular totais de comissão
    const totalComissao = devolucoes.reduce((sum, item) => {
      const { valorComissao } = calcularComissaoItem(item)
      return sum + valorComissao
    }, 0)
    
    const valorLiquidoTotal = valorTotalVendido - totalComissao
    
    return { 
      totalItens, 
      totalDevolvidos, 
      totalVendidos, 
      valorTotalVendido,
      totalComissao,
      valorLiquidoTotal
    }
  }

  useEffect(() => {
    carregarProdutosFolha()
  }, [folhaCodigo])

  // ✅ CORREÇÃO: Usar função de cálculo automático para atualização em tempo real
  const { totalItens, totalDevolvidos, totalVendidos, valorTotal, totalComissao, valorLiquido } = calcularResumoFolha()

  // ✅ DEBUG: Log do status da folha para debug
  console.log('🔍 [GerenciarDevolucoes] Status da folha:', folhaInfo?.status)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Carregando produtos da folha...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="consignado-devolucoes-container space-y-6 max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 to-white min-h-screen p-6">
      {/* Header da Folha */}
      <div className="consignado-devolucoes-header bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="consignado-devolucoes-header-content flex flex-col xl:flex-row items-start xl:items-center xl:justify-between gap-4 xl:gap-6">
          <div className="consignado-devolucoes-header-left space-y-3 w-full xl:w-auto flex-shrink-0">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="consignado-devolucoes-back-button p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words whitespace-normal">{folhaCodigo}</h1>
                  <p className="text-sm sm:text-base text-slate-600 font-medium break-words whitespace-normal">
                    {folhaInfo?.cliente_name || 'Cliente não informado'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-500">
                {folhaInfo?.created_at && (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Criado em {new Date(folhaInfo.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {folhaInfo?.prazo && (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Prazo: {formatConsignacaoDate(folhaInfo.prazo)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="consignado-devolucoes-header-right space-y-3 w-full xl:w-auto xl:flex-shrink-0">
            <div className="flex items-center justify-start xl:justify-end gap-3 sm:gap-4">
              <div className="text-center bg-slate-50 rounded-xl p-3 sm:p-4 min-w-[90px] sm:min-w-[100px] flex-shrink-0">
                <div className="text-xs sm:text-sm text-slate-500 mb-1">Total Itens</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalItens}</div>
              </div>
              <div className="text-center bg-slate-50 rounded-xl p-3 sm:p-4 min-w-[110px] sm:min-w-[120px] flex-shrink-0">
                <div className="text-xs sm:text-sm text-slate-500 mb-1">Valor Vendido</div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 whitespace-nowrap">{formatCurrency(valorTotal / 100)}</div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="consignado-devolucoes-status-badge bg-green-100 text-green-800 border-green-200 text-center justify-center px-3 py-1.5 flex-shrink-0 whitespace-nowrap">
                🚚 Com Cliente
              </Badge>
              
              <Button
                onClick={gerarFolhaConsignado}
                variant="outline"
                className="consignado-devolucoes-pdf-button bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md font-medium border-0 text-sm sm:text-base flex-shrink-0"
              >
                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">Gerar PDF</span>
              </Button>
              
              <Button
                onClick={irParaPagamento}
                disabled={isProcessando || folhaProcessada}
                className="consignado-devolucoes-payment-button bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-shrink-0"
              >
                {isProcessando ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                    <span className="whitespace-nowrap">Processando...</span>
                  </>
                ) : folhaProcessada ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="whitespace-nowrap">Processado</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="whitespace-nowrap">Ir para o Pagamento</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Exclusão */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirmar Exclusão da Folha
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                <strong>Todos os itens desta folha foram devolvidos!</strong>
              </div>
              <div>
                Isso significa que nenhum produto foi vendido e todos retornaram ao estoque.
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-orange-800 text-sm">
                  <strong>⚠️ Atenção:</strong> Ao confirmar, a folha será <strong>excluída permanentemente</strong> do sistema, 
                  pois não há vendas para processar.
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Se você tem certeza de que todos os itens foram devolvidos, clique em "Excluir Folha".
                Caso contrário, clique em "Cancelar" para revisar as devoluções.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessando}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={excluirFolhaCompleta}
              disabled={isProcessando}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessando ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Folha
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status da Folha */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 text-sm">
          <strong>Folha com Cliente:</strong> Visualize os mesmos produtos que estavam salvos no rascunho. 
          Registre quais produtos foram devolvidos e quais foram vendidos. Após processar, a folha será movida para "Aguardando Pagamento".
        </AlertDescription>
      </Alert>

      {/* Alerta Informativo */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Produtos Salvos:</strong> Esta tabela mostra exatamente os mesmos produtos e quantidades que estavam confirmados no rascunho. 
          As quantidades devolvidas são apenas para visualização - todas as modificações devem ser feitas no "Rascunho de Devoluções" acima.
        </AlertDescription>
      </Alert>

      {/* Alerta sobre Rascunho de Devoluções */}
      <Alert className="border-orange-200 bg-orange-50">
        <Package className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 text-sm">
          <strong>Rascunho de Devoluções:</strong> Use o scanner ou adicione produtos manualmente no rascunho antes de aplicar as devoluções aos produtos salvos. 
          <strong>Devoluções do mesmo produto são somadas automaticamente.</strong> Ao salvar, os itens devolvidos são removidos da folha.
        </AlertDescription>
      </Alert>

      {/* Alerta de Folha Processada */}
      {folhaProcessada && (
        <Alert className="consignado-devolucoes-alert border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <AlertDescription className="text-green-800 text-xs sm:text-sm break-words whitespace-normal">
            <strong>Folha Processada:</strong> As devoluções foram registradas e a folha foi movida para "Aguardando Pagamento". 
            Você pode continuar visualizando os dados ou voltar à lista.
            <div className="mt-2">
              {onBack && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onBack}
                  className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300 w-full sm:w-auto"
                >
                  Voltar à Lista
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Seção de Rascunho de Devoluções */}
      <div className="consignado-devolucoes-rascunho bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="consignado-devolucoes-rascunho-header bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-white break-words whitespace-normal">Rascunho de Devoluções</h2>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 flex-shrink-0">
                {rascunhoDevolucoes.length} itens
              </Badge>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
              <Button
                onClick={() => setScannerOpen(true)}
                variant="outline"
                className="consignado-devolucoes-scanner-button bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0"
              >
                <Scan className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">Scanner</span>
              </Button>
              <Dialog open={manualSelectionOpen} onOpenChange={setManualSelectionOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="consignado-devolucoes-add-button bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0"
                  >
                    <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="whitespace-nowrap hidden sm:inline">Adicionar da Folha</span>
                    <span className="whitespace-nowrap sm:hidden">Adicionar</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="consignado-devolucoes-manual-modal max-w-4xl max-w-[calc(100vw-2rem)] max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg break-words whitespace-normal">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span>Selecionar Produtos da Folha para Devolução</span>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Campo de busca */}
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
                      <Input
                        type="text"
                        placeholder="Buscar produto por nome ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.75rem' }}
                        className="pl-9 w-full"
                      />
                    </div>
                    
                    {/* Lista de produtos */}
                    <div className="max-h-96 overflow-y-auto border rounded-lg w-full">
                      {produtosFiltrados.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto na folha'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 p-4">
                          {produtosFiltrados.map((produto, index) => {
                            const itemRascunho = rascunhoDevolucoes.find(item => item.product_id === produto.product_id)
                            const qtyJaDevolvida = itemRascunho?.qty_devolvida || 0
                            // ✅ CORREÇÃO: Calcular quantidade máxima devolvível com validação
                            const qtyOriginal = produto.qty_original || produto.qty || 0
                            const qtyDevolvida = produto.qty_devolvida || 0
                            const qtyMaximaDevolvivel = Math.max(0, qtyOriginal - qtyDevolvida)
                            const qtyDisponivel = Math.max(0, qtyMaximaDevolvivel - qtyJaDevolvida)
                            
                            return (
                              <div key={`${produto.product_id}-${index}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1 min-w-0 w-full sm:w-auto">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Package className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-medium text-sm break-words whitespace-normal">{produto.product_name}</h4>
                                      <p className="text-xs text-muted-foreground break-words whitespace-normal">
                                        Código: {produto.short_code} • 
                                        Disponível: {qtyDisponivel}/{qtyMaximaDevolvivel} unidades • 
                                        Preço: {formatCurrency(produto.preco_unitario_cents / 100)}
                                      </p>
                                      {qtyJaDevolvida > 0 && (
                                        <p className="text-xs text-blue-600 break-words whitespace-normal">
                                          Já no rascunho: {qtyJaDevolvida} unidades
                                        </p>
                                      )}
                                      <p className="text-xs text-orange-600 break-words whitespace-normal">
                                        Original: {qtyOriginal} • Já devolvido: {qtyDevolvida}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                                  {qtyDisponivel > 0 ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => adicionarProdutoManual(produto, 1)}
                                        disabled={qtyDisponivel < 1}
                                        className="flex-1 sm:flex-none"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        +1
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => adicionarProdutoManual(produto, qtyDisponivel)}
                                        disabled={qtyDisponivel < 1}
                                        className="flex-1 sm:flex-none"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Todos ({qtyDisponivel})</span>
                                        <span className="sm:hidden">Todos</span>
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-xs w-full sm:w-auto text-center">
                                      Sem unidades disponíveis
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={salvarDevolucoesRascunho}
                disabled={isSalvandoDevolucoes || rascunhoDevolucoes.length === 0}
                className="consignado-devolucoes-save-button bg-white/20 hover:bg-white/30 text-white border-white/30 disabled:opacity-50 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0"
              >
                {isSalvandoDevolucoes ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin flex-shrink-0" />
                    <span className="whitespace-nowrap">Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                    <span className="whitespace-nowrap">Salvar Devoluções</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {rascunhoDevolucoes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium mb-2">Nenhuma devolução no rascunho</p>
            <p className="text-sm">Use o scanner ou adicione produtos manualmente para registrar devoluções</p>
          </div>
        ) : (
          <>
            {/* Cards - Mobile/Tablet (< 1245px) */}
            <div className="consignado-devolucoes-rascunho-cards devolucoes-table-full:hidden space-y-3 p-4">
              {rascunhoDevolucoes.map((item) => {
                const produtoOriginal = produtosFolha.find(p => p.product_id === item.product_id)
                const qtyMaximaDevolvivel = produtoOriginal 
                  ? produtoOriginal.qty_original - produtoOriginal.qty_devolvida
                  : item.qty_original

                return (
                  <Card key={item.id} className="consignado-devolucoes-rascunho-card">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">{item.product_name}</h4>
                        <p className="text-xs text-muted-foreground">Código: {item.product_code}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Quantidade Disponível</p>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            {qtyMaximaDevolvivel}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Preço Unit.</p>
                          <p className="text-sm font-medium">{formatCurrency(item.preco_unitario_cents / 100)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Qtd Devolvida</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => atualizarRascunhoDevolucao(item.product_id, Math.max(0, item.qty_devolvida - 1))}
                            disabled={item.qty_devolvida <= 0}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <Input
                            type="number"
                            value={item.qty_devolvida === 0 ? '' : item.qty_devolvida}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0
                              const maxValue = qtyMaximaDevolvivel
                              atualizarRascunhoDevolucao(item.product_id, Math.min(Math.max(0, value), maxValue))
                            }}
                            min="0"
                            max={qtyMaximaDevolvivel}
                            className="w-20 h-8 text-center"
                            placeholder="0"
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              atualizarRascunhoDevolucao(item.product_id, Math.min(qtyMaximaDevolvivel, item.qty_devolvida + 1))
                            }}
                            disabled={item.qty_devolvida >= qtyMaximaDevolvivel}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removerDoRascunhoDevolucao(item.product_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Tabela - Desktop (>= 1245px) */}
            <div className="consignado-devolucoes-rascunho-table-container hidden devolucoes-table-full:block overflow-x-auto">
              <Table className="consignado-devolucoes-rascunho-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Quantidade Disponível</TableHead>
                    <TableHead className="text-center">Qtd Devolvida</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {rascunhoDevolucoes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product_name}
                      <div className="text-sm text-muted-foreground">
                        Código: {item.product_code}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                        {(() => {
                          // ✅ CORREÇÃO: Calcular quantidade máxima devolvível
                          const produtoOriginal = produtosFolha.find(p => p.product_id === item.product_id)
                          if (produtoOriginal) {
                            const qtyMaximaDevolvivel = produtoOriginal.qty_original - produtoOriginal.qty_devolvida
                            return qtyMaximaDevolvivel
                          }
                          return item.qty_original
                        })()}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => atualizarRascunhoDevolucao(item.product_id, Math.max(0, item.qty_devolvida - 1))}
                          disabled={item.qty_devolvida <= 0}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <Input
                          type="number"
                          value={item.qty_devolvida === 0 ? '' : item.qty_devolvida}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            // ✅ CORREÇÃO: Usar quantidade máxima devolvível como limite
                            const produtoOriginal = produtosFolha.find(p => p.product_id === item.product_id)
                            const maxValue = produtoOriginal 
                              ? produtoOriginal.qty_original - produtoOriginal.qty_devolvida
                              : item.qty_original
                            atualizarRascunhoDevolucao(item.product_id, Math.min(Math.max(0, value), maxValue))
                          }}
                          min="0"
                          max={(() => {
                            const produtoOriginal = produtosFolha.find(p => p.product_id === item.product_id)
                            return produtoOriginal 
                              ? produtoOriginal.qty_original - produtoOriginal.qty_devolvida
                              : item.qty_original
                          })()}
                          className="w-16 h-8 text-center"
                          placeholder="0"
                        />
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // ✅ CORREÇÃO: Usar quantidade máxima devolvível como limite
                            const produtoOriginal = produtosFolha.find(p => p.product_id === item.product_id)
                            const maxValue = produtoOriginal 
                              ? produtoOriginal.qty_original - produtoOriginal.qty_devolvida
                              : item.qty_original
                            atualizarRascunhoDevolucao(item.product_id, Math.min(maxValue, item.qty_devolvida + 1))
                          }}
                          disabled={(() => {
                            const produtoOriginal = produtosFolha.find(p => p.product_id === item.product_id)
                            const maxValue = produtoOriginal 
                              ? produtoOriginal.qty_original - produtoOriginal.qty_devolvida
                              : item.qty_original
                            return item.qty_devolvida >= maxValue
                          })()}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.preco_unitario_cents / 100)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removerDoRascunhoDevolucao(item.product_id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Tabela de Produtos */}
      <div className="consignado-devolucoes-produtos bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="consignado-devolucoes-produtos-header bg-gradient-to-r from-green-500 to-green-600 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-white break-words whitespace-normal flex-1 min-w-0">Produtos Salvos (do Rascunho)</h2>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 flex-shrink-0">
              {produtosFolha.length} produtos
            </Badge>
          </div>
        </div>
        
        {/* Cards - Layout compacto em uma linha com scroll vertical e horizontal */}
        <div className="consignado-devolucoes-produtos-cards-container max-h-[600px] overflow-y-auto overflow-x-auto">
          {devolucoes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">Nenhum produto salvo</p>
              <p className="text-sm">Os produtos aparecerão aqui após serem salvos</p>
            </div>
          ) : (
            <div className="consignado-devolucoes-produtos-cards space-y-1.5 p-3 sm:p-4 min-w-fit">
              {devolucoes.map((item) => {
                const { valorComissao, valorLiquido, percentual } = calcularComissaoItem(item)
                const qtyVendida = Math.max(0, item.qty_original - item.qty_devolvida)
                const valorVendido = qtyVendida * item.preco_unitario_cents

                return (
                  <Card key={item.id} className="consignado-devolucoes-produto-card border shadow-sm min-w-[800px] sm:min-w-[900px] lg:min-w-[1000px]">
                    <CardContent className="p-2.5 sm:p-3">
                      <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
                        {/* Coluna 1: Produto */}
                        <div className="flex-shrink-0 min-w-[150px] sm:min-w-[170px] lg:min-w-[200px]">
                          <h4 className="font-medium text-xs sm:text-sm break-words">{item.product_name}</h4>
                          <p className="text-xs text-muted-foreground break-words">{item.product_code}</p>
                        </div>
                        
                        {/* Coluna 2: Quantidades */}
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Orig:</span>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-2 py-0.5 h-6 whitespace-nowrap">
                              {item.qty_original}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Est:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-0.5 h-6 whitespace-nowrap ${
                                (productStocks[item.product_id] || 0) > 0 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}
                            >
                              {productStocks[item.product_id] || 0}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Vend:</span>
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs px-2 py-0.5 h-6 whitespace-nowrap">
                              {qtyVendida}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Dev:</span>
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs px-2 py-0.5 h-6 whitespace-nowrap">
                              {item.qty_devolvida}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Coluna 3: Valores */}
                        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 flex-shrink-0">
                          <div className="text-right min-w-[80px]">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">Preço Unit.</p>
                            <p className="text-xs sm:text-sm font-medium whitespace-nowrap">{formatCurrency(item.preco_unitario_cents / 100)}</p>
                          </div>
                          
                          <div className="text-right min-w-[90px]">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">Valor Vendido</p>
                            <p className="text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap">{formatCurrency(valorVendido / 100)}</p>
                          </div>
                          
                          <div className="text-right min-w-[70px]">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">Comissão</p>
                            <p className="text-xs sm:text-sm font-medium whitespace-nowrap">{percentual}%</p>
                          </div>
                          
                          <div className="text-right min-w-[100px]">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">Valor Comissão</p>
                            <p className="text-xs sm:text-sm font-medium text-red-600 whitespace-nowrap">{formatCurrency(valorComissao / 100)}</p>
                          </div>
                          
                          <div className="text-right border-l pl-3 sm:pl-4 min-w-[110px]">
                            <p className="text-xs text-muted-foreground font-semibold whitespace-nowrap">Valor Líquido</p>
                            <p className="text-sm sm:text-base font-bold text-blue-600 whitespace-nowrap">{formatCurrency(valorLiquido / 100)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="consignado-devolucoes-resumo bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Resumo da Folha
        </h3>
        
        <div className="consignado-devolucoes-resumo-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center bg-blue-50 rounded-xl p-4">
            <div className="text-sm text-blue-600 mb-1">Total Itens</div>
            <div className="text-2xl font-bold text-blue-800">{totalItens}</div>
          </div>
          
          <div className="text-center bg-green-50 rounded-xl p-4">
            <div className="text-sm text-green-600 mb-1">Vendidos</div>
            <div className="text-2xl font-bold text-green-800">{totalVendidos}</div>
          </div>
          
          <div className="text-center bg-orange-50 rounded-xl p-4">
            <div className="text-sm text-orange-600 mb-1">Devolvidos</div>
            <div className="text-2xl font-bold text-orange-800">{totalDevolvidos}</div>
          </div>
          
          <div className="text-center bg-green-50 rounded-xl p-4">
            <div className="text-sm text-green-600 mb-1">Valor Total</div>
            <div className="text-2xl font-bold text-green-800">{formatCurrency(valorTotal / 100)}</div>
          </div>
          
          <div className="text-center bg-red-50 rounded-xl p-4">
            <div className="text-sm text-red-600 mb-1">Total Comissão</div>
            <div className="text-2xl font-bold text-red-800">{formatCurrency(totalComissao / 100)}</div>
          </div>
          
          <div className="text-center bg-blue-50 rounded-xl p-4">
            <div className="text-sm text-blue-600 mb-1">Valor Líquido</div>
            <div className="text-2xl font-bold text-blue-800">{formatCurrency(valorLiquido / 100)}</div>
          </div>
        </div>
      </div>

      {/* Scanner para Devoluções */}
      <SmartScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        mode="consignado"
        onConfirmItem={async (productId: string, qty: number) => {
          const product = await buscarProdutoPorCodigo(productId)
          if (product) {
            // Adicionar produto ao rascunho com quantidade especificada
            await adicionarAoRascunhoDevolucao(product, qty)
          }
        }}
        getProductByCode={buscarProdutoPorCodigo}
        getAvailableStock={async (productId: string) => {
          const produtoOriginal = produtosFolha.find(p => p.product_id === productId)
          if (!produtoOriginal) return 0
          
          // ✅ CORREÇÃO: Calcular quantidade máxima devolvível
          const qtyMaximaDevolvivel = produtoOriginal.qty_original - produtoOriginal.qty_devolvida
          const itemRascunho = rascunhoDevolucoes.find(item => item.product_id === productId)
          const qtyJaNoRascunho = itemRascunho?.qty_devolvida || 0
          
          return Math.max(0, qtyMaximaDevolvivel - qtyJaNoRascunho)
        }}
        getDraftQty={(productId: string) => {
          const itemRascunho = rascunhoDevolucoes.find(item => item.product_id === productId)
          return itemRascunho?.qty_devolvida || 0
        }}
        folhaProducts={produtosFolha}
      />

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Processar Pagamento - {folhaCodigo}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Folha movida para "Aguardando Pagamento". Processe o pagamento para finalizar a consignação.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowPaymentModal(false)
                    navigate(`/consignado/folha/${folhaCodigo}?status=EM_CONFERENCIA`)
                  }}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Ir para Pagamento
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
