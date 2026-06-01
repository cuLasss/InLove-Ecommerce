/**
 * Componente de Upload de Imagem
 * Interface para upload de imagens de produtos
 */

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useSimpleImageUpload } from '@/lib/simple-image-upload-service'
import { useToast } from '@/hooks/use-toast'

interface ImageUploadProps {
  productId?: string
  currentImageUrl?: string
  onImageUploaded: (url: string) => void
  onImageRemoved?: () => void
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  productId,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadImage, deleteImage } = useSimpleImageUpload()
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!productId) {
      setError('ID do produto é necessário para fazer upload')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      console.log('🔄 [ImageUpload] Iniciando upload...', {
        fileName: file.name,
        fileSize: file.size,
        productId
      })

      const result = await uploadImage(file, productId, {
        maxSize: 5, // 5MB
        quality: 0.8 // 80% de qualidade
      })

      if (result.success && result.url) {
        setPreviewUrl(result.url)
        onImageUploaded(result.url)
        
        toast({
          title: "Sucesso",
          description: "Imagem enviada com sucesso!",
        })

        console.log('✅ [ImageUpload] Upload concluído:', result.url)
      } else {
        setError(result.error || 'Erro desconhecido no upload')
        toast({
          title: "Erro",
          description: result.error || "Erro ao enviar imagem",
          variant: "destructive"
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = async () => {
    if (!previewUrl) return

    try {
      // Se a imagem atual está no Supabase Storage, tentar removê-la
      if (previewUrl.includes('supabase.co')) {
        const urlParts = previewUrl.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const folder = urlParts[urlParts.length - 2]
        const imagePath = `${folder}/${fileName}`

        await deleteImage(imagePath)
      }

      setPreviewUrl(null)
      onImageRemoved?.()
      
      toast({
        title: "Sucesso",
        description: "Imagem removida com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao remover imagem:', error)
      toast({
        title: "Erro",
        description: "Erro ao remover imagem",
        variant: "destructive"
      })
    }
  }

  const handleClickUpload = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Imagem do Produto</Label>
      
      {/* Preview da imagem */}
      {previewUrl && (
        <Card className="relative">
          <CardContent className="p-4">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview do produto"
                className="w-32 h-32 object-cover rounded-lg border"
                onError={() => setError('Erro ao carregar imagem')}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveImage}
                disabled={disabled || isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Clique no X para remover a imagem
            </div>
          </CardContent>
        </Card>
      )}

      {/* Área de upload */}
      {!previewUrl && (
        <Card 
          className={`border-2 border-dashed cursor-pointer transition-colors ${
            disabled || isUploading 
              ? 'border-muted cursor-not-allowed opacity-50' 
              : 'border-primary hover:border-primary/80 hover:bg-primary/5'
          }`}
          onClick={handleClickUpload}
        >
          <CardContent className="p-8 text-center">
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Enviando imagem...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Clique para fazer upload</p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP até 5MB
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botão de upload alternativo */}
      {previewUrl && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClickUpload}
          disabled={disabled || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Alterar Imagem
            </>
          )}
        </Button>
      )}

      {/* Input file oculto */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Mensagem de erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Informações sobre o upload */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Formatos aceitos: PNG, JPG, WEBP</p>
        <p>• Tamanho máximo: 5MB</p>
        <p>• A imagem será redimensionada automaticamente</p>
        <p>• URLs são públicas e otimizadas para web</p>
      </div>
    </div>
  )
}
