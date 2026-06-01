import { useToast } from "@/hooks/use-toast"

/**
 * Hook personalizado para toasts com durações padronizadas
 * - Erros: 3 segundos
 * - Sucessos: 1.5 segundos
 * - Outros: 2 segundos
 */
export function useToastDuration() {
  const { toast: originalToast } = useToast()

  const toast = {
    success: (props: Parameters<typeof originalToast>[0]) => {
      return originalToast({
        ...props,
        duration: 1500, // 1.5 segundos para sucessos
      })
    },
    
    error: (props: Parameters<typeof originalToast>[0]) => {
      return originalToast({
        ...props,
        variant: "destructive",
        duration: 3000, // 3 segundos para erros
      })
    },
    
    info: (props: Parameters<typeof originalToast>[0]) => {
      return originalToast({
        ...props,
        duration: 2000, // 2 segundos para informações
      })
    },
    
    warning: (props: Parameters<typeof originalToast>[0]) => {
      return originalToast({
        ...props,
        duration: 2500, // 2.5 segundos para avisos
      })
    },
    
    // Método padrão para compatibilidade
    default: originalToast,
  }

  return { toast }
}
