import { useState, useEffect } from 'react'
import { universalDataAdapter } from '@/lib/universal-data-adapter'
import { useToast } from '@/hooks/use-toast'

export interface User {
  id: string
  name: string
  role: string
  whatsapp?: string
  email?: string
  created_at?: string
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      // ✅ CORREÇÃO: Usar universalDataAdapter para carregar da tabela collaborators
      // que é a tabela correta para colaboradores (não usuários do sistema)
      const response = await universalDataAdapter.getCollaborators();
      
      if (response.error) {
        console.error('Erro ao buscar colaboradores:', response.error);
        toast({
          title: "Erro",
          description: "Erro ao carregar colaboradores",
          variant: "destructive"
        });
        return;
      }
      
      const collaborators = response.data || [];
      console.log('🔍 [useUsers] Colaboradores carregados da tabela collaborators:', collaborators);
      
      // Converter para formato User
      const users = collaborators.map(collaborator => ({
        id: collaborator.id,
        name: collaborator.name,
        role: collaborator.role || 'COLAB',
        whatsapp: collaborator.whatsapp,
        email: undefined, // Colaboradores não têm email
        created_at: collaborator.created_at
      }));
      
      setUsers(users);
      
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar colaboradores",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (userData: Omit<User, 'id' | 'created_at'>) => {
    try {
      setIsLoading(true);
      
      // Usar universalDataAdapter para criar na tabela collaborators
      const response = await universalDataAdapter.createCollaborator({
        name: userData.name,
        role: userData.role || 'COLAB',
        whatsapp: userData.whatsapp
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      // Recarregar lista de usuários
      await loadUsers();
      
      toast({
        title: "Sucesso",
        description: "Colaborador criado com sucesso"
      });
      
      return response.data;
      
    } catch (error) {
      console.error('Erro ao criar colaborador:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar colaborador",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      setIsLoading(true);
      
      // Usar universalDataAdapter para atualizar na tabela collaborators
      const response = await universalDataAdapter.updateCollaborator(id, {
        name: userData.name,
        role: userData.role,
        whatsapp: userData.whatsapp
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      // Recarregar lista de usuários
      await loadUsers();
      
      toast({
        title: "Sucesso",
        description: "Colaborador atualizado com sucesso"
      });
      
    } catch (error) {
      console.error('Erro ao atualizar colaborador:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar colaborador",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Usar universalDataAdapter para deletar da tabela collaborators
      const response = await universalDataAdapter.deleteCollaborator(id);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      // Recarregar lista de usuários
      await loadUsers();
      
      toast({
        title: "Sucesso",
        description: "Colaborador excluído com sucesso"
      });
      
    } catch (error) {
      console.error('Erro ao excluir colaborador:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir colaborador",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar usuários na inicialização
  useEffect(() => {
    loadUsers();
  }, []);

  return {
    users,
    isLoading,
    loadUsers,
    createUser,
    updateUser,
    deleteUser
  };
}
