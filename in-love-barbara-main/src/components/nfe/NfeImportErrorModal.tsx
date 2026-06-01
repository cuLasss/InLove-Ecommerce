import { AlertTriangle, X, FileText, Calendar, User, Hash } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NfeImportErrorModalProps {
  isOpen: boolean
  onClose: () => void
  onViewExistingNfe?: (nfeId: string) => void
  error: {
    type: 'duplicate' | 'invalid' | 'processing' | 'network' | 'canceled' | 'unauthorized'
    title: string
    message: string
    details?: {
      fileName?: string
      chaveAcesso?: string
      numero?: string
      serie?: string
      emitente?: string
      dataEmissao?: string
      existingNfe?: {
        id: string
        fileName: string
        importDate: string
      }
    }
    suggestions?: string[]
  }
}

export function NfeImportErrorModal({ isOpen, onClose, onViewExistingNfe, error }: NfeImportErrorModalProps) {
  console.log('🔍 [Modal Debug] isOpen:', isOpen)
  console.log('🔍 [Modal Debug] error:', error)
  console.log('🔍 [Modal Debug] error type:', error?.type)
  
  // Se não há erro ou modal não está aberto, não renderizar nada
  if (!isOpen || !error) {
    console.log('🔍 [Modal Debug] Modal não será renderizado - isOpen:', isOpen, 'error:', !!error)
    return null
  }
  
  console.log('🔍 [Modal Debug] Modal será renderizado!')

  const getErrorIcon = () => {
    switch (error.type) {
      case 'duplicate':
        return <FileText className="h-6 w-6 text-orange-500" />
      case 'invalid':
        return <AlertTriangle className="h-6 w-6 text-red-500" />
      case 'canceled':
        return <FileText className="h-6 w-6 text-gray-500" />
      case 'unauthorized':
        return <AlertTriangle className="h-6 w-6 text-orange-500" />
      case 'processing':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
      case 'network':
        return <AlertTriangle className="h-6 w-6 text-red-500" />
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />
    }
  }

  const getErrorBadge = () => {
    switch (error.type) {
      case 'duplicate':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Duplicada</Badge>
      case 'invalid':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Erro de Processamento</Badge>
      case 'canceled':
        return <Badge variant="outline" className="text-gray-600 border-gray-200">Cancelada</Badge>
      case 'unauthorized':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Não Autorizada</Badge>
      case 'processing':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Erro de Processamento</Badge>
      case 'network':
        return <Badge variant="destructive">Erro de Conexão</Badge>
      default:
        return <Badge variant="destructive">Erro</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getErrorIcon()}
            <span>{error.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getErrorBadge()}
          </div>

          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium whitespace-pre-line">{error.message}</p>
          </div>


          {/* NF-e Details */}
          {error.details && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detalhes da Nota Fiscal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error.details.fileName && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Arquivo</p>
                      <p className="text-sm text-muted-foreground">{error.details.fileName}</p>
                    </div>
                  </div>
                )}

                {error.details.chaveAcesso && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Chave de Acesso</p>
                      <p className="text-sm text-muted-foreground font-mono">{error.details.chaveAcesso}</p>
                    </div>
                  </div>
                )}

                {error.details.numero && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Número</p>
                      <p className="text-sm text-muted-foreground">{error.details.numero}</p>
                    </div>
                  </div>
                )}

                {error.details.serie && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Série</p>
                      <p className="text-sm text-muted-foreground">{error.details.serie}</p>
                    </div>
                  </div>
                )}

                {error.details.emitente && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Emitente</p>
                      <p className="text-sm text-muted-foreground">{error.details.emitente}</p>
                    </div>
                  </div>
                )}

                {error.details.dataEmissao && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Data de Emissão</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(error.details.dataEmissao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Existing NF-e (for duplicates) */}
          {error.details?.existingNfe && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                  <FileText className="h-5 w-5" />
                  Nota Fiscal Existente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Arquivo Original</p>
                    <p className="text-sm text-muted-foreground">{error.details.existingNfe.fileName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data de Importação</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(error.details.existingNfe.importDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                  <AlertTriangle className="h-5 w-5" />
                  Sugestões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span className="text-sm text-blue-800">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {error.type === 'duplicate' && error.details?.existingNfe && (
              <Button 
                variant="default" 
                onClick={() => {
                  onClose()
                  if (onViewExistingNfe && error.details?.existingNfe?.id) {
                    onViewExistingNfe(error.details.existingNfe.id)
                  }
                }}
              >
                Ver Nota Existente
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
