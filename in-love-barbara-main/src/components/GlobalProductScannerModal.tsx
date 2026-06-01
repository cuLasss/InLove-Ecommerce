import { useState, useEffect } from "react";
import { ResponsiveScannerSheet } from "./scan/ResponsiveScannerSheet";
import { useProducts } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, X, Download, Eye } from "lucide-react";
import { onVisualizarImpressao } from "@/lib/etiquetasZPL";
import { ProductPhotoModal } from "./products/ProductPhotoModal";
import { productsApi } from "@/lib/api";
import { universalDataAdapter } from "@/lib/universal-data-adapter";

interface GlobalProductScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalProductScannerModal({ open, onOpenChange }: GlobalProductScannerModalProps) {
  const { findProductByCode, findProductByQR } = useProducts();
  const { toast } = useToast();
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const handleCodeDetected = async (code: string) => {
    console.log('[GlobalScanner] ===== Código detectado =====');
    console.log('[GlobalScanner] Código bruto:', code);
    console.log('[GlobalScanner] Tipo:', typeof code);
    console.log('[GlobalScanner] Comprimento:', code.length);
    
    try {
      // Tentar buscar por QR primeiro, depois por código
      let product = findProductByQR(code) || findProductByCode(code);
      console.log('[GlobalScanner] Resultado findProductByQR/Code:', product ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
      
      if (!product) {
        console.log('[GlobalScanner] Iniciando busca robusta...');
        // Fallback robusto: consultar lista de produtos e tentar diversos formatos
        const { universalDataAdapter } = await import('@/lib/universal-data-adapter');
        const { data: products } = await universalDataAdapter.getProducts();
        console.log('[GlobalScanner] Total de produtos no sistema:', products?.length || 0);
        
        const normalized = code.trim();
        console.log('[GlobalScanner] Código normalizado:', normalized);
        
        if (products && products.length > 0) {
          console.log('[GlobalScanner] Tentando busca por short_code...');
          // 1) short_code exato
          product = products.find((p: any) => p.short_code === normalized) || null;
          if (product) console.log('[GlobalScanner] ✅ Encontrado por short_code:', product.name);
          
          // 2) QR code exato
          if (!product) {
            console.log('[GlobalScanner] Tentando busca por qr_code exato...');
            product = products.find((p: any) => p.qr_code === normalized) || null;
            if (product) console.log('[GlobalScanner] ✅ Encontrado por qr_code:', product.name);
          }
          
          // 3) formato inlove_product:shortCode
          if (!product) {
            console.log('[GlobalScanner] Tentando parse formato inlove_product:...');
            const parts = normalized.split(':');
            if (parts.length === 2 && parts[0] === 'inlove_product') {
              const [, shortCode] = parts;
              console.log('[GlobalScanner] ShortCode extraído:', shortCode);
              product = products.find((p: any) => p.short_code === shortCode) || null;
              if (product) console.log('[GlobalScanner] ✅ Encontrado por formato inlove_product:', product.name);
            }
          }
          
          // 4) id exato
          if (!product) {
            console.log('[GlobalScanner] Tentando busca por id...');
            product = products.find((p: any) => p.id === normalized) || null;
            if (product) console.log('[GlobalScanner] ✅ Encontrado por id:', product.name);
          }
          
          // 5) conteúdo parcial
          if (!product) {
            console.log('[GlobalScanner] Tentando busca por conteúdo parcial...');
            product = products.find((p: any) =>
              normalized.includes(p.short_code) ||
              normalized.includes(p.id) ||
              (p.qr_code && p.qr_code.includes(normalized))
            ) || null;
            if (product) console.log('[GlobalScanner] ✅ Encontrado por conteúdo parcial:', product.name);
          }
          
          // 6) por nome parcial
          if (!product) {
            console.log('[GlobalScanner] Tentando busca por nome...');
            const lc = normalized.toLowerCase();
            product = products.find((p: any) => p.name?.toLowerCase().includes(lc)) || null;
            if (product) console.log('[GlobalScanner] ✅ Encontrado por nome:', product.name);
          }
        }
        
        if (!product) {
          console.log('[GlobalScanner] ❌ Produto NÃO encontrado após todas as tentativas');
          toast({
            title: "❌ Produto não encontrado",
            description: `Código: ${code}`,
            variant: "destructive",
            duration: 3000
          });
          return;
        }
      }

      // Produto encontrado - fechar scanner e abrir modal de etiqueta
      console.log('[GlobalScanner] ✅ Produto FINAL encontrado:', product.name, product.id);
      onOpenChange(false);
      setScannedProduct(product);
      setLabelModalOpen(true);
      console.log('[GlobalScanner] ✅ Modal de etiqueta aberto!');
      
      toast({
        title: "✅ Produto encontrado",
        description: product.name,
        duration: 2000
      });
    } catch (error) {
      console.error('[GlobalScanner] ❌ Erro ao buscar produto:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao buscar produto",
        variant: "destructive"
      });
    }
  };

  // Carregar imagem quando o modal de etiqueta abrir
  useEffect(() => {
    if (labelModalOpen && scannedProduct && !productPhoto && !isLoadingImage) {
      loadProductImage();
    }
  }, [labelModalOpen, scannedProduct]);

  const loadProductImage = async () => {
    if (!scannedProduct) return;
    setIsLoadingImage(true);
    try {
      const response = await universalDataAdapter.getProductImage(scannedProduct.id);
      
      if (response.error) {
        console.error('❌ Erro ao carregar imagem:', response.error);
        return;
      }
      
      setProductPhoto(response.data);
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar imagem:', error);
    } finally {
      setIsLoadingImage(false);
    }
  };

  // Preparar dados do produto conforme esperado pela ação
  const produtoSelecionado = scannedProduct ? {
    id: scannedProduct.id,
    nome: scannedProduct.name || '',
    ref: scannedProduct.short_code || '',
    tam: scannedProduct.size || '',
    preco: scannedProduct.price_cents / 100,
    codigo128: scannedProduct.short_code || '',
    url_qr: scannedProduct.qr_code?.startsWith('inlove_product:') ? scannedProduct.qr_code : `inlove_product:${scannedProduct.short_code}`,
    fornecedor: scannedProduct.suppliers?.name || scannedProduct.supplier || scannedProduct.fornecedor || 'SEM FORNECEDOR'
  } : null;

  const handleVisualizarImpressao = async () => {
    if (!produtoSelecionado) return;
    
    try {
      onVisualizarImpressao(produtoSelecionado, 'qrcode');
      toast({
        title: "Sucesso",
        description: "Abrindo visualização da etiqueta no Labelary. Você pode baixar o PDF e imprimir por lá.",
      });
      setLabelModalOpen(false);
      setScannedProduct(null);
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir visualização",
        variant: "destructive"
      });
    }
  };

  const handlePhotoChange = async (photoUrl: string | null) => {
    if (!scannedProduct) return;
    
    try {
      await productsApi.update(scannedProduct.id, { photo_url: photoUrl });
      setProductPhoto(photoUrl);
      toast({
        title: "Sucesso",
        description: photoUrl ? "Foto do produto salva com sucesso!" : "Foto do produto removida com sucesso!",
        duration: 2000,
      });
    } catch (error) {
      console.error('Erro ao salvar foto do produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar foto do produto",
        variant: "destructive"
      });
    }
  };

  const handleDownloadImage = async () => {
    if (!productPhoto || !produtoSelecionado) return;
    
    try {
      const response = await fetch(productPhoto);
      if (!response.ok) throw new Error('Erro ao carregar imagem');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `foto-${produtoSelecionado.ref || produtoSelecionado.nome || 'produto'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Sucesso",
        description: "Imagem baixada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar imagem. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <ResponsiveScannerSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Scanner de Produtos"
        subtitle="Escaneie uma etiqueta de produto para visualizar"
        mode="varejo"
        onCodeDetected={handleCodeDetected}
      />

      {/* Modal de Visualização de Etiqueta */}
      <Dialog open={labelModalOpen} onOpenChange={setLabelModalOpen}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-lg sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 global-scanner-label-modal">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Visualizar Etiqueta</DialogTitle>
          </DialogHeader>

          {scannedProduct && produtoSelecionado && (
            <div className="space-y-4 sm:space-y-6">
              {/* Layout com informações do produto e área de foto */}
              <div className="flex flex-col sm:flex-row gap-4 label-modal-layout">
                {/* Informações do produto */}
                <div className="flex-1 bg-muted/30 p-3 sm:p-4 rounded-lg space-y-2 text-xs sm:text-sm">
                  <div><strong>{produtoSelecionado.nome}</strong></div>
                  <div>Código: {produtoSelecionado.ref}</div>
                  <div>Preço: R$ {produtoSelecionado.preco.toFixed(2).replace('.', ',')}</div>
                  {produtoSelecionado.fornecedor && (
                    <div>Fornecedor: {produtoSelecionado.fornecedor}</div>
                  )}
                  {produtoSelecionado.tam && (
                    <div>Tamanho: {produtoSelecionado.tam}</div>
                  )}
                </div>

                {/* Área da foto */}
                <div className="w-full sm:w-52 h-52 border-2 border-amber-600 border-dashed rounded-lg flex items-center justify-center bg-amber-50/50">
                  {isLoadingImage ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
                      <span className="text-xs text-amber-600">Carregando imagem...</span>
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
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => handlePhotoChange(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                      <ProductPhotoModal 
                        product={scannedProduct}
                        onPhotoChange={handlePhotoChange}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-xs">
                            <Camera className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Baixar Imagem */}
              {productPhoto && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDownloadImage}
                    className="text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Imagem
                  </Button>
                </div>
              )}

              {/* Informação sobre o tipo de etiqueta */}
              <div className="space-y-3">
                <div className="bg-green-50 p-2 sm:p-3 rounded-lg text-xs sm:text-sm text-green-800">
                  <p><strong>📱 QR Code:</strong> Etiqueta com QR Code (40×30mm, 3 colunas)</p>
                </div>
              </div>

              {/* Info sobre o Labelary */}
              <div className="bg-blue-50 p-2 sm:p-3 rounded-lg text-xs sm:text-sm text-blue-800">
                <p><strong>💡 Dica:</strong> No Labelary você pode baixar o PDF da etiqueta e imprimir diretamente na sua impressora.</p>
              </div>

              {/* Botão de visualização */}
              <Button
                onClick={handleVisualizarImpressao}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar no Labelary
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

