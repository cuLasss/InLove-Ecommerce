import { useState, useEffect } from 'react'
// Sistema local - não precisa de Supabase
import { useToast } from '@/hooks/use-toast'
import { universalDataAdapter } from '@/lib/universal-data-adapter'

export interface Brand {
  id: string
  name: string
  created_at?: string
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const loadBrands = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await universalDataAdapter.getBrands();
      
      if (error) {
        console.error('Erro ao carregar marcas:', error)
        toast({
          title: "Erro",
          description: "Erro ao carregar marcas",
          variant: "destructive"
        })
        return
      }

      setBrands(data || [])
    } catch (error) {
      console.error('Erro geral ao carregar marcas:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar marcas",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createBrand = async (name: string): Promise<Brand> => {
    try {
      setIsLoading(true)
      const { data, error } = await universalDataAdapter.createBrand(name);
      
      if (error) {
        console.error('Erro ao criar marca:', error)
        toast({
          title: "Erro",
          description: "Erro ao criar marca",
          variant: "destructive"
        })
        throw error
      }

      if (data) {
        setBrands(prev => [...prev, data])
        toast({
          title: "Sucesso",
          description: "Marca criada com sucesso!",
        })
        return data
      }
      
      throw new Error('Falha ao criar marca')
    } catch (error) {
      console.error('Erro geral ao criar marca:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar marca",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateBrand = async (id: string, name: string): Promise<Brand> => {
    try {
      setIsLoading(true)
      const { data, error } = await universalDataAdapter.updateBrand(id, name);
      
      if (error) {
        console.error('Erro ao atualizar marca:', error)
        toast({
          title: "Erro",
          description: "Erro ao atualizar marca",
          variant: "destructive"
        })
        throw error
      }

      if (data) {
        setBrands(prev => prev.map(brand => 
          brand.id === id ? { ...brand, name } : brand
        ))
        toast({
          title: "Sucesso",
          description: "Marca atualizada com sucesso!",
        })
        return data
      }
      
      throw new Error('Falha ao atualizar marca')
    } catch (error) {
      console.error('Erro geral ao atualizar marca:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar marca",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const deleteBrand = async (id: string) => {
    try {
      setIsLoading(true)
      const { error } = await universalDataAdapter.deleteBrand(id);
      
      if (error) {
        console.error('Erro ao deletar marca:', error)
        toast({
          title: "Erro",
          description: "Erro ao deletar marca",
          variant: "destructive"
        })
        return
      }

      setBrands(prev => prev.filter(brand => brand.id !== id))
      toast({
        title: "Sucesso",
        description: "Marca removida com sucesso!",
      })
    } catch (error) {
      console.error('Erro geral ao deletar marca:', error)
      toast({
        title: "Erro",
        description: "Erro ao deletar marca",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBrands()
  }, [])

  return {
    brands,
    isLoading,
    loadBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    refetch: loadBrands
  }
}