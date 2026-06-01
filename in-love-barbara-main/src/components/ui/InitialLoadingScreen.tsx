import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface InitialLoadingScreenProps {
  progress: number
  currentTask?: string
}

export function InitialLoadingScreen({ progress, currentTask }: InitialLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-md w-full px-6">
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-background rounded-full" />
          </div>
        </div>
        
        <div className="text-center space-y-2 w-full">
          <h2 className="text-2xl font-semibold">Preparando sistema...</h2>
          {currentTask && (
            <p className="text-sm text-muted-foreground">{currentTask}</p>
          )}
          {!currentTask && (
            <p className="text-sm text-muted-foreground">Carregando rotas e dados...</p>
          )}
        </div>
        
        <div className="w-full space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(progress)}% concluído
          </p>
        </div>
      </div>
    </div>
  )
}

