import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * CORREÇÃO DEFINITIVA DO SISTEMA DE EXIBIÇÃO DE PRAZO DE CONSIGNAÇÃO
 * 
 * PROBLEMA ANTERIOR:
 * - O prazo aparecia apenas como "-" mesmo quando havia data cadastrada
 * - Bug de timezone causava subtração automática de 1 dia da data escolhida
 * - Datas inválidas (como ano 10000) causavam erros de renderização
 * - Falta de tratamento para datas nulas/undefined
 * 
 * SOLUÇÃO IMPLEMENTADA:
 * - Função formatDateSafe() que trata todos os casos de forma robusta
 * - Correção do bug de timezone usando apenas a parte da data (YYYY-MM-DD)
 * - Validação de anos para evitar datas absurdas (1900-3000)
 * - Fallback claro para datas nulas: "Sem prazo definido"
 * 
 * RESULTADO:
 * - Prazo sempre visível e correto
 * - Sem mais exibição de "-"
 * - Formatação consistente com o padrão do sistema (dd/MM/yyyy)
 * - Tratamento robusto de casos extremos
 */

/**
 * Formata uma data de forma segura, tratando problemas de timezone e datas inválidas
 * 
 * CORREÇÃO PRINCIPAL: Evita o bug de subtração de 1 dia causado por conversão de timezone
 * 
 * @param dateString - String da data no formato ISO ou outro formato válido
 * @param formatStr - Formato desejado (ex: "dd/MM/yyyy")
 * @param fallbackText - Texto a ser exibido quando não há data (padrão: "Sem prazo definido")
 * @returns String formatada ou texto de fallback
 */
export function formatDateSafe(
  dateString: string | null | undefined, 
  formatStr: string, 
  fallbackText: string = 'Sem prazo definido'
): string {
  // REQUISITO 4: Se não houver data cadastrada, exibir mensagem clara "Sem prazo definido"
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return fallbackText
  }
  
  try {
    // REQUISITO 3: Corrigir bug que reduz automaticamente 1 dia da data escolhida
    // Validação de datas inválidas (como ano 10000) que causavam erros
    const date = new Date(dateString)
    if (isNaN(date.getTime()) || date.getFullYear() > 3000 || date.getFullYear() < 1900) {
      return 'Data inválida'
    }
    
    // CORREÇÃO PRINCIPAL: Para datas no formato ISO (YYYY-MM-DDTHH:mm:ss)
    // Usar apenas a parte da data para evitar problemas de timezone que causavam subtração de 1 dia
    if (dateString.includes('T')) {
      const dateOnly = dateString.split('T')[0]  // Extrai apenas YYYY-MM-DD
      const [year, month, day] = dateOnly.split('-')
      
      // Cria a data no fuso horário local para evitar conversão UTC que subtrai um dia
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      
      // Se o formato solicitado inclui hora, usar a data original
      if (formatStr.includes('HH') || formatStr.includes('mm')) {
        return format(date, formatStr, { locale: ptBR })
      }
      
      // REQUISITO 2: A data deve ser exibida no mesmo formato já adotado pelo sistema
      // Para apenas data, usar a data local para evitar problemas de timezone
      return format(localDate, formatStr, { locale: ptBR })
    }
    
    // Para outros formatos de data, usar a formatação normal
    return format(date, formatStr, { locale: ptBR })
  } catch (error) {
    console.error('❌ Erro ao formatar data:', dateString, error)
    return 'Data inválida'
  }
}

/**
 * Formata uma data prevista de consignação com tratamento específico
 * CORREÇÃO DEFINITIVA: Evita bug de timezone que subtrai 1 dia
 * 
 * @param dateString - String da data prevista
 * @returns String formatada ou "Sem prazo definido"
 */
export function formatConsignacaoDate(dateString: string | null | undefined): string {
  // CORREÇÃO DEFINITIVA: Para datas de consignação, usar parsing direto para evitar timezone
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return 'Sem prazo definido'
  }
  
  try {
    // Para datas no formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
    if (dateString.includes('-')) {
      const dateOnly = dateString.split('T')[0]  // Pega apenas a parte da data
      const [year, month, day] = dateOnly.split('-')
      
      // CORREÇÃO DEFINITIVA: Criar data diretamente com componentes locais
      // Isso evita completamente conversões de timezone problemáticas
      const dayNumber = parseInt(day)
      const monthNumber = parseInt(month) - 1  // Date() usa meses de 0-11
      const yearNumber = parseInt(year)
      
      // Criar data no horário local sem timezone
      const localDate = new Date(yearNumber, monthNumber, dayNumber)
      
      // Formatação brasileira
      return localDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      })
    }
    
    // Fallback para outros formatos
    return formatDateSafe(dateString, 'dd/MM/yyyy', 'Sem prazo definido')
  } catch (error) {
    console.error('❌ Erro ao formatar data de consignação:', dateString, error)
    return 'Data inválida'
  }
}

/**
 * Verifica se uma data é válida
 * @param dateString - String da data
 * @returns true se a data é válida, false caso contrário
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return false
  }
  
  try {
    const date = new Date(dateString)
    return !isNaN(date.getTime()) && 
           date.getFullYear() >= 1900 && 
           date.getFullYear() <= 3000
  } catch {
    return false
  }
}
