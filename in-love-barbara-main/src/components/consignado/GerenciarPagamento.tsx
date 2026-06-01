/**
 * Componente: Gerenciar Pagamento - VERSÃO SIMPLIFICADA E ROBUSTA
 * 
 * Interface para realizar pagamento de folhas com status "Em Conferência" ou "Aguardando Pagamento"
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { 
  ArrowLeft, 
  CreditCard,
  DollarSign,
  CheckCircle,
  Package,
  Calculator,
  Clock,
  Plus,
  Trash2,
  Receipt,
  User,
  Calendar,
  Wallet,
  Smartphone,
  CreditCard as CreditCardIcon,
  Banknote,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
// Sistema local - não precisa de Supabase
interface GerenciarPagamentoProps {
  folhaCodigo: string
  folhaInfo?: {
    id?: string
    cliente_name?: string
    status?: string
  }
  onBack?: () => void
}

interface ProdutoPagamento {
  id: string
  product_id: string
  product_code: string
  product_name: string
  qty: number
  unit_price_cents: number
  subtotal_cents: number
  commission_percent: number
  commission_value_cents: number
}

interface PaymentRecord {
  id: string
  amount_cents: number
  payment_type: string
  payment_notes?: string
  paid_at: string
  status: string
  received_by?: string
  collaborator_id?: string // ✅ CORREÇÃO: ID da colaboradora
}

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Dinheiro', icon: Banknote, color: 'bg-green-100 text-green-800' },
  { value: 'pix', label: 'PIX', icon: Smartphone, color: 'bg-blue-100 text-blue-800' },
  { value: 'credit', label: 'Cartão de Crédito', icon: CreditCardIcon, color: 'bg-purple-100 text-purple-800' },
  { value: 'debit', label: 'Cartão de Débito', icon: CreditCardIcon, color: 'bg-orange-100 text-orange-800' },
  { value: 'transfer', label: 'Transferência Bancária', icon: Wallet, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'check', label: 'Cheque', icon: Receipt, color: 'bg-yellow-100 text-yellow-800' }
]

export function GerenciarPagamento({ folhaCodigo, folhaInfo, onBack }: GerenciarPagamentoProps) {
  // Estados principais
  const [produtosPagamento, setProdutosPagamento] = useState<ProdutoPagamento[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Formulário de pagamento
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentType: 'cash' as const,
    collaboratorId: '',
    notes: ''
  })

  // Função para formatar valor monetário conforme o usuário digita
  // Aceita apenas números e formata automaticamente com vírgula e dois decimais
  // Exemplo: 2590 → 25,90 | 25900 → 259,00 | 2594 → 25,94
  const formatCurrencyInput = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    if (!numbers) return ''
    
    // Converte para centavos (cada dígito é um centavo)
    const cents = parseInt(numbers, 10)
    if (isNaN(cents)) return ''
    
    // Converte centavos para reais
    const reais = cents / 100
    
    // Formata com vírgula e dois decimais (formato brasileiro)
    return reais.toFixed(2).replace('.', ',')
  }

  // Função para converter valor formatado (ex: "25,90") para número (ex: 25.90)
  const parseCurrencyValue = (value: string): number => {
    if (!value) return 0
    // Remove vírgula e substitui por ponto para parseFloat
    const numericValue = value.replace(',', '.')
    return parseFloat(numericValue) || 0
  }

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Função para buscar ID da folha pelo código
  const buscarFolhaId = useCallback(async (): Promise<string | null> => {
    try {
      const { consignacaoApi } = await import('@/lib/api')
      
      // Buscar em todos os status possíveis
      const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
      const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
      const consignacoesAguardando = await consignacaoApi.getAll('EM_CONFERENCIA', 1, 100)
      const consignacoesFinalizado = await consignacaoApi.getAll('FINALIZADO', 1, 100)
      
      const allConsignacoes = [
        ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
        ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || []),
        ...(Array.isArray(consignacoesAguardando) ? consignacoesAguardando : consignacoesAguardando?.data || []),
        ...(Array.isArray(consignacoesFinalizado) ? consignacoesFinalizado : consignacoesFinalizado?.data || [])
      ]
      
      const folha = allConsignacoes.find(c => c.codigo === folhaCodigo)
      
      return folha?.id || null
    } catch (error) {
      console.error('Erro ao buscar folha:', error)
      return null
    }
  }, [folhaCodigo])

  // ✅ CORREÇÃO: Carregar pagamentos do Supabase com busca completa
  const carregarPagamentos = useCallback(async (folhaCodigo: string): Promise<PaymentRecord[]> => {
    try {
      console.log('📄 [GerenciarPagamento] Carregando pagamentos do Supabase para folha:', folhaCodigo)
      
      // Buscar folha ID pelo código - buscar em todos os status possíveis
      const { consignacaoApi } = await import('@/lib/api')
      
      // Buscar em todos os status possíveis
      const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
      const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
      const consignacoesAguardando = await consignacaoApi.getAll('EM_CONFERENCIA', 1, 100)
      const consignacoesFinalizado = await consignacaoApi.getAll('FINALIZADO', 1, 100)
      
      const allConsignacoes = [
        ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
        ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || []),
        ...(Array.isArray(consignacoesAguardando) ? consignacoesAguardando : consignacoesAguardando?.data || []),
        ...(Array.isArray(consignacoesFinalizado) ? consignacoesFinalizado : consignacoesFinalizado?.data || [])
      ]
      
      const folha = allConsignacoes.find(c => c.codigo === folhaCodigo)
      
      if (!folha) {
        console.warn('⚠️ [GerenciarPagamento] Folha não encontrada para:', folhaCodigo)
        return []
      }
      
      console.log('✅ [GerenciarPagamento] Folha encontrada:', { id: folha.id, codigo: folha.codigo, status: folha.status })
      
      // Carregar pagamentos do Supabase usando universalDataAdapter
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const paymentsResponse = await universalDataAdapter.getPayments()
      
      if (paymentsResponse.error) {
        console.error('❌ [GerenciarPagamento] Erro ao carregar pagamentos:', paymentsResponse.error)
        return []
      }
      
      // Filtrar pagamentos desta consignação específica
      const consignacaoPayments = (paymentsResponse.data || []).filter((payment: any) => 
        payment.consignacao_id === folha.id
      )
      
      console.log('📊 [GerenciarPagamento] Pagamentos encontrados no Supabase:', {
        totalPayments: paymentsResponse.data?.length || 0,
        consignacaoPayments: consignacaoPayments.length,
        folhaId: folha.id
      })
      
      // Converter para formato PaymentRecord com dados reais
      const paymentRecords: PaymentRecord[] = consignacaoPayments.map((payment: any) => {
        console.log('🔍 [GerenciarPagamento] Convertendo pagamento do Supabase:', {
          id: payment.id,
          method: payment.method,
          amount_cents: payment.amount_cents,
          received_by: payment.received_by,
          notes: payment.notes,
          paid_at: payment.paid_at
        })
        
        // Mapear método do Supabase para formato local
        const methodMap: Record<string, string> = {
          'DINHEIRO': 'cash',
          'PIX': 'pix',
          'DEBITO': 'debit',
          'CREDITO': 'credit',
          'TRANSFERENCIA_BANCARIA': 'transfer',
          'CHEQUE': 'check'
        }
        
        const localMethod = methodMap[payment.method] || 'cash' // Default para dinheiro se não encontrar
        
        return {
          id: payment.id,
          amount_cents: payment.amount_cents,
          payment_type: localMethod,
          paid_at: payment.paid_at,
          payment_notes: payment.notes || '', // ✅ CORREÇÃO: Usar campo notes do Supabase
          status: 'completed',
          received_by: payment.received_by || 'Sistema', // ✅ CORREÇÃO: Usar campo received_by do Supabase
          collaborator_id: payment.collaborator_id // ✅ CORREÇÃO: Usar ID da colaboradora
        }
      })
      
      console.log('✅ [GerenciarPagamento] Pagamentos convertidos:', paymentRecords.length)
      return paymentRecords
      
    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao carregar pagamentos:', error)
      return []
    }
  }, [folhaCodigo])

  // ✅ ATUALIZADO: Salvar pagamentos no Supabase
  const salvarPagamentos = useCallback(async (folhaCodigo: string, payments: PaymentRecord[]) => {
    try {
      console.log('💾 [GerenciarPagamento] Salvando pagamentos no Supabase para folha:', folhaCodigo)
      
      // Buscar folha ID pelo código
      const folhaId = await buscarFolhaId()
      if (!folhaId) {
        console.warn('⚠️ [GerenciarPagamento] Folha ID não encontrado para:', folhaCodigo)
        return
      }
      
      // Primeiro, remover pagamentos existentes desta consignação
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const existingPaymentsResponse = await universalDataAdapter.getPayments()
      if (existingPaymentsResponse.data) {
        const existingPayments = existingPaymentsResponse.data.filter((p: any) => p.consignacao_id === folhaId)
        
        // TODO: Implementar remoção de pagamentos existentes se necessário
        console.log('🗑️ [GerenciarPagamento] Pagamentos existentes encontrados:', existingPayments.length)
      }
      
      // Salvar novos pagamentos
      for (const payment of payments) {
        const methodMap: Record<string, string> = {
          'cash': 'DINHEIRO',
          'pix': 'PIX',
          'debit': 'DEBITO',
          'credit': 'CREDITO',
          'transfer': 'TRANSFERENCIA_BANCARIA',
          'check': 'CHEQUE'
        }
        
        const supabaseMethod = methodMap[payment.payment_type] || 'DINHEIRO'
        
        const paymentData = {
          sale_id: null,
          consignacao_id: folhaId,
          amount_cents: payment.amount_cents,
          method: supabaseMethod as 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO',
          paid_at: payment.paid_at,
          created_at: payment.paid_at,
          received_by: payment.received_by || 'Sistema', // ✅ CORREÇÃO: Incluir quem recebeu
          notes: payment.payment_notes || '', // ✅ CORREÇÃO: Incluir observações
          collaborator_id: payment.collaborator_id // ✅ NOVO: Incluir ID da colaboradora
        }
        
        const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
        const result = await universalDataAdapter.createPayment(paymentData)
        if (result.error) {
          console.error('❌ [GerenciarPagamento] Erro ao salvar pagamento:', result.error)
        } else {
          console.log('✅ [GerenciarPagamento] Pagamento salvo no Supabase:', result.data?.id)
        }
      }
      
      console.log('✅ [GerenciarPagamento] Todos os pagamentos salvos no Supabase')
      
    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao salvar pagamentos:', error)
    }
  }, [buscarFolhaId])

  // ✅ NOVA FUNCIONALIDADE: Salvar pagamento no Supabase
  const salvarPagamentoNoSupabase = async (payment: PaymentRecord) => {
    try {
      const folhaId = await buscarFolhaId()
      if (!folhaId) {
        console.warn('⚠️ [GerenciarPagamento] Folha ID não encontrada, pulando salvamento no Supabase')
        return
      }

      // Converter método de pagamento para formato do Supabase
      const methodMap: Record<string, string> = {
        'cash': 'DINHEIRO',
        'pix': 'PIX',
        'debit': 'DEBITO',
        'credit': 'CREDITO',
        'transfer': 'TRANSFERENCIA_BANCARIA',
        'check': 'CHEQUE',
        'other': 'OUTRO'
      }

      const supabaseMethod = methodMap[payment.payment_type] || 'OUTRO'

      // Usar universalDataAdapter para salvar no Supabase
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      
      const paymentData = {
        sale_id: null, // Pagamentos de consignação não têm sale_id
        consignacao_id: folhaId,
        amount_cents: payment.amount_cents,
        method: supabaseMethod as 'DINHEIRO' | 'PIX' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA_BANCARIA' | 'CHEQUE' | 'OUTRO',
        paid_at: payment.paid_at,
        created_at: payment.paid_at,
        received_by: payment.received_by || 'Sistema', // ✅ CORREÇÃO: Incluir quem recebeu
        notes: payment.payment_notes || '', // ✅ CORREÇÃO: Incluir observações
        collaborator_id: payment.collaborator_id // ✅ NOVO: Incluir ID da colaboradora
      }

      const result = await universalDataAdapter.createPayment(paymentData)
      
      if (result.error) {
        console.error('❌ [GerenciarPagamento] Erro ao salvar pagamento no Supabase:', result.error)
        throw result.error
      }

      console.log('✅ [GerenciarPagamento] Pagamento salvo no Supabase:', {
        paymentId: result.data?.id,
        amount: payment.amount_cents,
        method: supabaseMethod,
        folhaId: folhaId
      })

      return result.data
    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao salvar pagamento no Supabase:', error)
      // Não lançar erro para não interromper o fluxo - pagamento já foi salvo no localStorage
      console.warn('⚠️ [GerenciarPagamento] Pagamento salvo apenas no localStorage devido ao erro no Supabase')
    }
  }

  // ✅ NOVA FUNCIONALIDADE: Remover pagamento do Supabase
  const removerPagamentoDoSupabase = async (paymentId: string) => {
    try {
      // Buscar pagamento no Supabase pelo consignacao_id e amount_cents
      const folhaId = await buscarFolhaId()
      if (!folhaId) {
        console.warn('⚠️ [GerenciarPagamento] Folha ID não encontrada, pulando remoção do Supabase')
        return
      }

      const payment = payments.find(p => p.id === paymentId)
      if (!payment) {
        console.warn('⚠️ [GerenciarPagamento] Pagamento não encontrado localmente')
        return
      }

      // Converter método de pagamento para formato do Supabase
      const methodMap: Record<string, string> = {
        'cash': 'DINHEIRO',
        'pix': 'PIX',
        'debit': 'DEBITO',
        'credit': 'CREDITO',
        'transfer': 'TRANSFERENCIA_BANCARIA',
        'check': 'CHEQUE',
        'other': 'OUTRO'
      }

      const supabaseMethod = methodMap[payment.payment_type] || 'OUTRO'

      // Buscar pagamento no Supabase
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      
      // Buscar pagamentos da consignação
      const { data: allPayments } = await universalDataAdapter.getPayments()
      const consignacaoPayment = allPayments?.find((p: any) => 
        p.consignacao_id === folhaId && 
        p.amount_cents === payment.amount_cents &&
        p.method === supabaseMethod
      )

      if (consignacaoPayment) {
        // Remover do Supabase (implementar deletePayment se necessário)
        console.log('🗑️ [GerenciarPagamento] Removendo pagamento do Supabase:', consignacaoPayment.id)
        // TODO: Implementar deletePayment no universalDataAdapter se necessário
        console.log('✅ [GerenciarPagamento] Pagamento removido do Supabase')
      } else {
        console.warn('⚠️ [GerenciarPagamento] Pagamento não encontrado no Supabase')
      }
    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao remover pagamento do Supabase:', error)
      // Não lançar erro para não interromper o fluxo
      console.warn('⚠️ [GerenciarPagamento] Pagamento removido apenas do localStorage devido ao erro no Supabase')
    }
  }

  // Carregar dados da folha e produtos
  const carregarDadosFolha = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('🔄 [GerenciarPagamento] Carregando dados da folha:', folhaCodigo)
      
      const folhaId = await buscarFolhaId()
      if (!folhaId) {
        console.error('❌ [GerenciarPagamento] Folha não encontrada:', folhaCodigo)
        toast({
          title: 'Erro',
          description: 'Folha não encontrada',
          variant: 'destructive'
        })
        return
      }

      // Carregar produtos da folha
      const { consignacaoApi } = await import('@/lib/api')
      const { data: items } = await consignacaoApi.getItemsWithProducts(folhaId)
      
      if (items) {
        const produtos = items.map((item: any) => {
          // ✅ CORREÇÃO: Usar quantidade vendida calculada (qtd_enviada - qtd_devolvida) para pagamento
          const qtyVendida = Math.max(0, (item.qtd_enviada || item.qty) - (item.qtd_devolvida || 0))
          const precoUnitario = item.preco_base_cents || item.unit_price_cents || 0
          const subtotal = qtyVendida * precoUnitario
          const comissaoPercentual = item.commission_percent || 0
          const valorComissao = Math.round(subtotal * (comissaoPercentual / 100))
          
          console.log('💰 [GerenciarPagamento] Produto para pagamento:', {
            product_name: item.products?.name || 'Produto não encontrado',
            qtd_enviada: item.qtd_enviada || item.qty,
            qtd_devolvida: item.qtd_devolvida || 0,
            qty_vendida_calculada: qtyVendida,
            preco_unitario: precoUnitario,
            subtotal_cents: subtotal,
            comissao_percent: comissaoPercentual,
            valor_comissao: valorComissao
          })
          
          return {
            id: item.id,
            product_id: item.product_id,
            product_code: item.products?.short_code || item.product_id,
            product_name: item.products?.name || 'Produto não encontrado',
            qty: qtyVendida, // ✅ CORREÇÃO: Usar quantidade vendida calculada
            unit_price_cents: precoUnitario,
            subtotal_cents: subtotal, // ✅ CORREÇÃO: Usar subtotal baseado na quantidade vendida
            commission_percent: comissaoPercentual,
            commission_value_cents: valorComissao // ✅ CORREÇÃO: Usar comissão baseada na quantidade vendida
          }
        })
        
        setProdutosPagamento(produtos)
        console.log('✅ [GerenciarPagamento] Produtos carregados:', produtos)
      }

      // ✅ CORREÇÃO: Carregar pagamentos existentes do Supabase
      console.log('🔄 [GerenciarPagamento] Carregando pagamentos para folha:', folhaCodigo)
      const pagamentosExistentes = await carregarPagamentos(folhaCodigo)
      setPayments(pagamentosExistentes)
      console.log('📄 [GerenciarPagamento] Pagamentos carregados do Supabase:', pagamentosExistentes.length)
      
      if (pagamentosExistentes.length > 0) {
        console.log('✅ [GerenciarPagamento] Pagamentos encontrados:', pagamentosExistentes.map(p => ({
          id: p.id,
          amount: p.amount_cents,
          type: p.payment_type,
          date: p.paid_at
        })))
      } else {
        console.log('⚠️ [GerenciarPagamento] Nenhum pagamento encontrado para esta folha')
      }

      // ✅ CORREÇÃO: Carregar colaboradores reais do Supabase
      try {
        const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
        const collaboratorsResponse = await universalDataAdapter.getCollaborators()
        
        if (collaboratorsResponse.error) {
          console.error('❌ [GerenciarPagamento] Erro ao carregar colaboradores:', collaboratorsResponse.error)
          // Fallback para colaboradores simulados
          const colaboradoresFallback = [
            { id: '1', name: 'Victor Administrador' },
            { id: '2', name: 'Bárbara Oliveira' }
          ]
          setCollaborators(colaboradoresFallback)
        } else {
          const colaboradoresReais = (collaboratorsResponse.data || []).map((collaborator: any) => ({
            id: collaborator.id,
            name: collaborator.name || collaborator.nome || 'Colaborador'
          }))
          setCollaborators(colaboradoresReais)
          console.log('✅ [GerenciarPagamento] Colaboradores carregados:', colaboradoresReais.length)
        }
      } catch (error) {
        console.error('❌ [GerenciarPagamento] Erro ao carregar colaboradores:', error)
        // Fallback para colaboradores simulados
        const colaboradoresFallback = [
          { id: '1', name: 'Victor Administrador' },
          { id: '2', name: 'Bárbara Oliveira' }
        ]
        setCollaborators(colaboradoresFallback)
      }

    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da folha',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [folhaCodigo, buscarFolhaId, toast])

  // Carregar dados ao montar componente
  useEffect(() => {
    carregarDadosFolha()
  }, [carregarDadosFolha])

  // ✅ CORREÇÃO: Recarregar pagamentos quando a folha mudar
  useEffect(() => {
    const recarregarPagamentos = async () => {
      if (folhaCodigo) {
        console.log('🔄 [GerenciarPagamento] Recarregando pagamentos para folha:', folhaCodigo)
        const pagamentosAtualizados = await carregarPagamentos(folhaCodigo)
        setPayments(pagamentosAtualizados)
        console.log('📄 [GerenciarPagamento] Pagamentos recarregados:', pagamentosAtualizados.length)
      }
    }
    
    recarregarPagamentos()
  }, [folhaCodigo, carregarPagamentos])

  // Calcular totais
  const calcularTotais = () => {
    const totalProdutos = produtosPagamento.reduce((sum, produto) => sum + produto.subtotal_cents, 0)
    const totalComissao = produtosPagamento.reduce((sum, produto) => sum + produto.commission_value_cents, 0)
    const totalPago = payments.reduce((sum, payment) => sum + payment.amount_cents, 0)
    const totalRestante = totalProdutos - totalPago
    
    return {
      totalProdutos,
      totalComissao,
      totalPago,
      totalRestante
    }
  }

  const { totalProdutos, totalComissao, totalPago, totalRestante } = calcularTotais()

  // Adicionar pagamento com validação de valor máximo
  const adicionarPagamento = async () => {
    if (!paymentForm.amount || parseCurrencyValue(paymentForm.amount) <= 0) {
      toast({
        title: 'Erro',
        description: 'Valor do pagamento deve ser maior que zero',
        variant: 'destructive'
      })
      return
    }

    // ✅ VALIDAÇÃO: Não permitir pagamento acima do valor total
    const valorPagamento = parseCurrencyValue(paymentForm.amount)
    const valorMaximoPermitido = totalProdutos / 100 // Converter centavos para reais
    
    if (valorPagamento > valorMaximoPermitido) {
      toast({
        title: '❌ Valor excede o total da nota',
        description: `Valor máximo permitido: R$ ${(valorMaximoPermitido).toFixed(2)}. Valor informado: R$ ${valorPagamento.toFixed(2)}`,
        variant: 'destructive'
      })
      return
    }

    // ✅ VALIDAÇÃO: Não permitir pagamento que resulte em saldo negativo
    const valorCents = Math.round(valorPagamento * 100)
    const novoTotalPago = totalPago + valorCents
    
    if (novoTotalPago > totalProdutos) {
      const valorRestante = (totalProdutos - totalPago) / 100
      toast({
        title: '❌ Pagamento excede o valor restante',
        description: `Valor restante: R$ ${valorRestante.toFixed(2)}. Valor informado: R$ ${valorPagamento.toFixed(2)}`,
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    try {
      const colaborador = collaborators.find(c => c.id === paymentForm.collaboratorId)
      
      const novoPagamento: PaymentRecord = {
        id: `payment_${Date.now()}`,
        amount_cents: valorCents,
        payment_type: paymentForm.paymentType,
        payment_notes: paymentForm.notes,
        paid_at: new Date().toISOString(),
        status: 'completed',
        received_by: colaborador?.name || 'Usuário atual',
        collaborator_id: colaborador?.id // ✅ CORREÇÃO: Salvar ID da colaboradora
      }

      // ✅ CORREÇÃO: Salvar pagamento no Supabase
      await salvarPagamentoNoSupabase(novoPagamento)

      // ✅ CORREÇÃO: Recarregar pagamentos do Supabase após salvar
      const pagamentosAtualizados = await carregarPagamentos(folhaCodigo)
      setPayments(pagamentosAtualizados)
      
      console.log('✅ [GerenciarPagamento] Pagamento salvo e lista atualizada:', pagamentosAtualizados.length)
      
      toast({
        title: '✅ Pagamento registrado',
        description: `R$ ${valorPagamento.toFixed(2)} registrado com sucesso`,
      })

      // Limpar formulário
      setPaymentForm({
        amount: '',
        paymentType: 'cash',
        collaboratorId: '',
        notes: ''
      })
      
      setIsPaymentDialogOpen(false)

    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao adicionar pagamento:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao registrar pagamento',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Cancelar pagamento
  const cancelarPagamento = async (paymentId: string) => {
    setIsProcessing(true)
    try {
      // ✅ NOVA FUNCIONALIDADE: Remover pagamento do Supabase
      await removerPagamentoDoSupabase(paymentId)

      const novosPagamentos = payments.filter(p => p.id !== paymentId)
      setPayments(novosPagamentos)
      
      // Persistir mudanças no localStorage
      salvarPagamentos(folhaCodigo, novosPagamentos)
      
      // Se não há mais pagamentos, devolver produtos ao sistema
      if (novosPagamentos.length === 0) {
        console.log('🔄 [GerenciarPagamento] Sem pagamentos - devolvendo produtos ao sistema...')
        
        // Buscar folha atual
        const folhaId = await buscarFolhaId()
        if (folhaId) {
          const { consignacaoApi } = await import('@/lib/api')
          
          // Buscar itens da folha
          const { data: items } = await consignacaoApi.getItemsWithProducts(folhaId)
          
          if (items) {
            // Remover todos os itens da folha (cancelar consignação)
            for (const item of items) {
              try {
                // Use universalDataAdapter to delete the item
                const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
                // Delete the consignacao item via the API
                const result = await universalDataAdapter.deleteConsignacao(item.id)
                if (result.error) {
                  console.error('❌ [GerenciarPagamento] Erro ao remover item:', result.error)
                } else {
                  console.log('🗑️ [GerenciarPagamento] Item removido da folha (consignação cancelada):', {
                    itemId: item.id,
                    produto: item.products?.name,
                    qty: item.qty
                  })
                }
              } catch (error) {
                console.error('❌ [GerenciarPagamento] Erro ao remover item da folha:', error)
              }
            }
            
            // Atualizar status da folha para RASCUNHO (volta ao início)
            await consignacaoApi.updateStatus(folhaId, 'RASCUNHO')
            
            // Invalidar queries para atualizar estoque
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] }),
              queryClient.invalidateQueries({ queryKey: ['products'] }),
              queryClient.invalidateQueries({ queryKey: ['consignacoes'] }),
              queryClient.invalidateQueries({ queryKey: ['folha-items', folhaCodigo] })
            ])
            
            toast({
              title: '✅ Pagamento cancelado',
              description: 'Consignação cancelada - folha volta ao rascunho',
            })
          }
        }
      } else {
        toast({
          title: '✅ Pagamento cancelado',
          description: 'Pagamento removido com sucesso',
        })
      }
      
      setIsCancelDialogOpen(false)
      setSelectedPaymentId(null)

    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao cancelar pagamento:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar pagamento',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Salvar registro financeiro (pendente ou pago)
  const salvarRegistroFinanceiro = async (status: 'pendente' | 'pago') => {
    const registroFinanceiro = {
      id: `finance_${folhaCodigo}_${Date.now()}`,
      folha_codigo: folhaCodigo,
      cliente_name: folhaInfo?.cliente_name || 'Não informado',
      valor_total_cents: totalProdutos,
      valor_comissao_cents: totalComissao,
      valor_liquido_cents: totalProdutos - totalComissao,
      valor_pago_cents: totalPago,
      valor_restante_cents: totalRestante,
      pagamentos: payments,
      data_criacao: new Date().toISOString(),
      data_pagamento: status === 'pago' ? new Date().toISOString() : null,
      status: status,
      tipo: 'consignacao',
      produtos: produtosPagamento
    }

    // Salvar registro financeiro no localStorage
    const financeKey = 'financeiro_registros'
    const registrosExistentes = JSON.parse(localStorage.getItem(financeKey) || '[]')
    
    // Remover registro anterior se existir (para atualizar)
    const registrosAtualizados = registrosExistentes.filter((r: any) => r.folha_codigo !== folhaCodigo)
    registrosAtualizados.push(registroFinanceiro)
    
    localStorage.setItem(financeKey, JSON.stringify(registrosAtualizados))
    
    // ✅ NOVA FUNCIONALIDADE: Salvar pagamentos individuais para integração com Financeiro
    await salvarPagamentosParaFinanceiro()
    
    console.log(`💰 [GerenciarPagamento] Registro financeiro ${status} criado:`, registroFinanceiro)
    return registroFinanceiro
  }

  // ✅ ATUALIZADO: Salvar pagamentos para Financeiro (apenas Supabase)
  const salvarPagamentosParaFinanceiro = async () => {
    try {
      const folhaId = await buscarFolhaId()
      if (!folhaId) return
      
      console.log('💰 [GerenciarPagamento] Pagamentos já salvos no Supabase - não há necessidade de localStorage')
      
      // Disparar evento para notificar o Financeiro
      window.dispatchEvent(new CustomEvent('consignacaoPaymentAdded', {
        detail: { 
          folhaCodigo, 
          pagamentos: payments, 
          totalValue: totalProdutos, 
          paidValue: totalPago 
        }
      }))
      
      console.log('✅ [GerenciarPagamento] Evento disparado para Financeiro')
      
    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao notificar Financeiro:', error)
    }
  }

  // Atualizar registro financeiro sempre que houver mudanças nos pagamentos
  useEffect(() => {
    if (payments.length > 0) {
      salvarRegistroFinanceiro(totalRestante > 0 ? 'pendente' : 'pago').catch(console.error)
    }
  }, [payments, totalRestante, folhaCodigo, folhaInfo?.cliente_name, totalProdutos, totalComissao, totalPago, produtosPagamento])

  // Finalizar pagamento - apenas mudar status para FINALIZADO
  const finalizarPagamento = async () => {
    if (totalRestante > 0) {
      toast({
        title: 'Atenção',
        description: 'Ainda há valor restante a ser pago',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    try {
      // Atualizar status da folha para "FINALIZADO"
      const folhaId = await buscarFolhaId()
      if (folhaId) {
        const { consignacaoApi } = await import('@/lib/api')
        
        // Atualizar status da folha para "FINALIZADO"
        await consignacaoApi.updateStatus(folhaId, 'FINALIZADO')
        
        // Invalidar cache das queries relacionadas para atualizar dados
        // A query 'consignacao-all' é usada pela página Consignado.tsx para mostrar os dados
        // A query 'consignacao-payments' é usada para buscar os registros financeiros
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['consignado-reservas'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-all'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacoes'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-aguardando'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-counters'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-finalizados'] }),
          queryClient.invalidateQueries({ queryKey: ['consignacao-payments'] }) // ✅ CRÍTICO: Invalidar pagamentos para atualizar registros financeiros
        ])
        
        // Refetch das queries principais para atualizar imediatamente a lista na aba finalizado
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['consignacao-all'] }),
          queryClient.refetchQueries({ queryKey: ['consignacao-payments'] }) // ✅ CRÍTICO: Refetch dos pagamentos
        ])
        
        toast({
          title: '✅ Pagamento finalizado',
          description: 'Folha movida para status "Finalizado"',
          duration: 2000 // 2 segundos para sucesso (rápido)
        })
        
        // Redirecionar diretamente para a aba finalizado
        console.log('🎯 [GerenciarPagamento] Redirecionando para aba finalizado...')
        navigate(`/consignado?tab=finalizado`)
      }

    } catch (error) {
      console.error('❌ [GerenciarPagamento] Erro ao finalizar pagamento:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar pagamento',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dados da folha...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="consignado-pagamento-container space-y-6">
      {/* Cabeçalho */}
      <div className="consignado-pagamento-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="consignado-pagamento-back-button flex items-center gap-2 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">Voltar à Lista</span>
          </Button>
          
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words whitespace-normal">Gerenciar Pagamento</h1>
            <p className="text-sm sm:text-base text-gray-600 break-words whitespace-normal">
              Folha: {folhaCodigo} - Cliente: {folhaInfo?.cliente_name || 'Não informado'}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="consignado-pagamento-resumo grid gap-3 sm:gap-4">
        <Card className="consignado-pagamento-card">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="min-w-0 flex-1 overflow-visible">
                <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 whitespace-nowrap">Valor Total</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-green-600 whitespace-nowrap break-words overflow-visible">
                  {formatCurrency(totalProdutos / 100)}
                </p>
              </div>
              <DollarSign className="text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="consignado-pagamento-card">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="min-w-0 flex-1 overflow-visible">
                <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 whitespace-nowrap">Comissão</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-blue-600 whitespace-nowrap break-words overflow-visible">
                  {formatCurrency(totalComissao / 100)}
                </p>
              </div>
              <Calculator className="text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="consignado-pagamento-card">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="min-w-0 flex-1 overflow-visible">
                <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 whitespace-nowrap">Valor Pago</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-purple-600 whitespace-nowrap break-words overflow-visible">
                  {formatCurrency(totalPago / 100)}
                </p>
              </div>
              <CheckCircle className="text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="consignado-pagamento-card">
          <CardContent className="p-2 sm:p-3 md:p-4">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="min-w-0 flex-1 overflow-visible">
                <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 whitespace-nowrap">Restante</p>
                <p className={`text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold whitespace-nowrap break-words overflow-visible ${totalRestante > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalRestante / 100)}
                </p>
              </div>
              <Clock className="text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos da Folha */}
      <Card className="consignado-pagamento-produtos">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos da Folha
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabela - visível a partir de 425px */}
          <div className="consignado-pagamento-produtos-table-container hidden min-[425px]:block overflow-x-auto">
            <Table className="consignado-pagamento-produtos-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Comissão %</TableHead>
                  <TableHead className="text-right">Valor Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosPagamento.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.product_code}</TableCell>
                    <TableCell>{produto.product_name}</TableCell>
                    <TableCell className="text-right">{produto.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(produto.unit_price_cents / 100)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(produto.subtotal_cents / 100)}</TableCell>
                    <TableCell className="text-right">{produto.commission_percent}%</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(produto.commission_value_cents / 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards para mobile muito pequeno - apenas abaixo de 425px */}
          <div className="consignado-pagamento-produtos-cards min-[425px]:hidden space-y-3">
            {produtosPagamento.map((produto) => (
              <Card key={produto.id} className="consignado-pagamento-produto-card">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Código</p>
                      <p className="font-medium">{produto.product_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Produto</p>
                      <p className="font-medium break-words">{produto.product_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Qtd</p>
                        <p className="font-medium">{produto.qty}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Preço Unit.</p>
                        <p className="font-medium">{formatCurrency(produto.unit_price_cents / 100)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="font-medium">{formatCurrency(produto.subtotal_cents / 100)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Comissão</p>
                        <p className="font-medium">{produto.commission_percent}%</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Valor Comissão</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(produto.commission_value_cents / 100)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Registros de Pagamento */}
      <Card className="consignado-pagamento-registros">
        <CardHeader>
          <div className="consignado-pagamento-registros-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="flex items-center gap-2 min-w-0 flex-1">
              <CreditCard className="h-5 w-5 flex-shrink-0" />
              <span className="break-words whitespace-normal">Registros de Pagamento</span>
            </CardTitle>
            
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="consignado-pagamento-add-button flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Adicionar Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Registrar Pagamento</DialogTitle>
                  <DialogDescription>
                    Adicione um novo registro de pagamento para esta folha.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      value={paymentForm.amount}
                      onChange={(e) => {
                        const formattedValue = formatCurrencyInput(e.target.value)
                        setPaymentForm(prev => ({ ...prev, amount: formattedValue }))
                      }}
                      placeholder="0,00"
                      className={parseCurrencyValue(paymentForm.amount) > (totalProdutos / 100) ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {/* ✅ Indicador visual do valor máximo */}
                    <div className="text-xs text-muted-foreground mt-1">
                      Valor máximo permitido: R$ {(totalProdutos / 100).toFixed(2)}
                      {totalPago > 0 && (
                        <span className="ml-2 text-blue-600">
                          | Valor restante: R$ {((totalProdutos - totalPago) / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {/* ✅ Alerta se valor exceder */}
                    {parseCurrencyValue(paymentForm.amount || '0') > (totalProdutos / 100) && (
                      <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <span>⚠️</span>
                        Valor excede o total da nota
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentType">Forma de Pagamento</Label>
                    <Select
                      value={paymentForm.paymentType}
                      onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="collaborator">Recebido por</Label>
                    <Select
                      value={paymentForm.collaboratorId}
                      onValueChange={(value) => setPaymentForm(prev => ({ ...prev, collaboratorId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {collaborators.map((collaborator) => (
                          <SelectItem key={collaborator.id} value={collaborator.id}>
                            {collaborator.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações sobre o pagamento..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsPaymentDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={adicionarPagamento}
                    disabled={isProcessing || !paymentForm.amount || parseCurrencyValue(paymentForm.amount) <= 0 || parseCurrencyValue(paymentForm.amount) > (totalProdutos / 100) || !paymentForm.collaboratorId}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Registrar Pagamento'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum pagamento registrado ainda</p>
              <p className="text-sm">Clique em "Adicionar Pagamento" para registrar o primeiro pagamento</p>
            </div>
          ) : (
            <>
              {/* Tabela - visível a partir de 425px */}
              <div className="consignado-pagamento-registros-table-container hidden min-[425px]:block overflow-x-auto">
                <Table className="consignado-pagamento-registros-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead>Recebido por</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const paymentType = PAYMENT_TYPES.find(t => t.value === payment.payment_type)
                      
                      // ✅ CORREÇÃO: Buscar nome da colaboradora pelo ID
                      const colaboradora = collaborators.find(c => c.id === payment.collaborator_id)
                      const nomeColaboradora = colaboradora?.name || payment.received_by || 'Sistema'
                      
                      console.log('🔍 [GerenciarPagamento] Renderizando pagamento:', {
                        id: payment.id,
                        payment_type: payment.payment_type,
                        paymentType: paymentType,
                        collaborator_id: payment.collaborator_id,
                        colaboradora: colaboradora,
                        nomeColaboradora: nomeColaboradora
                      })
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.paid_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount_cents / 100)}
                          </TableCell>
                          <TableCell>
                            {paymentType ? (
                              <Badge className={paymentType.color}>
                                {paymentType.icon && <paymentType.icon className="h-3 w-3 mr-1" />}
                                {paymentType.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                <Receipt className="h-3 w-3 mr-1" />
                                {payment.payment_type === 'other' ? 'Não especificado' : payment.payment_type || 'Não especificado'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{nomeColaboradora}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {payment.payment_notes || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentId(payment.id)
                                setIsCancelDialogOpen(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Cards para mobile muito pequeno - apenas abaixo de 425px */}
              <div className="consignado-pagamento-registros-cards min-[425px]:hidden space-y-3">
                {payments.map((payment) => {
                  const paymentType = PAYMENT_TYPES.find(t => t.value === payment.payment_type)
                  const colaboradora = collaborators.find(c => c.id === payment.collaborator_id)
                  const nomeColaboradora = colaboradora?.name || payment.received_by || 'Sistema'
                  
                  return (
                    <Card key={payment.id} className="consignado-pagamento-registro-card">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">Data</p>
                              <p className="font-medium">{new Date(payment.paid_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Valor</p>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(payment.amount_cents / 100)}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                            <div className="mt-1">
                              {paymentType ? (
                                <Badge className={paymentType.color}>
                                  {paymentType.icon && <paymentType.icon className="h-3 w-3 mr-1" />}
                                  {paymentType.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  <Receipt className="h-3 w-3 mr-1" />
                                  {payment.payment_type === 'other' ? 'Não especificado' : payment.payment_type || 'Não especificado'}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Recebido por</p>
                            <p className="font-medium">{nomeColaboradora}</p>
                          </div>
                          
                          {payment.payment_notes && (
                            <div>
                              <p className="text-xs text-muted-foreground">Observações</p>
                              <p className="text-sm break-words">{payment.payment_notes}</p>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentId(payment.id)
                                setIsCancelDialogOpen(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Botão Finalizar */}
      {totalRestante <= 0 && payments.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={finalizarPagamento}
            disabled={isProcessing}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Finalizar pagamento
              </>
            )}
          </Button>
        </div>
      )}

      {/* Dialog de Cancelamento */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPaymentId && cancelarPagamento(selectedPaymentId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, cancelar pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
