import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Eye, Camera, Image as ImageIcon, X, Download, AlertTriangle } from "lucide-react"
import { onVisualizarImpressao } from "@/lib/etiquetasZPL"
import { useToast } from "@/hooks/use-toast"
import { ProductPhotoModal } from "./ProductPhotoModal"
import { productsApi } from "@/lib/api"
import { universalDataAdapter } from "@/lib/universal-data-adapter"

interface ProductLabelPrintProps {
  product: any
  trigger?: React.ReactNode
}

export function ProductLabelPrint({ product, trigger }: ProductLabelPrintProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [productPhoto, setProductPhoto] = useState<string | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { toast } = useToast()

  // Carregar imagem apenas quando o modal abrir
  useEffect(() => {
    if (isOpen && !productPhoto && !isLoadingImage) {
      loadProductImage()
    }
  }, [isOpen])

  // Reset da imagem quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setProductPhoto(null)
      setIsLoadingImage(false)
    }
  }, [isOpen])

  const loadProductImage = async () => {
    setIsLoadingImage(true)
    try {
      const response = await universalDataAdapter.getProductImage(product.id)
      
      if (response.error) {
        console.error('❌ Erro ao carregar imagem:', response.error)
        return
      }
      
      setProductPhoto(response.data)
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar imagem:', error)
    } finally {
      setIsLoadingImage(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-4 w-4 mr-2" />
      Visualizar Etiqueta
    </Button>
  )

  // Preparar dados do produto conforme esperado pela action
  const produtoSelecionado = {
    id: product.id,
    nome: product.name || '',
    ref: product.short_code || '',
    tam: product.size || '',
    preco: product.price_cents / 100,
    codigo128: product.short_code || '',
    url_qr: product.qr_code?.startsWith('inlove_product:') ? product.qr_code : `inlove_product:${product.short_code}`,
    fornecedor: product.suppliers?.name || product.supplier || product.fornecedor || 'SEM FORNECEDOR'
  }


  const handleVisualizarImpressao = async () => {
    setIsProcessing(true)
    try {
      onVisualizarImpressao(produtoSelecionado, 'qrcode')
      toast({
        title: "Sucesso",
        description: "Abrindo visualização da etiqueta no Labelary. Você pode baixar o PDF e imprimir por lá.",
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Erro ao visualizar:', error)
      toast({
        title: "Erro",
        description: "Erro ao abrir visualização",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePhotoChange = async (photoUrl: string | null) => {
    try {
      // Atualizar o produto no banco de dados
      await productsApi.update(product.id, { photo_url: photoUrl })
      
      // Atualizar o estado local
      setProductPhoto(photoUrl)
      
      toast({
        title: "Sucesso",
        description: photoUrl ? "Foto do produto salva com sucesso!" : "Foto do produto removida com sucesso!",
        duration: 2000,
      })
    } catch (error) {
      console.error('Erro ao salvar foto do produto:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar foto do produto",
        variant: "destructive"
      })
    }
  }

  const handleRemovePhotoClick = () => {
    setShowDeleteConfirm(true)
  }

  const confirmRemovePhoto = async () => {
    setShowDeleteConfirm(false)
    await handlePhotoChange(null)
  }

  const handleDownloadImage = async () => {
    if (!productPhoto) return
    
    try {
      // Fazer fetch da imagem para converter em blob
      const response = await fetch(productPhoto)
      if (!response.ok) {
        throw new Error('Erro ao carregar imagem')
      }
      
      const blob = await response.blob()
      
      // Criar URL do blob
      const blobUrl = URL.createObjectURL(blob)
      
      // Criar link de download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `foto-${produtoSelecionado.ref || produtoSelecionado.nome || 'produto'}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Limpar a URL do blob
      URL.revokeObjectURL(blobUrl)
      
      toast({
        title: "Sucesso",
        description: "Imagem baixada com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao baixar imagem:', error)
      toast({
        title: "Erro",
        description: "Erro ao baixar imagem. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>

      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Visualizar Etiqueta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Layout com informações do produto e área de foto */}
          <div className="flex flex-col btn:flex-row gap-3 sm:gap-4">
            {/* Informações do produto */}
            <div className="flex-1 bg-muted/30 p-3 sm:p-4 rounded-lg space-y-1.5 sm:space-y-2 text-xs sm:text-sm min-w-0">
              <div className="break-words"><strong>{produtoSelecionado.nome}</strong></div>
              <div>Código: {produtoSelecionado.ref}</div>
              <div>Preço: R$ {produtoSelecionado.preco.toFixed(2).replace('.', ',')}</div>
              {produtoSelecionado.fornecedor && (
                <div className="break-words">Fornecedor: {produtoSelecionado.fornecedor}</div>
              )}
              {produtoSelecionado.tam && (
                <div>Tamanho: {produtoSelecionado.tam}</div>
              )}
            </div>

            {/* Área da foto */}
            <div className="w-full btn:w-52 h-48 btn:h-52 border-2 border-amber-600 border-dashed rounded-lg flex items-center justify-center bg-amber-50/50 flex-shrink-0">
              {isLoadingImage ? (
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-amber-500 mb-2"></div>
                  <span className="text-[10px] sm:text-xs text-amber-600">Carregando imagem...</span>
                </div>
              ) : productPhoto ? (
                <div className="relative w-full h-full">
                  <img 
                    src={productPhoto} 
                    alt="Foto do produto" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 p-0"
                    onClick={handleRemovePhotoClick}
                  >
                    <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              ) : (
                <div className="text-center px-2">
                  <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-amber-500 mb-2" />
                  <ProductPhotoModal 
                    product={product}
                    onPhotoChange={handlePhotoChange}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs">
                        <Camera className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Botão Baixar Imagem - Posicionado na área rosa */}
          {productPhoto && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="sm:h-10 sm:px-4 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-800 text-xs sm:text-sm"
                onClick={handleDownloadImage}
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Baixar Imagem
              </Button>
            </div>
          )}

          {/* Informação sobre o tipo de etiqueta */}
          <div className="space-y-2 sm:space-y-3">
            <div className="bg-green-50 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm text-green-800">
              <p className="break-words"><strong>📱 QR Code:</strong> Etiqueta com QR Code (40×30mm, 3 colunas)</p>
            </div>
          </div>

          {/* Info sobre o Labelary */}
          <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm text-blue-800">
            <p className="break-words"><strong>💡 Dica:</strong> No Labelary você pode baixar o PDF da etiqueta e imprimir diretamente na sua impressora.</p>
          </div>

          {/* Botão de visualização */}
          <Button
            onClick={handleVisualizarImpressao}
            disabled={isProcessing}
            className="w-full text-xs sm:text-sm h-9 sm:h-10"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {isProcessing ? "Abrindo visualização..." : "Visualizar no Labelary"}
          </Button>
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