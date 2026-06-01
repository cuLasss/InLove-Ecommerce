import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye, Filter } from 'lucide-react'
// Sistema local - não precisa de Supabase
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RetailSale {
  id: string
  created_at: string
  discount_cents: number
  total_cents: number
  clients: { name: string } | null
  payments: Array<{
    method: string
    amount_cents: number
  }>
}

interface DateRange {
  start: Date
  end: Date
  label: string
}

const PAYMENT_LABELS = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  DEBITO: 'Débito', 
  CREDITO: 'Crédito'
}

// Date input helpers
const DATE_MAX_LEN = 10

function onlyDateChars(s: string) {
  // mantém apenas dígitos e /
  return s.replace(/[^\d/]/g, '').slice(0, DATE_MAX_LEN)
}

function formatDateInputAuto(value: string): string {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '')
  
  // Aplica formatação automática conforme digita
  if (digits.length === 0) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
  
  // Limita a 8 dígitos
  return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,8)}`
}

function formatDigitsAsBrDateIfPossible(s: string) {
  // se usuário digitou 8 dígitos (sem /), formata no blur
  const digits = s.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`
  }
  return s
}

function parseBrDateStrict(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [_, dd, mm, yyyy] = m
  const d = Number(dd), mo = Number(mm) - 1, y = Number(yyyy)
  const dt = new Date(y, mo, d, 0, 0, 0, 0)
  // valida calendário real
  if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt
  return null
}

function calculateSaleTotal(sale: RetailSale): number {
  return sale?.total_cents || 0
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function parseBrDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  
  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0)
  return isNaN(date.getTime()) ? null : date
}

function formatDateInput(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}

function getQuickRanges(): DateRange[] {
  const today = new Date()
  const yesterday = subDays(today, 1)
  
  return [
    {
      start: startOfDay(today),
      end: endOfDay(today), 
      label: 'Hoje'
    },
    {
      start: startOfDay(yesterday),
      end: endOfDay(yesterday),
      label: 'Ontem'  
    },
    {
      start: startOfWeek(today, { weekStartsOn: 1 }), // Monday
      end: endOfDay(today),
      label: 'Essa semana'
    },
    {
      start: startOfMonth(today),
      end: endOfDay(today),
      label: 'Esse mês'
    }
  ]
}

interface RetailReportProps {
  onViewSale?: (saleId: string) => void
}

export function RetailReport({ onViewSale }: RetailReportProps) {
  const [dateRange, setDateRange] = useState<DateRange>(getQuickRanges()[0]) // Today
  const [sales, setSales] = useState<RetailSale[]>([])
  const [loading, setLoading] = useState(false)
  
  // Date input states and refs
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [showMonthPicker, setShowMonthPicker] = useState<'from' | 'to' | null>(null)
  const [monthPickerPosition, setMonthPickerPosition] = useState({ x: 0, y: 0 })
  const fromRef = useRef<HTMLInputElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSales()
  }, [dateRange])

  // Fechar month picker ao clicar fora
  useEffect(() => {
    if (showMonthPicker) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('.month-picker-container')) {
          setShowMonthPicker(null)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMonthPicker])

  const fetchSales = async () => {
    setLoading(true)
    try {
      const { data, error } = await Promise.resolve({ data: [], error: null }); // Sistema local
      
      if (error) {
        console.error('Erro ao buscar vendas:', error);
        setSales([]);
      } else {
        setSales(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  // Date input handlers
  const handleDateChange = (field: 'from' | 'to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatDateInputAuto(e.target.value);
    if (field === 'from') {
      setFromText(value);
    } else {
      setToText(value);
    }
  };

  const handleDateBlur = (field: 'from' | 'to') => (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Validar e processar a data quando o campo perde o foco
    if (value.length === 10) { // DD/MM/YYYY ou DD/MM/AA
      try {
        const [day, month, year] = value.split('/').map(Number);
        let fullYear = year;
        
        // Se o ano tem 2 dígitos, assumir 20XX
        if (year < 100) {
          fullYear = 2000 + year;
        }
        
        // Validar se a data é válida
        const date = new Date(fullYear, month - 1, day);
        if (date.getFullYear() === fullYear && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          
          // Data válida - manter o valor formatado
          const formattedValue = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${fullYear.toString().slice(-2)}`;
          if (field === 'from') {
            setFromText(formattedValue);
          } else {
            setToText(formattedValue);
          }
        } else {
          // Data inválida - limpar o campo
          if (field === 'from') {
            setFromText('');
          } else {
            setToText('');
          }
        }
      } catch (error) {
        // Erro ao processar - limpar o campo
        if (field === 'from') {
          setFromText('');
        } else {
          setToText('');
        }
      }
    }
  };

  // Month picker handlers
  function handleDateInputClick(field: 'from' | 'to', e: React.MouseEvent<HTMLInputElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const inputWidth = rect.width
    
    // Região mais precisa para o mês no formato DD/MM/AA
    // DD/MM/AA - o mês está entre a primeira e segunda barra
    const monthStart = (inputWidth * 2.5) / 10 // ~25% do input (após DD/)
    const monthEnd = (inputWidth * 5.5) / 10   // ~55% do input (antes de /AA)
    
    if (clickX >= monthStart && clickX <= monthEnd) {
      setMonthPickerPosition({ x: rect.left + clickX - 30, y: rect.bottom + 5 })
      setShowMonthPicker(field)
    }
  }

  function handleMonthSelect(month: number) {
    const field = showMonthPicker
    if (!field) return

    const currentText = field === 'from' ? fromText : toText
    const parts = currentText.split('/')
    
    // Se não tem partes suficientes, cria uma data padrão
    if (parts.length < 2) {
      const today = new Date()
      const newText = `01/${month.toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`
      
      if (field === 'from') {
        setFromText(newText)
      } else {
        setToText(newText)
      }
    } else {
      // Atualiza apenas o mês
      parts[1] = month.toString().padStart(2, '0')
      
      // Se não tem ano, adiciona o ano atual
      if (parts.length < 3) {
        const currentYear = new Date().getFullYear().toString().slice(-2)
        parts[2] = currentYear
      }
      
      const newText = parts.join('/')
      
      if (field === 'from') {
        setFromText(newText)
      } else {
        setToText(newText)
      }
    }
    
    setShowMonthPicker(null)
  }

  const applyCustomRange = () => {
    const startDate = parseBrDateStrict(fromText)
    const endDate = parseBrDateStrict(toText)
    
    if (!startDate || !endDate) {
      alert('Por favor, insira datas válidas no formato DD/MM/AAAA')
      return
    }
    
    if (startDate > endDate) {
      alert('A data de início deve ser anterior à data de fim')
      return
    }

    setDateRange({
      start: startOfDay(startDate),
      end: endOfDay(endDate),
      label: `${formatDateInput(startDate)} - ${formatDateInput(endDate)}`
    })
  }

  // Calculate metrics
  const totalSales = sales.length
  const totalValue = sales.reduce((acc, sale) => acc + calculateSaleTotal(sale), 0)
  const avgTicket = totalSales > 0 ? totalValue / totalSales : 0

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Relatório de Vendas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {getQuickRanges().map((range) => (
              <Badge
                key={range.label}
                variant={dateRange.label === range.label ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setDateRange(range)}
              >
                {range.label}
              </Badge>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex flex-wrap gap-2 items-end relative">
            <div>
              <label className="text-sm font-medium">Data inicial</label>
              <Input
                ref={fromInputRef}
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AA"
                maxLength={10}
                value={fromText}
                onChange={handleDateChange('from')}
                onBlur={handleDateBlur('from')}
                onClick={(e) => handleDateInputClick('from', e)}
                autoComplete="off"
                className="w-32 cursor-text"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data final</label>
              <Input
                ref={toInputRef}
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AA"
                maxLength={10}
                value={toText}
                onChange={handleDateChange('to')}
                onBlur={handleDateBlur('to')}
                onClick={(e) => handleDateInputClick('to', e)}
                autoComplete="off"
                className="w-32 cursor-text"
              />
            </div>
            <Button onClick={applyCustomRange} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar
            </Button>

            {/* Month Picker */}
            {showMonthPicker && (
              <div 
                className="month-picker-container absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1"
                style={{
                  left: monthPickerPosition.x,
                  top: monthPickerPosition.y
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <button
                    key={month}
                    className="px-2 py-1 text-xs hover:bg-gray-100 rounded"
                    onClick={() => handleMonthSelect(month)}
                  >
                    {month.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">{totalSales}</div>
            <div className="text-sm text-muted-foreground">Total de vendas</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">{formatBRL(totalValue)}</div>
            <div className="text-sm text-muted-foreground">Valor total</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">{formatBRL(avgTicket)}</div>
            <div className="text-sm text-muted-foreground">Ticket médio</div>
          </div>
        </div>

        {/* Sales Table */}
        <div>
          <h3 className="font-semibold mb-3">
            Vendas no período: {dateRange.label}
          </h3>
          {loading ? (
            <div className="text-center py-8">Carregando vendas...</div>
          ) : sales.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Colaboradora</TableHead>
                    <TableHead>Pagamentos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const paymentSummary = sale.payments
                      .map(p => `${formatBRL(p.amount_cents)} ${PAYMENT_LABELS[p.method as keyof typeof PAYMENT_LABELS] || p.method}`)
                      .join(' • ')
                    
                    return (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(new Date(sale.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {sale.clients?.name || 'Consumidor final'}
                        </TableCell>
                        <TableCell>
                          {'Admin'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {paymentSummary || 'Nenhum'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatBRL(calculateSaleTotal(sale))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewSale?.(sale.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma venda encontrada no período
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}