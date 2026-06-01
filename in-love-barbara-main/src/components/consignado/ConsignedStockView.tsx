import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Package, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw,
  Eye,
  History,
  ChevronDown,
  ChevronRight,
  Users,
  BarChart3
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
// Sistema local - não precisa de Supabase

// Mock functions for missing exports
const obter_resumo_consignado = async () => ({ total_consigned: 0, total_products: 0, products: [] })
const obter_historico_movimentacoes = async () => ([])
const validar_consistencia_estoque = async () => ({ consistent: true, issues: [] })

interface ConsignedStockSummary {
  total_consigned: number
  total_products: number
  products: Array<{
    id: string
    name: string
    stock_consigned: number
    stock_normal: number
  }>
}

interface ConsignedStockByClient {
  product_id: string
  product_name: string
  client_id: string
  client_name: string
  total_consigned: number
  active_consigned: number
  returned_consigned: number
  sold_consigned: number
}

interface ConsignedStockByProduct {
  product_id: string
  product_name: string
  stock_normal: number
  stock_consigned_global: number
  stock_total: number
  clients_count: number
  clients_detail: Array<{
    client_id: string
    client_name: string
    quantity: number
    status: string
  }>
}

interface GlobalSummary {
  total_products: number
  total_consigned: number
  total_clients: number
  products_with_consigned: number
  clients_with_consigned: number
}

interface StockMovement {
  id: string
  product_id: string
  movement_type: 'TO_CONSIGNED' | 'FROM_CONSIGNED' | 'SOLD'
  quantity: number
  consignacao_id?: string
  created_at: string
  created_by?: string
  notes?: string
  products?: {
    id: string
    name: string
  }
}

export function ConsignedStockView() {
  const [summary, setSummary] = useState<ConsignedStockSummary | null>(null)
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(null)
  const [productsByClient, setProductsByClient] = useState<ConsignedStockByProduct[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load summary (legacy)
      const summaryData = await obter_resumo_consignado()
      setSummary(summaryData)
      
      // Load global summary - fallback to direct query until migration is applied
      try {
        // Sistema local - apenas log
        console.log('Buscando resumo global (modo local)')
      } catch (error) {
        console.error('Erro ao buscar resumo:', error)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast({
        title: "❌ Erro",
        description: "Falha ao carregar dados do estoque consignado",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return null
}
