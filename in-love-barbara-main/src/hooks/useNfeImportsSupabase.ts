import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { supabaseAdmin } from '@/integrations/supabase/client-with-auth'
import { logger } from '@/lib/logger'
import { parseNfeXml, generateNfeHash, checkNfeDuplicate, type NfeXmlData, type NfeValidationResult } from '@/lib/xml-parser'
import { format } from 'date-fns'

export interface NfeImport {
  id: string
  filename: string
  status: 'PENDING' | 'IMPORTED' | 'INVALID'
  total_products: number
  processed_products: number
  errors: string[]
  warnings?: string[]
  created_at: string
  updated_at: string
  // Campos específicos da NF-e
  chave_acesso?: string
  numero?: string
  serie?: string
  data_emissao?: string
  emitente_nome?: string
  emitente_cnpj?: string
  destinatario_nome?: string
  destinatario_cnpj?: string
  valor_total?: number
  status_nfe?: 'AUTORIZADA' | 'CANCELADA' | 'INUTILIZADA' | 'REJEITADA'
  error_code?: string
  error_message?: string
  // Campos do banco
  hash?: string
  file_name?: string
  raw_xml?: string
  provider?: string
  // Legacy fields for compatibility
  issuer_name?: string
  issuer_cnpj?: string
  issued_at?: string
  total_cents?: number
  nfe_items?: NfeItem[]
  xml?: {
    parsed?: NfeXmlData
    hash?: string
    isDuplicate?: boolean
    isCancelled?: boolean
  }
}

export interface NfeItem {
  id: string
  nfe_import_id: string
  name: string
  code: string
  unit_price: number
  quantity: number
  created_at: string
  // Campos do banco
  product_id?: string
  codigo?: string
  descricao?: string
  ncm?: string
  cfop?: string
  unidade?: string
  qty?: number
  unit_value_cents?: number
  total_value_cents?: number
  // Legacy fields for compatibility
  import_id?: string
  product_code?: string
  description?: string
  reconciled_qty?: number
  unit_cost_cents?: number
}

export interface ProductReconciliation {
  nfe_item_id: string
  product_id: string | null
  status: 'pending' | 'matched' | 'created' | 'ignored'
}

export function useNfeImportsSupabase() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Query NFE imports - Sistema Supabase
  const { data: nfeImports = [], isLoading, refetch } = useQuery({
    queryKey: ['nfe-imports-supabase'],
    queryFn: async (): Promise<NfeImport[]> => {
      try {
        console.log('🔍 [NFe] Carregando notas fiscais do Supabase...')
        
        // Buscar notas fiscais usando cliente administrativo
        const { data: nfeData, error: nfeError } = await supabaseAdmin
          .from('nfe_imports')
          .select(`
            *,
            nfe_items (*)
          `)
          .order('created_at', { ascending: false })

        if (nfeError) {
          console.error('❌ [NFe] Erro ao carregar notas fiscais:', nfeError)
          throw nfeError
        }

        // Converter dados do banco para formato da interface
        console.log('🔍 [NFe] Dados brutos do banco:', nfeData)
        
        const convertedNfes: NfeImport[] = (nfeData || []).map((nfe: any) => {
          console.log('🔍 [NFe] Processando NF-e:', {
            id: nfe.id,
            file_name: nfe.file_name,
            status: nfe.status,
            status_type: typeof nfe.status
          })
          
          return {
          id: nfe.id,
          filename: nfe.file_name || 'Arquivo desconhecido',
          status: nfe.status || 'PENDING', // Usar status do banco
          total_products: nfe.nfe_items?.length || 0,
          processed_products: 0,
          errors: [],
          warnings: [],
          created_at: nfe.created_at,
          updated_at: nfe.created_at,
          chave_acesso: nfe.chave_acesso,
          hash: nfe.hash,
          file_name: nfe.file_name,
          raw_xml: nfe.raw_xml,
          provider: nfe.provider,
          emitente_nome: nfe.provider, // Mapear para compatibilidade com interface
          issuer_name: nfe.provider, // Mapear para compatibilidade com interface
          emitente_cnpj: nfe.emitente_cnpj,
          destinatario_nome: nfe.destinatario_nome,
          destinatario_cnpj: nfe.destinatario_cnpj,
          data_emissao: nfe.data_emissao,
          numero: nfe.numero,
          serie: nfe.serie,
          valor_total: nfe.valor_total || 0,
          status_nfe: nfe.status_nfe || 'AUTORIZADA',
          nfe_items: nfe.nfe_items?.map((item: any) => ({
            id: item.id,
            nfe_import_id: item.nfe_import_id,
            name: item.descricao || 'Produto sem nome',
            code: item.codigo || '',
            unit_price: (item.unit_value_cents || 0) / 100,
            quantity: item.qty || 0,
            created_at: item.created_at,
            product_id: item.product_id,
            // Campos para compatibilidade com interface
            codigo: item.codigo,
            descricao: item.descricao,
            nome: item.descricao, // Mapear para compatibilidade
            sku: item.codigo, // Mapear para compatibilidade
            ncm: item.ncm,
            cfop: item.cfop,
            unidade: item.unidade,
            qty: item.qty,
            quantidade: item.qty, // Mapear para compatibilidade
            unit_value_cents: item.unit_value_cents,
            total_value_cents: item.total_value_cents,
            valorUnitario: (item.unit_value_cents || 0) / 100, // Mapear para compatibilidade
            valorTotal: (item.total_value_cents || 0) / 100, // Mapear para compatibilidade
            // Campos adicionais para compatibilidade com NfeViewDialog
            description: item.descricao, // Campo usado pelo NfeViewDialog
            product_code: item.codigo // Campo usado pelo NfeViewDialog
          })) || []
        }
        })

        console.log('✅ [NFe] Notas fiscais carregadas:', convertedNfes.length)
        return convertedNfes

      } catch (error) {
        console.error('❌ [NFe] Erro ao carregar notas fiscais:', error)
        return []
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true, // Permitir refetch ao focar na janela
    refetchOnMount: true,
    enabled: true // Garantir que a query seja executada
  })

  // Upload NFE file mutation - Sistema Supabase
  const uploadNfeMutation = useMutation({
    mutationFn: async (file: File): Promise<NfeImport> => {
      try {
        console.log('📤 [NFe] Iniciando upload para Supabase:', file.name)
        
        // Parseia o XML da NF-e
        const validationResult = await parseNfeXml(file)
        
        if (!validationResult.isValid) {
          console.log('❌ [NFe] NF-e inválida:', validationResult.errorMessage)
          console.log('❌ [NFe] Erros detalhados:', validationResult.errors)
          
          // Mensagem genérica conforme solicitado
          const genericMessage = validationResult.errorMessage || 'O arquivo XML não é uma NF-e válida.'
          
          const structuredError = {
            type: 'invalid' as const,
            title: 'NF-e Inválida',
            message: 'Erro ao processar arquivo XML',
            details: {
              fileName: file.name,
              errorCode: validationResult.errorCode
            },
            suggestions: [
              'Verifique se o arquivo XML está válido e não corrompido',
              'Confirme se o arquivo é uma NF-e válida',
              'Tente importar novamente ou entre em contato com o suporte'
            ]
          }
          
          throw structuredError
        }
        
        const nfeData = validationResult.data!
        
        console.log('📋 [NFe] Dados extraídos do XML:', {
          chaveAcesso: nfeData.chaveAcesso,
          numero: nfeData.numero,
          serie: nfeData.serie,
          emitente: nfeData.emitente?.nome,
          itensCount: nfeData.itens?.length || 0,
          primeiroItem: nfeData.itens?.[0] ? {
            codigo: nfeData.itens[0].codigo,
            descricao: nfeData.itens[0].descricao,
            quantidade: nfeData.itens[0].quantidade,
            valorUnitario: nfeData.itens[0].valorUnitario,
            valorTotal: nfeData.itens[0].valorTotal
          } : null
        })
        
        // Verificar status específico da NF-e para mostrar erro genérico
        if (nfeData.status === 'CANCELADA') {
          const structuredError = {
            type: 'canceled' as const,
            title: 'NF-e Cancelada',
            message: `Esta nota fiscal foi cancelada e não pode ser importada.`,
            details: {
              fileName: file.name,
              chaveAcesso: nfeData.chaveAcesso,
              numero: nfeData.numero,
              serie: nfeData.serie,
              emitente: nfeData.emitente?.nome,
              dataEmissao: nfeData.dataEmissao
            },
            suggestions: [
              'Notas fiscais canceladas não devem ser importadas para o estoque',
              'Verifique o status da NF-e no portal da Receita Federal'
            ]
          }
          throw structuredError
        }

        if (nfeData.status === 'INUTILIZADA') {
          const structuredError = {
            type: 'unauthorized' as const,
            title: 'NF-e Inutilizada',
            message: `Esta nota fiscal foi inutilizada e não pode ser importada.`,
            details: {
              fileName: file.name,
              chaveAcesso: nfeData.chaveAcesso,
              numero: nfeData.numero,
              serie: nfeData.serie,
              emitente: nfeData.emitente?.nome,
              dataEmissao: nfeData.dataEmissao
            },
            suggestions: [
              'Notas fiscais inutilizadas não devem ser importadas para o estoque',
              'Verifique o status da NF-e no portal da Receita Federal'
            ]
          }
          throw structuredError
        }

        if (nfeData.status === 'REJEITADA') {
          const structuredError = {
            type: 'unauthorized' as const,
            title: 'NF-e Rejeitada',
            message: `Esta nota fiscal foi rejeitada pela SEFAZ e não pode ser importada.`,
            details: {
              fileName: file.name,
              chaveAcesso: nfeData.chaveAcesso,
              numero: nfeData.numero,
              serie: nfeData.serie,
              emitente: nfeData.emitente?.nome,
              dataEmissao: nfeData.dataEmissao
            },
            suggestions: [
              'Notas fiscais rejeitadas não devem ser importadas para o estoque',
              'Verifique o status da NF-e no portal da Receita Federal'
            ]
          }
          throw structuredError
        }

        // Gerar hash único para a NF-e
        const nfeHash = generateNfeHash(nfeData)
        
        // Verificar se já foi importada anteriormente
        const { data: existingNfes, error: checkError } = await supabaseAdmin
          .from('nfe_imports')
          .select('id, hash')
          .eq('hash', nfeHash)
        
        if (checkError) {
          console.warn('⚠️ [NFe] Erro ao verificar duplicata:', checkError)
          // Continua com a importação mesmo se não conseguir verificar duplicata
        } else if (existingNfes && existingNfes.length > 0) {
          console.log('⚠️ [NFe] NF-e já importada anteriormente')
          
          // Buscar detalhes da NF-e existente
          const { data: existingNfeDetails } = await supabaseAdmin
            .from('nfe_imports')
            .select('id, file_name, created_at')
            .eq('hash', nfeHash)
            .single()
          
          const structuredError = {
            type: 'duplicate' as const,
            title: 'NF-e Duplicada',
            message: 'Esta nota fiscal já foi importada anteriormente no sistema.',
            details: {
              fileName: file.name,
              chaveAcesso: nfeData.chaveAcesso,
              numero: nfeData.numero,
              serie: nfeData.serie,
              emitente: nfeData.emitente?.nome,
              dataEmissao: nfeData.dataEmissao,
              existingNfe: existingNfeDetails ? {
                id: existingNfeDetails.id,
                fileName: existingNfeDetails.file_name || 'Arquivo desconhecido',
                importDate: existingNfeDetails.created_at
              } : undefined
            },
            suggestions: [
              'Verifique se você não está tentando importar a mesma NF-e novamente',
              'Se necessário, acesse a nota existente na aba "Importadas"',
              'Para importar uma versão atualizada, exclua a nota anterior primeiro'
            ]
          }
          
          throw structuredError
        }
        
        // Ler conteúdo do arquivo
        const fileContent = await file.text()
        
        // Calcular valor total da NF-e
        const valorTotal = nfeData.itens?.reduce((total: number, item: any) => {
          return total + (item.valorTotal || 0)
        }, 0) || 0

        // Inserir NF-e no banco usando cliente administrativo
        const { data: nfeImport, error: nfeError } = await supabaseAdmin
          .from('nfe_imports')
          .insert({
            hash: nfeHash,
            file_name: file.name,
            raw_xml: fileContent,
            chave_acesso: nfeData.chaveAcesso,
            provider: nfeData.emitente?.nome || 'Fornecedor desconhecido',
            numero: nfeData.numero,
            serie: nfeData.serie,
            data_emissao: nfeData.dataEmissao ? new Date(nfeData.dataEmissao).toISOString() : null,
            emitente_cnpj: nfeData.emitente?.cnpj,
            destinatario_nome: nfeData.destinatario?.nome,
            destinatario_cnpj: nfeData.destinatario?.cnpj,
            valor_total: valorTotal,
            status_nfe: nfeData.status || 'AUTORIZADA'
          })
          .select()
          .single()
        
        if (nfeError) {
          console.error('❌ [NFe] Erro ao inserir NF-e:', nfeError)
          throw nfeError
        }
        
        // Inserir itens da NF-e
        if (nfeData.itens && nfeData.itens.length > 0) {
          console.log('📦 [NFe] Inserindo itens:', nfeData.itens.length)
          
          const itemsToInsert = nfeData.itens.map((item: any) => ({
            nfe_import_id: nfeImport.id,
            codigo: item.codigo || '',
            descricao: item.descricao || 'Produto sem descrição',
            ncm: item.ncm || '',
            cfop: item.cfop || '',
            unidade: item.unidade || 'UN',
            qty: item.quantidade || 0,
            unit_value_cents: Math.round((item.valorUnitario || 0) * 100),
            total_value_cents: Math.round((item.valorTotal || 0) * 100)
          }))
          
          console.log('📦 [NFe] Dados dos itens para inserção:', itemsToInsert)
          
          const { data: insertedItems, error: itemsError } = await supabaseAdmin
            .from('nfe_items')
            .insert(itemsToInsert)
            .select()
          
          if (itemsError) {
            console.error('❌ [NFe] Erro ao inserir itens:', itemsError)
            // Não falha a operação, apenas loga o erro
          } else {
            console.log('✅ [NFe] Itens inseridos com sucesso:', insertedItems?.length || 0)
          }
        } else {
          console.log('⚠️ [NFe] Nenhum item encontrado na NF-e')
        }
        
        // Converter para formato da interface
        const convertedNfe: NfeImport = {
          id: nfeImport.id,
          filename: file.name,
          status: 'PENDING',
          total_products: nfeData.itens?.length || 0,
          processed_products: 0,
          errors: [],
          warnings: [],
          created_at: nfeImport.created_at,
          updated_at: nfeImport.created_at,
          chave_acesso: nfeData.chaveAcesso,
          hash: nfeHash,
          file_name: file.name,
          raw_xml: fileContent,
          provider: nfeData.emitente?.nome || 'Fornecedor desconhecido'
        }
        
        console.log('✅ [NFe] NF-e importada com sucesso:', convertedNfe.id)
        return convertedNfe
        
      } catch (error: any) {
        console.error('❌ [NFe] Erro no upload:', error)
        
        // Se o erro já é estruturado (do nosso código), apenas re-throw
        if (error && typeof error === 'object' && error.type) {
          throw error
        }
        
        // Estruturar erro genérico para o modal
        const structuredError = {
          type: 'processing' as const,
          title: 'Erro ao importar NF-e',
          message: error.message || 'Ocorreu um erro inesperado ao processar o arquivo XML.',
          details: {
            fileName: file.name
          },
          suggestions: [
            'Verifique se o arquivo XML está válido e não corrompido',
            'Confirme se o arquivo é uma NF-e válida',
            'Tente importar novamente ou entre em contato com o suporte'
          ]
        }
        
        throw structuredError
      }
    },
    onSuccess: () => {
      // Invalidar cache e recarregar dados
      queryClient.invalidateQueries({ queryKey: ['nfe-imports-supabase'] })
      toast({
        title: "NF-e importada com sucesso!",
        description: "A nota fiscal foi processada e está disponível para reconciliação.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar NF-e",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  })

  // Aplicar NF-e ao estoque
  const applyNfeToStockMutation = useMutation({
    mutationFn: async ({ nfeId, reconciliationItems }: { nfeId: string, reconciliationItems?: any[] }) => {
      try {
        console.log('📦 [NFe] Aplicando NF-e ao estoque:', nfeId)
        console.log('📋 [NFe] Itens de reconciliação:', reconciliationItems)
        
        if (!reconciliationItems || reconciliationItems.length === 0) {
          throw new Error('Nenhum item de reconciliação fornecido')
        }
        
        // Processar cada item de reconciliação
        for (const reconciliationItem of reconciliationItems) {
          if (!reconciliationItem.isReconciled) {
            console.log('⚠️ [NFe] Item não reconciliado, pulando:', reconciliationItem.nfeItem?.descricao)
            continue
          }
          
          const nfeItem = reconciliationItem.nfeItem
          const selectedProduct = reconciliationItem.selectedProduct
          
          if (!nfeItem || !selectedProduct) {
            console.log('⚠️ [NFe] Item ou produto não encontrado, pulando')
            continue
          }
          
          console.log('🔄 [NFe] Processando item:', {
            produto: selectedProduct.name,
            quantidade: nfeItem.quantidade || nfeItem.qty,
            product_id: selectedProduct.id
          })
          
          // Atualizar estoque do produto
          const quantity = nfeItem.quantidade || nfeItem.qty || 0
          if (quantity > 0) {
            const { error: stockError } = await supabaseAdmin.rpc('increment_product_stock', {
              product_id: selectedProduct.id,
              quantity: quantity
            })
            
            if (stockError) {
              console.error('❌ [NFe] Erro ao atualizar estoque:', stockError)
              throw new Error(`Erro ao atualizar estoque do produto ${selectedProduct.name}: ${stockError.message}`)
            }
            
            console.log('✅ [NFe] Estoque atualizado:', selectedProduct.name, '+', quantity)
          }
          
          // Atualizar o item da NF-e com o product_id
          const { error: updateItemError } = await supabaseAdmin
            .from('nfe_items')
            .update({ product_id: selectedProduct.id })
            .eq('id', nfeItem.id)
          
          if (updateItemError) {
            console.error('❌ [NFe] Erro ao atualizar item da NF-e:', updateItemError)
          }
        }
        
        // Marcar NF-e como importada (atualizar status)
        const { error: statusError } = await supabaseAdmin
          .from('nfe_imports')
          .update({ status: 'IMPORTED' })
          .eq('id', nfeId)
        
        if (statusError) {
          console.error('❌ [NFe] Erro ao atualizar status da NF-e:', statusError)
        }
        
        console.log('✅ [NFe] NF-e aplicada ao estoque com sucesso')
        
        // Forçar invalidação imediata do cache
        queryClient.invalidateQueries({ queryKey: ['nfe-imports-supabase'] })
        
        return { success: true }
        
      } catch (error) {
        console.error('❌ [NFe] Erro ao aplicar NF-e ao estoque:', error)
        throw error
      }
    },
    onSuccess: async () => {
      // Invalidar cache e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ['nfe-imports-supabase'] })
      await queryClient.refetchQueries({ queryKey: ['nfe-imports-supabase'] })
      
      toast({
        title: "NF-e aplicada ao estoque!",
        description: "Os produtos foram adicionados ao estoque com sucesso.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aplicar NF-e",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  })

  // Deletar NF-e
  const deleteNfeMutation = useMutation({
    mutationFn: async (nfeId: string) => {
      try {
        console.log('🗑️ [NFe] Deletando NF-e:', nfeId)
        
        // Deletar itens primeiro (devido à foreign key)
        const { error: itemsError } = await supabaseAdmin
          .from('nfe_items')
          .delete()
          .eq('nfe_import_id', nfeId)
        
        if (itemsError) {
          throw itemsError
        }
        
        // Deletar NF-e
        const { error: nfeError } = await supabaseAdmin
          .from('nfe_imports')
          .delete()
          .eq('id', nfeId)
        
        if (nfeError) {
          throw nfeError
        }
        
        console.log('✅ [NFe] NF-e deletada com sucesso')
        
      } catch (error) {
        console.error('❌ [NFe] Erro ao deletar NF-e:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports-supabase'] })
      toast({
        title: "NF-e deletada!",
        description: "A nota fiscal foi removida com sucesso.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar NF-e",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  })

  // Deletar múltiplas NF-es
  const deleteMultipleNfesMutation = useMutation({
    mutationFn: async (nfeIds: string[]) => {
      try {
        console.log('🗑️ [NFe] Deletando múltiplas NF-es:', nfeIds.length)
        
        // Deletar itens primeiro
        const { error: itemsError } = await supabaseAdmin
          .from('nfe_items')
          .delete()
          .in('nfe_import_id', nfeIds)
        
        if (itemsError) {
          throw itemsError
        }
        
        // Deletar NF-es
        const { error: nfeError } = await supabaseAdmin
          .from('nfe_imports')
          .delete()
          .in('id', nfeIds)
        
        if (nfeError) {
          throw nfeError
        }
        
        console.log('✅ [NFe] NF-es deletadas com sucesso')
        
      } catch (error) {
        console.error('❌ [NFe] Erro ao deletar NF-es:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports-supabase'] })
      toast({
        title: "NF-es deletadas!",
        description: "As notas fiscais foram removidas com sucesso.",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar NF-es",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  })

  // Funções de conveniência
  const importXml = useCallback(async (file: File) => {
    return uploadNfeMutation.mutateAsync(file)
  }, [uploadNfeMutation])

  const applyNfeToStock = useCallback(async (nfeId: string, reconciliationItems?: any[]) => {
    return applyNfeToStockMutation.mutateAsync({ nfeId, reconciliationItems })
  }, [applyNfeToStockMutation])

  const deleteNfe = useCallback(async (nfeId: string) => {
    return deleteNfeMutation.mutateAsync(nfeId)
  }, [deleteNfeMutation])

  const deleteMultipleNfes = useCallback(async (nfeIds: string[]) => {
    return deleteMultipleNfesMutation.mutateAsync(nfeIds)
  }, [deleteMultipleNfesMutation])

  const loadNfeImports = useCallback(async () => {
    return refetch()
  }, [refetch])

  // Export CSV (placeholder - implementar se necessário)
  const exportCsv = useCallback(async () => {
    console.log('📊 [NFe] Export CSV não implementado ainda')
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exportação CSV será implementada em breve.",
    })
  }, [toast])

  const exportSelectedNfes = useCallback(async (selectedIds: string[]) => {
    console.log('📊 [NFe] Export selecionado não implementado ainda')
    toast({
      title: "Funcionalidade em desenvolvimento", 
      description: "A exportação de NF-es selecionadas será implementada em breve.",
    })
  }, [toast])


  return {
    nfeImports,
    isLoading: isLoading || uploadNfeMutation.isPending || applyNfeToStockMutation.isPending || deleteNfeMutation.isPending || deleteMultipleNfesMutation.isPending,
    importXml,
    applyNfeToStock,
    exportCsv,
    exportSelectedNfes,
    deleteNfe,
    deleteMultipleNfes,
    loadNfeImports,
    refetch
  }
}
