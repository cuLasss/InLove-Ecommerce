/**
 * Componente: Gerenciar Rascunho Local (Simplificado)
 * 
 * Interface simplificada para gerenciar rascunho sem salvamento automático.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CommissionInput } from '@/components/ui/commission-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Minus, 
  Trash2,
  Scan,
  Save,
  Package,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Percent,
  DollarSign,
  Calculator,
  Truck,
  FileText
} from 'lucide-react'
import { SmartScannerSheet } from '@/components/scan/SmartScannerSheet'
// import { useRascunhoLocal } from '@/hooks/useRascunhoLocal' // Removido para evitar loops
// import { useProducts } from '@/hooks/useProducts' // Removido para evitar loops
// import { useStockQuery } from '@/hooks/useStockQuery' // Removido para evitar loops
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
// Sistema local - não precisa de Supabase
// import { useConsignacoes } from '@/hooks/useConsignacoes' // Removido para evitar loops
import { useNavigate } from 'react-router-dom'
import { GerenciarDevolucoes } from './GerenciarDevolucoes'
import { GerenciarPagamento } from './GerenciarPagamento'

interface GerenciarRascunhoLocalProps {
  folhaCodigo: string
  folhaInfo?: {
    cliente_name?: string
    status?: string
  }
  onBack?: () => void
}

export function GerenciarRascunhoLocal({ folhaCodigo, folhaInfo, onBack }: GerenciarRascunhoLocalProps) {
  // console.log('🚀 [GerenciarRascunhoLocal] Componente iniciado com:', { folhaCodigo, folhaInfo }) // REMOVIDO PARA EVITAR LOOPS
  
  const [productCode, setProductCode] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [itensSalvos, setItensSalvos] = useState<any[]>([])
  const [isLoadingSalvos, setIsLoadingSalvos] = useState(false)
  const [rascunhoSalvo, setRascunhoSalvo] = useState(false)
  const [produtoEncontrado, setProdutoEncontrado] = useState<any>(null)
  const [estoqueDisponivel, setEstoqueDisponivel] = useState<number | null>(null)
  const [globalCommission, setGlobalCommission] = useState('')
  const [isApplyingGlobalCommission, setIsApplyingGlobalCommission] = useState(false)
  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionValue, setCommissionValue] = useState('')
  const [folhaId, setFolhaId] = useState<string | null>(null)
  // Estado local para controlar o status atual da folha
  const [statusAtual, setStatusAtual] = useState<string | undefined>(folhaInfo?.status)
  
  const { toast } = useToast()
  
  // Função local para buscar produto por código
  const findProductByCode = async (code: string) => {
    try {
      // Sistema local - retornar null
      return null
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      return null
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerenciamento de Rascunho - {folhaCodigo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                📝 Rascunho
              </Badge>
              {folhaInfo?.cliente_name && (
                <span className="text-sm text-muted-foreground">
                  Cliente: {folhaInfo.cliente_name}
                </span>
              )}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Componente de gerenciamento de rascunho será implementado em breve. 
                Por enquanto, você pode usar a funcionalidade "Abrir" para visualizar os dados da consignação.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              {onBack && (
                <Button 
                  variant="outline"
                  onClick={onBack}
                >
                  Voltar à Lista
                </Button>
              )}
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Implementar Rascunho
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
