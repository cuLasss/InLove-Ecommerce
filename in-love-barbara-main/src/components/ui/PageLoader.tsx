import { Loader2 } from "lucide-react"

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = "Carregando página..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Aguarde enquanto carregamos os dados...
          </p>
        </div>
      </div>
    </div>
  )
}

// Componente de loading específico para páginas com dados
export function DataLoader({ message = "Carregando dados..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-background">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// Componente de loading para tabelas
export function TableLoader() {
  return (
    <div className="flex items-center justify-center h-32 bg-background">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando dados...</span>
      </div>
    </div>
  )
}
