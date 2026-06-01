import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Camera, Upload, X, Image as ImageIcon, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductPhotoModalProps {
  product: any
  trigger?: React.ReactNode
  onPhotoChange?: (photo: string | null) => void
  currentPhoto?: string | null
}

export function ProductPhotoModal({ 
  product, 
  trigger, 
  onPhotoChange,
  currentPhoto 
}: ProductPhotoModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(currentPhoto || null)
  const [isUploading, setIsUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Camera className="h-4 w-4 mr-2" />
      Adicionar Foto
    </Button>
  )

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      })
      return
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    
    // Converter para base64 para preview (simulação)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPhoto(result)
      onPhotoChange?.(result)
      setIsUploading(false)
      
      toast({
        title: "Sucesso",
        description: "Foto adicionada com sucesso!",
        duration: 2000,
      })
    }
    
    reader.onerror = () => {
      setIsUploading(false)
      toast({
        title: "Erro",
        description: "Erro ao processar a imagem.",
        variant: "destructive"
      })
    }
    
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setShowDeleteConfirm(true)
  }

  const confirmRemovePhoto = () => {
    setPhoto(null)
    onPhotoChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    setShowDeleteConfirm(false)
    
    toast({
      title: "Foto removida",
      description: "A foto do produto foi removida.",
    })
  }

  const handleSave = () => {
    // Aqui será implementada a lógica de salvamento no banco de dados
    // Por enquanto, apenas fecha o modal
    setIsOpen(false)
    
    toast({
      title: "Sucesso",
      description: "Foto salva com sucesso!",
      duration: 2000,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Foto do Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do produto */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
            <div><strong>{product.name || 'Produto'}</strong></div>
            <div>Código: {product.short_code || 'N/A'}</div>
            {product.size && <div>Tamanho: {product.size}</div>}
          </div>

          {/* Área de upload da foto */}
          <div className="space-y-3">
            <Label className="font-semibold">Foto do Produto</Label>
            
            {/* Preview da foto */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              {photo ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img 
                      src={photo} 
                      alt="Preview da foto" 
                      className="max-w-full max-h-48 rounded-lg mx-auto"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={handleRemovePhoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Foto adicionada com sucesso
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Nenhuma foto adicionada
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Upload className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Selecionar Foto
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Input de arquivo oculto */}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Informações sobre o upload */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p><strong>💡 Dica:</strong> Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.</p>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!photo || isUploading}
              className="flex-1"
            >
              Salvar Foto
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a imagem deste produto? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRemovePhoto}
            >
              Excluir Imagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
