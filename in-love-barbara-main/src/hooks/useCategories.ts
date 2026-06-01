import { useQuery } from '@tanstack/react-query';
import { universalDataAdapter } from '@/lib/universal-data-adapter';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await universalDataAdapter.getCategories();
        if (response.error) {
          console.error('Erro ao buscar categorias:', response.error);
          return [];
        }
        return response.data || [];
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

