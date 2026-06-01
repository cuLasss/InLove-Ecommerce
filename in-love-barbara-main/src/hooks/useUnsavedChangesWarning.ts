import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const navigate = useNavigate()
  const location = useLocation()

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = 'Você tem alterações não salvas neste rascunho. Sair agora descartará mudanças. Deseja realmente sair?'
        return event.returnValue
      }
    }

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])

  // Navigation confirmation
  const confirmNavigation = useCallback((message?: string) => {
    if (!hasUnsavedChanges) return true
    
    const confirmMessage = message || 'Você tem alterações não salvas neste rascunho. Sair agora descartará mudanças. Deseja realmente sair?'
    return window.confirm(confirmMessage)
  }, [hasUnsavedChanges])

  // Safe navigation function
  const navigateWithConfirmation = useCallback((to: string, options?: { replace?: boolean }) => {
    if (confirmNavigation()) {
      navigate(to, options)
    }
  }, [navigate, confirmNavigation])

  return {
    hasUnsavedChanges,
    confirmNavigation,
    navigateWithConfirmation
  }
}