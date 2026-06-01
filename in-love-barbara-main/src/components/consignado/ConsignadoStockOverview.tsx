/**
 * Componente para Visão Geral do Estoque Consignado
 * 
 * Este componente exibe a visão geral do estoque consignado,
 * incluindo estatísticas e distribuição por produto.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign,
  RefreshCw,
  BarChart3,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  User,
  Filter,
  Eye,
  Search,
  Handshake,
  Clock,
  CheckCircle
} from 'lucide-react'
// Sistema local - não precisa de Supabase
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useConsignadoStats } from '@/hooks/useConsignadoReal'

interface ConsignadoData {
  total_produtos: number
  total_itens_consignados: number
  total_valor_consignado_cents: number
  total_clientes_ativos: number
  produtos: Array<{
    product_id: string
    product_name: string
    short_code: string | null
    estoque_normal: number
    estoque_consignado: number
    estoque_total: number
    preco_cents: number
    clientes_count: number
    clientes_detail: Array<{
      cliente_id: string
      cliente_name: string
      qtd_consignada: number
      status: string
      folha_codigo: string
      preco_unitario_cents: number
    }>
  }>
}

interface ConsignadoStockOverviewProps {
  onFilterByProduct?: (productId: string, productName: string) => void
}

export function ConsignadoStockOverview({ onFilterByProduct }: ConsignadoStockOverviewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  
  // Usar o hook personalizado para buscar dados reais do banco
  const { stats, isLoading, reservas, porProduto, porCliente } = useConsignadoStats()


  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleFilterByProduct = (productId: string, productName: string) => {
    if (onFilterByProduct) {
      onFilterByProduct(productId, productName)
      setIsModalOpen(false)
      toast({
        title: "Filtro aplicado",
        description: `Filtrando por: ${productName}`,
      })
    }
  }

  const filteredProducts = porProduto?.filter(product => 
    product.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.products?.short_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estoque Consignado - Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estoque Consignado - Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3 md:gap-3 lg:gap-3 desktop:gap-4">
        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0 px-3 sm:px-4 md:px-4 lg:px-5 desktop:px-6">
            <div className="min-h-[2.5rem] lg:min-h-[2rem] desktop:min-h-[3rem] flex items-start">
              <CardTitle className="text-xs sm:text-sm lg:text-xs desktop:text-sm font-medium flex items-start gap-1.5 sm:gap-2 break-words whitespace-normal leading-tight lg:leading-[1.2] desktop:leading-[1.3] hyphens-none min-w-0">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 desktop:h-4 desktop:w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="break-words whitespace-normal min-w-0">Produtos Reservados</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col justify-start flex-grow pt-0 px-3 sm:px-4 md:px-4 lg:px-5 desktop:px-6 pb-3 sm:pb-4 md:pb-4 lg:pb-4 desktop:pb-6">
            <div className="mb-2 sm:mb-3">
              <div className="text-xl sm:text-2xl lg:text-xl desktop:text-2xl font-bold">{stats.total_produtos_consignados}</div>
            </div>
            <p className="text-[10px] xs:text-xs lg:text-[10px] desktop:text-xs text-muted-foreground break-words whitespace-normal">
              Produtos únicos em consignação
            </p>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0 px-3 sm:px-4 md:px-4 lg:px-5 desktop:px-6">
            <div className="min-h-[2.5rem] lg:min-h-[2rem] desktop:min-h-[3rem] flex items-start">
              <CardTitle className="text-xs sm:text-sm lg:text-xs desktop:text-sm font-medium flex items-start gap-1.5 sm:gap-2 break-words whitespace-normal leading-tight lg:leading-[1.2] desktop:leading-[1.3] hyphens-none min-w-0">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 desktop:h-4 desktop:w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="break-words whitespace-normal min-w-0">Unidades Reservadas</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col justify-start flex-grow pt-0 px-3 sm:px-4 md:px-4 lg:px-5 desktop:px-6 pb-3 sm:pb-4 md:pb-4 lg:pb-4 desktop:pb-6">
            <div className="mb-2 sm:mb-3">
              <div className="text-xl sm:text-2xl lg:text-xl desktop:text-2xl font-bold">{stats.total_unidades_reservadas}</div>
            </div>
            <p className="text-[10px] xs:text-xs lg:text-[10px] desktop:text-xs text-muted-foreground break-words whitespace-normal">
              Total de unidades consignadas
            </p>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col overflow-hidden sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 flex-shrink-0 px-3 sm:px-4 md:px-4 lg:px-5 desktop:px-6">
            <div className="min-h-[2.5rem] lg:min-h-[2rem] desktop:min-h-[3rem] flex items-start">
              <CardTitle className="text-xs sm:text-sm lg:text-xs desktop:text-sm font-medium flex items-start gap-1.5 sm:gap-2 break-words whitespace-normal leading-tight lg:leading-[1.2] desktop:leading-[1.3] hyphens-none min-w-0">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 desktop:h-4 desktop:w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="break-words whitespace-normal min-w-0">Clientes Ativos</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col justify-start flex-grow pt-0 px-3 sm:px-4 md:px-4 lg:px-5 desktop:px-6 pb-3 sm:pb-4 md:pb-4 lg:pb-4 desktop:pb-6">
            <div className="mb-2 sm:mb-3">
              <div className="text-xl sm:text-2xl lg:text-xl desktop:text-2xl font-bold">{stats.total_clientes_ativos}</div>
            </div>
            <p className="text-[10px] xs:text-xs lg:text-[10px] desktop:text-xs text-muted-foreground break-words whitespace-normal">
              Com folhas ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela por Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.total_clientes_ativos === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum cliente com folhas ativas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {porCliente?.map((consignacao) => (
                <div key={consignacao.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{consignacao.clients?.name || 'Cliente não encontrado'}</h4>
                      <p className="text-xs text-muted-foreground">
                        Folha: {consignacao.codigo} • Status: {consignacao.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {consignacao.status === 'ENTREGUE' ? 'Entregue' : 'Em preparação'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(consignacao.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              )) || []}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela por Produto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Por Produto
            </CardTitle>
            {porProduto && porProduto.length > 0 && onFilterByProduct && (
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar Produtos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Filtrar por Produto em Consignação</DialogTitle>
                  </DialogHeader>
                  
                  {/* Busca */}
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '2.75rem' }}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Lista de produtos */}
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto em consignação'}
                        </p>
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product.product_id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleFilterByProduct(product.product_id!, product.products?.name || 'Produto')}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{product.products?.name || 'Produto não encontrado'}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Código: {product.products?.short_code || 'N/A'} • 
                                  {product.qty_reservada || 0} unidades • 
                                  R$ {((product.products?.price_cents || 0) / 100).toFixed(2)} cada
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              R$ {(((product.products?.price_cents || 0) * (product.qty_reservada || 0)) / 100).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {product.qty_reservada || 0} unidades
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Filtrar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {porProduto && porProduto.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum produto em consignação</p>
            </div>
          ) : (
            <div className="space-y-2">
              {porProduto?.map((product) => (
                <div key={product.product_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.products?.name || 'Produto não encontrado'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Código: {product.products?.short_code || 'N/A'} • {product.qty_reservada || 0} unidades reservadas
                      </p>
                      <div className="mt-1 flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {product.qty_reservada || 0} unidades
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="h-3 w-3 mr-1" />
                          R$ {(((product.products?.price_cents || 0) * (product.qty_reservada || 0)) / 100).toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">
                        {product.qty_reservada || 0} unidades
                      </div>
                      <div className="text-xs text-muted-foreground">
                        R$ {((product.products?.price_cents || 0) / 100).toFixed(2)} cada
                      </div>
                    </div>
                  </div>
                </div>
              )) || []}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
