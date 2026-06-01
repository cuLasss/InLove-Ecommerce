import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Package, 
  Search, 
  Filter, 
  Calendar,
  User,
  MapPin,
  Eye,
  ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageShell } from '@/components/layout/PageShell'
import { PageHeader } from '@/components/layout/PageShell'
import { useConsignacoes, ConsignacaoLote } from '@/hooks/useConsignacoes'

export default function LotesEntreguesPage() {
  const { lotes, loadingLotes } = useConsignacoes()
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  // Filtrar apenas lotes entregues
  const lotesEntregues = useMemo(() => {
    return lotes.filter((lote) => {
      // Type assertion to ensure lote has the correct type
      const typedLote = lote as unknown as ConsignacaoLote;
      return typedLote.status === 'ENTREGUE';
    })
  }, [lotes])

  // Aplicar filtros de busca
  const filteredLotes = useMemo(() => {
    return lotesEntregues.filter((lote) => {
      const matchesSearch = searchTerm === '' || 
        lote.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.representative_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDate = dateFilter === '' || 
        (lote.data_prevista && lote.data_prevista.includes(dateFilter))

      const matchesClient = clientFilter === '' || 
        lote.clients?.name === clientFilter

      return matchesSearch && matchesDate && matchesClient
    })
  }, [lotesEntregues, searchTerm, dateFilter, clientFilter])

  // Obter lista única de clientes para o filtro
  const uniqueClients = useMemo(() => {
    const clients = lotesEntregues
      .map((lote) => lote.clients?.name)
      .filter(Boolean)
    return [...new Set(clients)]
  }, [lotesEntregues])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return '-'
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return '-'
    }
  }

  return (
    <PageShell>
      <PageHeader 
        title="Lotes Entregues"
        actions={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/consignado/lotes">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-green-600" />
                <h1 className="text-2xl font-bold">Lotes Entregues</h1>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredLotes.length} lote{filteredLotes.length !== 1 ? 's' : ''} encontrado{filteredLotes.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
                  <Input
                    placeholder="Cliente, representante, cidade ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Entrega</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os clientes</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchTerm || dateFilter || clientFilter) && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setDateFilter('')
                    setClientFilter('')
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Lotes Entregues */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes dos Lotes Entregues</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLotes ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Carregando lotes...</div>
              </div>
            ) : filteredLotes.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Nenhum lote entregue encontrado
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lotesEntregues.length === 0 
                    ? 'Ainda não há lotes entregues no sistema.'
                    : 'Tente ajustar os filtros para encontrar os lotes desejados.'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Data de Entrega</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead>Comissão (%)</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">
                          {`#${lote.id.slice(-8)}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {lote.clients?.name || 'Cliente não informado'}
                              </div>
                              {lote.clients?.whatsapp && (
                                <div className="text-sm text-muted-foreground">
                                  {lote.clients.whatsapp}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{lote.representative_name || 'Não informado'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {lote.city || 'Não informado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-700">
                              {formatDateTime(lote.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(lote.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {lote.commission_default_percent || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/consignado/lotes/${lote.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo */}
        {filteredLotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    {filteredLotes.length}
                  </div>
                  <div className="text-sm text-green-600">
                    Lotes Entregues
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {uniqueClients.length}
                  </div>
                  <div className="text-sm text-blue-600">
                    Clientes Únicos
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {filteredLotes.length > 0 ? Math.round(
                      filteredLotes.reduce((acc, lote) => acc + (lote.commission_default_percent || 0), 0) / 
                      filteredLotes.length
                    ) : 0}%
                  </div>
                  <div className="text-sm text-purple-600">
                    Comissão Média
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}