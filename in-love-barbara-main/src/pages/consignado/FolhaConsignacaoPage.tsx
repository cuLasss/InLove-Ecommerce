/**
 * Página de Exemplo: Gerenciar Folha de Consignação
 * 
 * Esta página demonstra como usar o sistema de folhas com código único
 * para gerenciar consignações específicas.
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
// Sistema local - não precisa de Supabase
import { GerenciarFolha } from '@/components/consignado/GerenciarFolha'
import { GerenciarDevolucoes } from '@/components/consignado/GerenciarDevolucoes'
import { GerenciarPagamento } from '@/components/consignado/GerenciarPagamento'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FolhaInfo {
  id: string
  codigo: string
  cliente_name: string
  created_at: string
  prazo: string
  status: string
}

export default function FolhaConsignacaoPage() {
  const { folhaCodigo } = useParams<{ folhaCodigo: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [folhaInfo, setFolhaInfo] = useState<FolhaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Verificar se foi requisitada página específica por status
  const requestedStatus = searchParams.get('status')
  
  // Função para limpar cache de uma folha específica
  const clearFolhaCache = (codigo: string) => {
    const cacheKey = `folha_info_${codigo}`
    localStorage.removeItem(cacheKey)
    console.log('🧹 [FolhaConsignacaoPage] Cache limpo para folha:', codigo)
  }

  // Buscar informações da folha
  useEffect(() => {
    const fetchFolhaInfo = async () => {
      if (!folhaCodigo) return

      try {
        setIsLoading(true)
        setError(null)

        // Primeiro, tentar carregar do cache local
        const cacheKey = `folha_info_${folhaCodigo}`
        const cachedFolhaInfo = localStorage.getItem(cacheKey)
        
        if (cachedFolhaInfo) {
          try {
            const parsedCache = JSON.parse(cachedFolhaInfo)
            console.log('📦 [FolhaConsignacaoPage] Carregando folha do cache:', parsedCache)
            
            // Verificar se o cache não está muito antigo (máximo 5 minutos)
            const cacheAge = Date.now() - (parsedCache.timestamp || 0)
            const maxCacheAge = 5 * 60 * 1000 // 5 minutos
            
            if (cacheAge < maxCacheAge) {
              setFolhaInfo(parsedCache.data)
              setIsLoading(false)
              console.log('✅ [FolhaConsignacaoPage] Folha carregada do cache')
              return
            } else {
              console.log('⏰ [FolhaConsignacaoPage] Cache expirado, buscando dados atualizados')
            }
          } catch (cacheError) {
            console.error('❌ [FolhaConsignacaoPage] Erro ao carregar cache:', cacheError)
          }
        }

        // Buscar dados reais da consignação
        console.log('🔄 [FolhaConsignacaoPage] Buscando folha (modo local):', folhaCodigo)
        
        // Importar API dinamicamente para evitar problemas de importação
        const { consignacaoApi } = await import('@/lib/api')
        
        // Buscar consignação pelo código - verificar em todos os status possíveis
        const consignacoesRascunho = await consignacaoApi.getAll('RASCUNHO', 1, 100)
        const consignacoesEntregue = await consignacaoApi.getAll('ENTREGUE', 1, 100)
        const consignacoesAguardando = await consignacaoApi.getAll('EM_CONFERENCIA', 1, 100)
        
        const allConsignacoes = [
          ...(Array.isArray(consignacoesRascunho) ? consignacoesRascunho : consignacoesRascunho?.data || []),
          ...(Array.isArray(consignacoesEntregue) ? consignacoesEntregue : consignacoesEntregue?.data || []),
          ...(Array.isArray(consignacoesAguardando) ? consignacoesAguardando : consignacoesAguardando?.data || [])
        ]
        
        const folha = allConsignacoes.find((c: any) => c.codigo === folhaCodigo)
        
        console.log('🔍 [FolhaConsignacaoPage] Busca realizada:', {
          folhaCodigo,
          totalConsignacoes: allConsignacoes.length,
          statusEncontrados: [...new Set(allConsignacoes.map(c => c.status))],
          folhaEncontrada: folha ? {
            id: folha.id,
            codigo: folha.codigo,
            client_id: folha.client_id,
            clients: folha.clients,
            cliente_name: folha.cliente_name,
            status: folha.status
          } : null
        })
          
        if (folha) {
          // Tentar múltiplas formas de obter o nome do cliente
          const clienteName = folha.clients?.name || 
                             folha.cliente_name || 
                             folha.clients?.nome ||
                             folha.client_name ||
                             'Cliente não informado'
          
          console.log('🔍 [FolhaConsignacaoPage] Dados do cliente:', {
            clienteId: folha.client_id,
            clienteName: clienteName,
            clientsObject: folha.clients,
            cliente_name: folha.cliente_name,
            client_name: folha.client_name,
            folhaId: folha.id,
            status: folha.status
          })
          
          const folhaData = {
            id: folha.id,
            codigo: folha.codigo,
            cliente_name: clienteName,
            created_at: folha.created_at,
            prazo: folha.data_prevista,
            status: folha.status
          }
          
          setFolhaInfo(folhaData)
          
          // Salvar no cache local para persistir entre navegações
          const cacheData = {
            data: folhaData,
            timestamp: Date.now()
          }
          localStorage.setItem(cacheKey, JSON.stringify(cacheData))
          
          console.log('✅ [FolhaConsignacaoPage] Folha carregada e salva no cache:', {
            cliente: clienteName,
            cacheKey: cacheKey
          })
        } else {
          setError('Folha não encontrada')
        }
        
        setIsLoading(false)
      } catch (err: any) {
        setError(err.message)
        setIsLoading(false)
      }
    }

    fetchFolhaInfo()
  }, [folhaCodigo])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando folha...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Se os dados da folha foram carregados com sucesso, mostrar o componente apropriado
  if (folhaInfo && !error) {
    // Determinar qual componente usar baseado no status
    const isEntregue = folhaInfo.status === 'ENTREGUE' || requestedStatus === 'ENTREGUE'
    const isAguardandoPagamento = folhaInfo.status === 'EM_CONFERENCIA' || requestedStatus === 'EM_CONFERENCIA'
    
    if (isAguardandoPagamento) {
      // Para folhas "aguardando pagamento", usar componente de pagamento
      return (
        <GerenciarPagamento
          folhaCodigo={folhaCodigo!}
          folhaInfo={folhaInfo}
          onBack={() => navigate('/consignado')}
        />
      )
    }
    
    if (isEntregue) {
      // Para folhas "com a cliente", usar componente de devoluções
      return (
        <GerenciarDevolucoes
          folhaCodigo={folhaCodigo!}
          folhaInfo={folhaInfo}
          onBack={() => navigate('/consignado')}
        />
      )
    }
    
    // Para outros status (RASCUNHO), usar componente normal de gerenciamento
    return (
      <GerenciarFolha
        folhaCodigo={folhaCodigo!}
        folhaInfo={folhaInfo}
        onBack={() => navigate('/consignado')}
        onEntregarLote={() => {
          console.log('Entregar lote será implementado')
          navigate('/consignado')
        }}
      />
    )
  }

  // Fallback: página informativa quando folha não é encontrada ou há erro
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
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
            <h1 className="text-2xl font-bold">Folha {folhaCodigo || 'Não encontrada'}</h1>
            <p className="text-muted-foreground">
              {error ? error : 'Folha não encontrada ou dados indisponíveis'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Verifique se o código da folha está correto e tente novamente.
              </p>
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
