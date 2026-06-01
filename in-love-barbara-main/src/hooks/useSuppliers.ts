import { useState, useEffect, useCallback, useRef } from 'react'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'
import { universalDataAdapter } from '@/lib/universal-data-adapter'

export interface Supplier {
  id: string
  name: string
  whatsapp?: number
  created_at?: string
  updated_at?: string
}

export interface SupplierInput {
  name: string
  whatsapp?: string
}

export function useSuppliers(initialSearchTerm?: string) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '')
  const { toast } = useToast()
  
  // Refs para controle do real-time
  const channelRef = useRef<any>(null)
  const mountedRef = useRef(true)

  const normalizePhone = (phone?: string): number | null => {
    if (!phone) return null
    const digits = phone.replace(/\D/g, '')
    return digits.length > 0 ? parseInt(digits) : null
  }

  const sortSuppliers = (suppliers: Supplier[]) => 
    suppliers.sort((a, b) => a.name.localeCompare(b.name))

  const loadSuppliers = useCallback(async () => {
    if (!mountedRef.current) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Carregar fornecedores usando universalDataAdapter
      const { data, error } = await universalDataAdapter.getSuppliers();
      
      if (error) {
        console.error('Erro ao carregar fornecedores:', error)
        setError('Erro ao carregar fornecedores')
        return
      }

      let filteredSuppliers = data || [];

      if (searchTerm?.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        const isNumericSearch = /^\d+$/.test(searchTerm.trim());
        
        filteredSuppliers = filteredSuppliers.filter((supplier: Supplier) => {
          if (isNumericSearch) {
            return supplier.name.toLowerCase().includes(searchLower) || 
                   (supplier.whatsapp && supplier.whatsapp.toString().includes(searchTerm.trim()));
          } else {
            return supplier.name.toLowerCase().includes(searchLower);
          }
        });
      }

      if (mountedRef.current) {
        setSuppliers(sortSuppliers(filteredSuppliers || []))
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
      if (mountedRef.current) {
        const message = error instanceof Error ? error.message : "Erro ao carregar fornecedores"
        setError(message)
        toast({
          title: "Erro",
          description: message,
          variant: "destructive"
        })
        setSuppliers([])
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [searchTerm, toast])

  const createSupplier = async (supplierData: SupplierInput): Promise<Supplier> => {
    try {
      console.log('🔄 Criando fornecedor:', supplierData.name)
      
      // Usar universalDataAdapter para criar fornecedor
      const { data, error } = await universalDataAdapter.createSupplier({
        name: supplierData.name.trim(),
        whatsapp: supplierData.whatsapp
      });
      
      if (error) {
        console.error('❌ Erro ao criar fornecedor:', error)
        toast({
          title: "Erro",
          description: "Erro ao criar fornecedor",
          variant: "destructive"
        })
        throw error
      }

      if (data) {
        // Forçar refresh dos dados para garantir sincronização
        console.log('🔄 Forçando refresh dos fornecedores após criação...')
        await loadSuppliers()
        
        console.log('✅ Fornecedor criado com sucesso:', data.name)
        toast({
          title: "Sucesso",
          description: "Fornecedor criado com sucesso!",
        })
        
        return data
      }
      
      throw new Error('Falha ao criar fornecedor')
    } catch (error) {
      console.error('❌ Erro ao criar fornecedor:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar fornecedor",
        variant: "destructive"
      })
      throw error
    }
  }

  const updateSupplier = async (id: string, supplierData: SupplierInput): Promise<Supplier> => {
    try {
      console.log('🔄 Atualizando fornecedor:', id)
      const { data, error } = await universalDataAdapter.updateSupplier(id, {
        name: supplierData.name.trim(),
        whatsapp: supplierData.whatsapp
      });
      
      if (error) {
        console.error('Erro ao atualizar fornecedor:', error)
        toast({
          title: "Erro",
          description: "Erro ao atualizar fornecedor",
          variant: "destructive"
        })
        throw error
      }

      if (data) {
        // Forçar refresh dos dados para garantir sincronização
        console.log('🔄 Forçando refresh dos fornecedores após edição...')
        await loadSuppliers()
        
        console.log('✅ Fornecedor atualizado com sucesso:', data.name)
        toast({
          title: "Sucesso",
          description: "Fornecedor atualizado com sucesso!",
        })
        return data
      }
      
      throw new Error('Falha ao atualizar fornecedor')
    } catch (error) {
      console.error('❌ Erro ao atualizar fornecedor:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar fornecedor",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteSupplier = async (id: string): Promise<void> => {
    try {
      console.log('🔄 Removendo fornecedor:', id)
      const { error } = await universalDataAdapter.deleteSupplier(id);
      
      if (error) {
        console.error('Erro ao deletar fornecedor:', error)
        toast({
          title: "Erro",
          description: "Erro ao deletar fornecedor",
          variant: "destructive"
        })
        return
      }

      // Forçar refresh dos dados para garantir sincronização
      console.log('🔄 Forçando refresh dos fornecedores após exclusão...')
      await loadSuppliers()
      
      console.log('✅ Fornecedor removido com sucesso')
      toast({
        title: "Sucesso",
        description: "Fornecedor removido com sucesso!",
      })
    } catch (error) {
      console.error('❌ Erro ao deletar fornecedor:', error)
      toast({
        title: "Erro",
        description: "Erro ao deletar fornecedor",
        variant: "destructive"
      })
      throw error
    }
  }

  // Carregar fornecedores quando o componente for montado ou searchTerm mudar
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Cleanup quando o componente for desmontado
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    suppliers,
    isLoading,
    searchTerm,
    setSearchTerm,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refreshSuppliers: loadSuppliers,
    refetch: loadSuppliers
  }
}
