import { useQuery } from '@tanstack/react-query';
import { universalDataAdapter } from '@/lib/universal-data-adapter';

export function useClients() {
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await universalDataAdapter.getClients();
      if (response.error) {
        console.error('Erro ao buscar clientes:', response.error);
        return [];
      }
      return response.data || [];
    },
    staleTime: 10 * 60 * 1000, // ✅ OTIMIZADO: 10 minutos (aumentado para reduzir refetch)
    refetchOnMount: false, // Usa cache se ainda estiver válido
    refetchOnWindowFocus: false, // Não refaz fetch ao focar na janela
    refetchOnReconnect: false, // Não refaz fetch ao reconectar
    gcTime: 30 * 60 * 1000 // ✅ OTIMIZADO: Cache por 30 minutos
  });

  return {
    data: clients,
    isLoading,
    error
  };
}
