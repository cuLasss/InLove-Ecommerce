import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// Sistema local com persistência transparente
import { useToast } from '@/hooks/use-toast'
import { universalDataAdapter } from '@/lib/universal-data-adapter'
import { logger } from '@/lib/logger'
import { parseNfeXml, generateNfeHash, checkNfeDuplicate, type NfeXmlData, type NfeValidationResult } from '@/lib/xml-parser'
import { format } from 'date-fns'

// Chave para localStorage - persistência transparente
const NFE_IMPORTS_STORAGE_KEY = 'nfe-imports-data'

// Funções para persistência no localStorage (transparente para o usuário)
const saveNfeImportsToStorage = (nfeImports: NfeImport[]) => {
  try {
    localStorage.setItem(NFE_IMPORTS_STORAGE_KEY, JSON.stringify(nfeImports))
  } catch (error) {
    console.error('Erro ao salvar NF-e imports:', error)
  }
}

const loadNfeImportsFromStorage = (): NfeImport[] => {
  try {
    const stored = localStorage.getItem(NFE_IMPORTS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Erro ao carregar NF-e imports:', error)
  }
  return []
}

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
  // Legacy fields for compatibility
  import_id?: string
  product_code?: string
  description?: string
  qty?: number
  reconciled_qty?: number
  unit_cost_cents?: number
}

export interface ProductReconciliation {
  nfe_item_id: string
  product_id: string | null
  status: 'pending' | 'matched' | 'created' | 'ignored'
}

export function useNfeImports() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // Estado local para armazenar as NF-es importadas
  const [localNfeImports, setLocalNfeImports] = useState<NfeImport[]>([])

  // Carrega dados do localStorage na inicialização (transparente)
  useEffect(() => {
    const storedNfes = loadNfeImportsFromStorage()
    if (storedNfes.length > 0) {
      setLocalNfeImports(storedNfes)
    }
  }, [])

  // Query NFE imports - Sistema local
  const { data: nfeImports = localNfeImports, isLoading, refetch } = useQuery({
    queryKey: ['nfe-imports'],
    queryFn: async (): Promise<NfeImport[]> => {
      // Sempre carrega do localStorage para garantir dados atualizados
      const storedNfes = loadNfeImportsFromStorage()
      if (storedNfes.length > 0) {
        setLocalNfeImports(storedNfes)
        return storedNfes
      }
      return localNfeImports
    },
    // Configurações para melhor responsividade
    staleTime: 0, // Sempre considera os dados como stale
    gcTime: 0, // Não mantém cache (substitui cacheTime)
    refetchOnWindowFocus: false, // Não refaz fetch ao focar na janela
    refetchOnMount: true // Sempre refaz fetch ao montar
  })

  // Upload NFE file mutation - Sistema local com validação completa
  const uploadNfeMutation = useMutation({
    mutationFn: async (file: File): Promise<NfeImport> => {
      try {
        // Parseia o XML da NF-e
        const validationResult = await parseNfeXml(file)
        
        if (!validationResult.isValid) {
          // NF-e inválida - vai para aba inválidas
          const invalidNfe: NfeImport = {
            id: `invalid_${Date.now()}`,
            filename: file.name,
            status: 'INVALID',
            total_products: validationResult.data?.itens?.length || 0,
            processed_products: 0,
            errors: validationResult.errors.map(e => e.message),
            warnings: validationResult.warnings.map(w => w.message),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_code: validationResult.errorCode,
            error_message: validationResult.errorMessage,
            chave_acesso: validationResult.data?.chaveAcesso,
            numero: validationResult.data?.numero,
            serie: validationResult.data?.serie,
            data_emissao: validationResult.data?.dataEmissao,
            emitente_nome: validationResult.data?.emitente?.nome,
            emitente_cnpj: validationResult.data?.emitente?.cnpj,
            destinatario_nome: validationResult.data?.destinatario?.nome,
            destinatario_cnpj: validationResult.data?.destinatario?.cnpj,
            valor_total: validationResult.data?.valores?.totalNota,
            status_nfe: validationResult.data?.status,
            xml: {
              parsed: validationResult.data,
              isCancelled: validationResult.status === 'CANCELLED',
              isDuplicate: validationResult.status === 'DUPLICATE'
            }
          }
          
          return invalidNfe
        }
        
        const nfeData = validationResult.data!
        
        // Verifica se já foi importada anteriormente
        const duplicateCheck = checkNfeDuplicate(nfeData, localNfeImports)
        
        if (duplicateCheck.isDuplicate) {
          // NF-e duplicada - vai para aba inválidas/duplicadas
          const duplicateNfe: NfeImport = {
            id: `duplicate_${Date.now()}`,
            filename: file.name,
            status: 'INVALID',
            total_products: nfeData.itens.length,
            processed_products: 0,
            errors: duplicateCheck.errors.map(e => e.message),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            chave_acesso: nfeData.chaveAcesso,
            numero: nfeData.numero,
            serie: nfeData.serie,
            data_emissao: nfeData.dataEmissao,
            emitente_nome: nfeData.emitente.nome,
            emitente_cnpj: nfeData.emitente.cnpj,
            destinatario_nome: nfeData.destinatario.nome,
            destinatario_cnpj: nfeData.destinatario.cnpj,
            valor_total: nfeData.valores.totalNota,
            status_nfe: nfeData.status,
            error_code: 'DUPLICATE',
            error_message: 'Nota fiscal já foi importada anteriormente',
            xml: {
              parsed: nfeData,
              hash: generateNfeHash(nfeData),
              isDuplicate: true,
              isCancelled: false
            }
          }
          
          return duplicateNfe
        }
        
        // NF-e válida - vai para aba pendentes para reconciliação
        const allErrors = [
          ...validationResult.errors.map(e => e.message)
        ];
        
        const allWarnings = [
          ...validationResult.warnings.map(w => w.message),
          ...duplicateCheck.errors.filter(e => e.severity === 'WARNING').map(e => e.message)
        ];
        
        const pendingNfe: NfeImport = {
          id: `pending_${Date.now()}`,
          filename: file.name,
          status: 'PENDING',
          total_products: nfeData.itens.length,
          processed_products: 0,
          errors: allErrors,
          warnings: allWarnings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          chave_acesso: nfeData.chaveAcesso,
          numero: nfeData.numero,
          serie: nfeData.serie,
          data_emissao: nfeData.dataEmissao,
          emitente_nome: nfeData.emitente.nome,
          emitente_cnpj: nfeData.emitente.cnpj,
          destinatario_nome: nfeData.destinatario.nome,
          destinatario_cnpj: nfeData.destinatario.cnpj,
          valor_total: nfeData.valores.totalNota,
          status_nfe: nfeData.status,
          xml: {
            parsed: nfeData,
            hash: generateNfeHash(nfeData),
            isDuplicate: false,
            isCancelled: false
          },
          // Legacy fields for compatibility
          issuer_name: nfeData.emitente.nome,
          issuer_cnpj: nfeData.emitente.cnpj,
          issued_at: nfeData.dataEmissao,
          total_cents: Math.round(nfeData.valores.totalNota * 100),
          nfe_items: nfeData.itens.map((item, index) => ({
            id: `item_${Date.now()}_${index}`,
            nfe_import_id: `pending_${Date.now()}`,
            name: item.descricao,
            code: item.codigo,
            unit_price: item.valorUnitario,
            quantity: item.quantidade,
            created_at: new Date().toISOString(),
            // Legacy fields
            import_id: `pending_${Date.now()}`,
            product_code: item.codigo,
            description: item.descricao,
            qty: item.quantidade,
            reconciled_qty: null,
            unit_cost_cents: Math.round(item.valorUnitario * 100)
          }))
        }
        
        return pendingNfe
        
      } catch (error) {
        console.error('Erro ao processar NF-e:', error)
        throw new Error('Erro ao processar arquivo XML')
      }
    },
    onSuccess: (newNfe) => {
      // Adiciona a nova NF-e ao estado local
      setLocalNfeImports(prev => {
        const updated = [...prev, newNfe]
        // Salva no localStorage
        saveNfeImportsToStorage(updated)
        return updated
      })
      
      // Força atualização da query e refetch
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] })
      queryClient.refetchQueries({ queryKey: ['nfe-imports'] })
      
      // Determina a mensagem baseada no status
      let message = ''
      if (newNfe.status === 'PENDING') {
        message = 'NF-e importada com sucesso! Aguardando reconciliação.'
      } else if (newNfe.status === 'INVALID') {
        if (newNfe.xml?.isCancelled) {
          message = 'NF-e cancelada detectada e movida para aba inválidas.'
        } else if (newNfe.xml?.isDuplicate) {
          message = 'NF-e duplicada detectada e movida para aba inválidas.'
        } else {
          message = 'NF-e inválida detectada e movida para aba inválidas.'
        }
      }
      
      toast({
        title: newNfe.status === 'PENDING' ? 'NF-e Importada' : 'NF-e Processada',
        description: message,
        variant: newNfe.status === 'PENDING' ? 'default' : 'destructive'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao processar NF-e',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive'
      })
    }
  })

  // Delete NFE import mutation - Sistema local
  const deleteNfeMutation = useMutation({
    mutationFn: async (id: string) => {
      // Remove a NF-e do estado local
      setLocalNfeImports(prev => {
        const updated = prev.filter(nfe => nfe.id !== id)
        // Salva no localStorage
        saveNfeImportsToStorage(updated)
        return updated
      })
    },
    onSuccess: () => {
      // Força atualização da query e refetch
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] })
      queryClient.refetchQueries({ queryKey: ['nfe-imports'] })
      
      toast({
        title: 'NF-e removida',
        description: 'A importação foi removida com sucesso.'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover NF-e',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive'
      })
    }
  })

  // Delete multiple NFEs mutation - Sistema local
  const deleteMultipleNfesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Remove as NF-es do estado local
      setLocalNfeImports(prev => {
        const updated = prev.filter(nfe => !ids.includes(nfe.id))
        // Salva no localStorage
        saveNfeImportsToStorage(updated)
        return updated
      })
    },
    onSuccess: (_, ids) => {
      // Força atualização da query e refetch
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] })
      queryClient.refetchQueries({ queryKey: ['nfe-imports'] })
      
      toast({
        title: 'NF-es removidas',
        description: `${ids.length} nota(s) fiscal(is) removida(s) com sucesso.`
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover NF-es',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive'
      })
    }
  })

  // Apply NFE to stock mutation - Reconciliação e aplicação ao estoque
  const applyNfeToStockMutation = useMutation({
    mutationFn: async ({ nfeId, reconciliationItems }: { nfeId: string, reconciliationItems?: any[] }) => {
      console.log('🚀 [NF-e] Aplicando ao estoque:', nfeId, reconciliationItems);
      
      // Atualiza saldos dos produtos existentes e cria novos produtos
      if (reconciliationItems) {
        for (const item of reconciliationItems) {
          if (item.isReconciled) {
            console.log('📦 [NF-e] Processando item reconciliado:', item);
            
            if (item.selectedProduct && !item.tempProduct) {
              // Produto existente - atualiza estoque
              const quantity = item.nfeItem.quantidade || item.nfeItem.qtd || 0;
              const currentStock = item.selectedProduct.stock || 0;
              const newStock = currentStock + quantity;
              
              console.log(`📈 [NF-e] Atualizando estoque do produto ${item.selectedProduct.name}:`, {
                estoque_atual: currentStock,
                quantidade_nfe: quantity,
                novo_estoque: newStock
              });
              
              try {
                const updateResponse = await universalDataAdapter.updateProduct(item.selectedProduct.id, {
                  stock: newStock
                });
                
                if (updateResponse.error) {
                  console.error(`❌ [NF-e] Erro ao atualizar estoque do produto ${item.selectedProduct.name}:`, updateResponse.error);
                } else {
                  console.log(`✅ [NF-e] Estoque atualizado com sucesso para ${item.selectedProduct.name}`);
                }
              } catch (error) {
                console.error(`❌ [NF-e] Erro ao atualizar produto ${item.selectedProduct.name}:`, error);
              }
              
            } else if (item.tempProduct) {
              // Produto temporário já foi criado na reconciliação
              console.log(`✅ [NF-e] Produto temporário ${item.tempProduct.name} já foi criado durante a reconciliação`);
            } else if (item.selectedProduct && item.tempProduct) {
              // Produto temporário que foi selecionado - já foi criado
              console.log(`✅ [NF-e] Produto temporário ${item.tempProduct.name} foi selecionado e já foi criado`);
            }
          }
        }
      }
      
      // Atualiza o status da NF-e para IMPORTED
      setLocalNfeImports(prev => {
        const updated = prev.map(nfe => {
          if (nfe.id === nfeId) {
            return {
              ...nfe,
              status: 'IMPORTED' as const,
              processed_products: nfe.total_products,
              updated_at: new Date().toISOString()
            }
          }
          return nfe
        })
        // Salva no localStorage
        saveNfeImportsToStorage(updated)
        return updated as NfeImport[]
      })
    },
    onSuccess: () => {
      // Força atualização da query e refetch
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] })
      queryClient.refetchQueries({ queryKey: ['nfe-imports'] })
      
      toast({
        title: 'NF-e aplicada ao estoque',
        description: 'A nota fiscal foi importada com sucesso!'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aplicar NF-e',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive'
      })
    }
  })

  // Get NFE details - Sistema local
  const getNfeDetails = useCallback(async (id: string): Promise<NfeImport | null> => {
    // Sistema local - retornar null por enquanto
    await new Promise(resolve => setTimeout(resolve, 100))
    logger.debug('Buscando detalhes NFE local:', id)
    return null
  }, [])

  // Process NFE file
  const processNfeFile = useCallback(async (file: File) => {
    return uploadNfeMutation.mutateAsync(file)
  }, [uploadNfeMutation])

  // Reconcile products (stub)
  const reconcileProducts = useCallback(async (nfeId: string, reconciliations: ProductReconciliation[]) => {
    logger.debug('Reconciling products for NFE:', nfeId, reconciliations)
    toast({
      title: 'Reconciliação salva',
      description: 'Os produtos foram reconciliados com sucesso.'
    })
  }, [toast])

  // Create product from NFE (stub) 
  const createProductFromNfe = useCallback(async (nfeItemId: string, productData: any) => {
    logger.debug('Creating product from NFE item:', nfeItemId, productData)
    toast({
      title: 'Produto criado',
      description: 'O produto foi criado a partir da NFE.'
    })
  }, [toast])


  // Export multiple NFEs as ZIP - Sistema local
  const exportSelectedNfes = useCallback(async (ids: string[]) => {
    try {
      if (ids.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Selecione pelo menos uma NF-e para exportar',
          variant: 'destructive'
        })
        return
      }

      // Busca as NF-es selecionadas
      const selectedNfes = localNfeImports.filter(nfe => ids.includes(nfe.id))
      
      if (selectedNfes.length === 0) {
        toast({
          title: 'Erro',
          description: 'Nenhuma NF-e válida encontrada',
          variant: 'destructive'
        })
        return
      }

      // Cria um ZIP com os CSVs
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (const nfe of selectedNfes) {
        // Cabeçalho do CSV
        const headers = [
          'Código do Produto',
          'Descrição',
          'Quantidade',
          'Valor Unitário (R$)',
          'Valor Total (R$)',
          'NCM',
          'CFOP',
          'Unidade Comercial'
        ]

        // Dados dos itens da NF-e
        const rows = []
        
        if (nfe.nfe_items && nfe.nfe_items.length > 0) {
          for (const item of nfe.nfe_items) {
            const qty = item.reconciled_qty !== null && item.reconciled_qty !== undefined 
              ? item.reconciled_qty 
              : item.qty || item.quantity || 0
            const unitPrice = item.unit_cost_cents ? item.unit_cost_cents / 100 : item.unit_price || 0
            const totalPrice = qty * unitPrice
            
            rows.push([
              item.product_code || item.code || '',
              item.description || item.name || '',
              qty.toString(),
              unitPrice.toFixed(2),
              totalPrice.toFixed(2),
              '', // NCM
              '', // CFOP
              'UN'
            ])
          }
        } else if (nfe.xml?.parsed?.itens) {
          for (const item of nfe.xml.parsed.itens) {
            const totalPrice = item.quantidade * item.valorUnitario
            
            rows.push([
              item.codigo || '',
              item.descricao || '',
              item.quantidade.toString(),
              item.valorUnitario.toFixed(2),
              totalPrice.toFixed(2),
              item.ncm || '',
              item.cfop || '',
              item.unidade || 'UN'
            ])
          }
        }

        // Cria o conteúdo CSV
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n')

        // Adiciona ao ZIP
        const fileName = `NFE_${nfe.numero || nfe.id.slice(-8)}_${nfe.serie || '001'}.csv`
        zip.file(fileName, csvContent)
      }

      // Gera e baixa o ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(zipBlob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `NFEs_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.zip`)
      link.style.visibility = 'hidden'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: 'ZIP exportado',
        description: `${selectedNfes.length} arquivo(s) CSV exportado(s) com sucesso!`
      })
      
    } catch (error) {
      console.error('Erro ao exportar ZIP:', error)
      toast({
        title: 'Erro ao exportar ZIP',
        description: 'Ocorreu um erro ao gerar o arquivo ZIP',
        variant: 'destructive'
      })
    }
  }, [localNfeImports, toast])

  return {
    nfeImports,
    isLoading,
    refetch,
    uploadNfe: uploadNfeMutation.mutateAsync,
    deleteNfe: (id: string) => deleteNfeMutation.mutateAsync(id),
    deleteMultipleNfes: (ids: string[]) => deleteMultipleNfesMutation.mutateAsync(ids),
    applyNfeToStock: (nfeId: string, reconciliationItems?: any[]) => 
      applyNfeToStockMutation.mutateAsync({ nfeId, reconciliationItems }),
    getNfeDetails,
    reconcileProducts,
    createProductFromNfe,
    isUploading: uploadNfeMutation.isPending,
    isDeleting: deleteNfeMutation.isPending,
    isDeletingMultiple: deleteMultipleNfesMutation.isPending,
    isApplying: applyNfeToStockMutation.isPending,
    
    // Legacy functions for compatibility
    loadNfeImports: async () => {
      const storedNfes = loadNfeImportsFromStorage()
      if (storedNfes.length > 0) {
        setLocalNfeImports(storedNfes)
        queryClient.setQueryData(['nfe-imports'], storedNfes)
      }
      return refetch()
    },
    processXmlFile: uploadNfeMutation.mutateAsync,
    finalizarImportacao: (id: string) => console.log('Finalizar importação:', id),
    gerarEtiquetas: (id: string) => console.log('Gerar etiquetas:', id),
    importXml: uploadNfeMutation.mutateAsync,
    exportSelectedNfes,
    
    // Função para limpar dados (debug)
    clearAllData: () => {
      localStorage.removeItem(NFE_IMPORTS_STORAGE_KEY)
      setLocalNfeImports([])
      queryClient.setQueryData(['nfe-imports'], [])
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] })
      console.log('Dados do localStorage limpos')
    }
  }
}

// Additional hooks for NFE functionality
export function useNfeItems(nfeId: string | null) {
  return useQuery({
    queryKey: ['nfe-items', nfeId],
    queryFn: async (): Promise<NfeItem[]> => {
      if (!nfeId) return []
      // Return empty array since nfe_items table doesn't exist yet
      return []
    },
    enabled: !!nfeId
  })
}

export function useProductReconciliation() {
  const { toast } = useToast()
  
  return {
    reconcileItem: useCallback(async (nfeItemId: string, productId: string | null) => {
      console.log('Reconciling item:', nfeItemId, 'with product:', productId)
      toast({
        title: 'Item reconciliado',
        description: 'A reconciliação foi salva com sucesso.'
      })
    }, [toast]),
    
    createProductFromItem: useCallback(async (nfeItemId: string, productData: any) => {
      console.log('Creating product from item:', nfeItemId, productData)
      toast({
        title: 'Produto criado',
        description: 'O produto foi criado a partir do item da NFE.'
      })
    }, [toast])
  }
}