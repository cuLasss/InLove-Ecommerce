import { useQuery } from '@tanstack/react-query'
// Sistema local - não precisa de Supabase
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'viewer'
  active: boolean
  created_at: string
  updated_at: string
}

/**
 * Hook to fetch the current user's profile including role information
 */
export function useUserProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      // Sistema local - retornar dados vazios
      return null
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5
  })
}
