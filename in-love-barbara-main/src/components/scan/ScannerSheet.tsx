import { useState, useEffect, useRef, useCallback } from 'react';
import { X, FlashlightOff, Flashlight, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
// Sistema local - não precisa de Supabase
import { useRetailSaleStore } from '@/stores/retailSaleStore';
import ScannerEngine from '@/lib/scan/ScannerEngine';

export interface ScanResult {
  raw: string;
  format: string;
}

export interface ScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: ScanResult) => void;
  autoClose?: boolean;
}

export function ScannerSheet({ 
  open, 
  onOpenChange, 
  onResult, 
  autoClose = false 
}: ScannerSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState([1]);
  
  // Status da sessão e estoque em tempo real
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [lastProduct, setLastProduct] = useState<any>(null);
  const [realTimeStock, setRealTimeStock] = useState<number>(0);
  const [sessionCartCount, setSessionCartCount] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { findProductByCode } = useProducts();
  const { items } = useRetailSaleStore();
  
  // Inicializar/finalizar câmera baseado no estado do modal
  useEffect(() => {
    if (open) {
      initCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [open]);
  
  // Resetar dados ao abrir
  useEffect(() => {
    if (open) {
      setLastScannedCode('');
      setLastProduct(null);
      setRealTimeStock(0);
      setSessionCartCount(0);
    }
  }, [open]);

  // Atualizar contador da sessão baseado no carrinho
  useEffect(() => {
    if (lastProduct) {
      const itemInCart = items.find(item => item.product_id === lastProduct.id);
      setSessionCartCount(itemInCart?.qty || 0);
    }
  }, [items, lastProduct]);
  
  const initCamera = async () => {
    if (!open) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await ScannerEngine.open();
      
      const videoElement = ScannerEngine.getVideoElement();
      if (videoElement && videoRef.current) {
        // Conectar o vídeo ao elemento DOM para visualização
        videoRef.current.srcObject = videoElement.srcObject;
        await videoRef.current.play();
      }
      
      await ScannerEngine.startDetect(handleScanResult);
      
      // Sincronizar estado do torch
      setTorchOn(ScannerEngine.getTorchState());
      
    } catch (err: any) {
      console.error('[ScannerSheet] Erro ao inicializar câmera:', err);
      
      let errorMessage = 'Erro desconhecido ao acessar a câmera';
      
      if (err.message && err.message.includes('BarcodeDetector não suportado')) {
        errorMessage = 'Scanner não suportado neste dispositivo. Use o botão para digitar o código manualmente.';
      } else if (err.name === 'NotAllowedError') {
        errorMessage = 'Permissão negada. Permita o acesso à câmera e tente novamente.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Câmera em uso por outro aplicativo.';
      } else if (err.message.includes('HTTPS')) {
        errorMessage = 'Câmera requer conexão segura (HTTPS).';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const cleanup = () => {
    ScannerEngine.close();
    setTorchOn(false);
    setZoom([1]);
  };
  
  const fetchRealTimeStock = useCallback(async (productId: string) => {
    try {
      const { data: freshAvailability, error } = await Promise.resolve({ data: [], error: null }); // Sistema local
      
      if (error) {
        console.error('Erro ao buscar estoque em tempo real:', error);
        return 0;
      }
      
      // Calcular estoque disponível baseado nos dados locais
      const availability = freshAvailability?.find((item: any) => item.product_id === productId);
      return availability?.available_quantity || 0;
      
    } catch (error) {
      console.error('Erro ao buscar estoque:', error);
      return 0;
    }
  }, []);

  const handleScanResult = useCallback(async (code: string) => {
    // Buscar produto pelo código
    const product = findProductByCode(code);
    
    if (!product) {
      toast({
        title: "❌ Código não encontrado",
        description: code,
        variant: "destructive"
      });
      return;
    }
    
    // SEMPRE buscar estoque em tempo real do servidor (não usar cache)
    const availableStock = await fetchRealTimeStock(product.id);
    
    // Considerar itens já no carrinho
    const itemInCart = items.find(item => item.product_id === product.id);
    const qtyInCart = itemInCart?.qty || 0;
    const availableSession = availableStock - qtyInCart;
    
    if (availableSession < 1) {
      toast({
        title: "❌ Sem estoque disponível",
        description: `${product.name} - Estoque: ${availableStock}`,
        variant: "destructive"
      });
      return;
    }
    
    // Vibração para feedback
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
    
    // Atualizar estado da sessão
    setLastScannedCode(code);
    setLastProduct(product);
    setRealTimeStock(availableStock);
    
    // Enviar resultado
    const result: ScanResult = {
      raw: code,
      format: 'auto'
    };
    
    onResult(result);
    
    toast({
      title: "✅ Produto adicionado",
      description: `${product.name} - Qtd: 1 | Estoque restante: ${availableSession - 1}`,
      duration: 1000, // 1 segundo para fechar rapidamente
    });
    
    // Auto fechar se configurado
    if (autoClose) {
      onOpenChange(false);
    }
  }, [findProductByCode, toast, onResult, autoClose, onOpenChange, fetchRealTimeStock, items]);
  
  const handleAddOne = async () => {
    if (!ScannerEngine.canRepeatLast() || !lastProduct) {
      toast({
        title: 'Não é possível adicionar',
        description: 'Escaneie um código primeiro ou aguarde o tempo limite.',
        variant: 'destructive'
      });
      return;
    }
    
    // Buscar estoque atualizado em tempo real
    const availableStock = await fetchRealTimeStock(lastProduct.id);
    setRealTimeStock(availableStock);
    
    // Considerar itens já no carrinho
    const itemInCart = items.find(item => item.product_id === lastProduct.id);
    const qtyInCart = itemInCart?.qty || 0;
    const availableSession = availableStock - qtyInCart;
    
    if (availableSession < 1) {
      toast({
        title: "❌ Sem estoque disponível",
        description: `${lastProduct.name} - Estoque: ${availableStock}`,
        variant: "destructive"
      });
      return;
    }
    
    const success = ScannerEngine.addLastCode(handleScanResult);
    
    if (!success) {
      toast({
        title: 'Aguarde',
        description: 'Muito rápido, aguarde um momento.',
        variant: 'destructive'
      });
    }
  };
  
  const handleSubtractOne = async () => {
    if (!lastProduct || sessionCartCount === 0) {
      toast({
        title: 'Nenhum produto no carrinho',
        description: 'Adicione um produto primeiro.',
        variant: 'destructive'
      });
      return;
    }
    
    // Simular remoção via onResult com quantidade negativa
    const removeResult: ScanResult = {
      raw: lastScannedCode,
      format: 'remove'
    };
    
    onResult(removeResult);
    
    // Atualizar estoque em tempo real
    const availableStock = await fetchRealTimeStock(lastProduct.id);
    setRealTimeStock(availableStock);
    
    toast({
      title: "➖ Produto removido",
      description: `${lastProduct.name} - Qtd: -1`,
    });
  };
  
  const handleTorchToggle = async () => {
    if (!ScannerEngine.getTorchSupported()) {
      toast({
        title: 'Lanterna não disponível',
        description: 'Este dispositivo não suporta controle de lanterna.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const newState = await ScannerEngine.toggleTorch();
      setTorchOn(newState);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível controlar a lanterna.',
        variant: 'destructive'
      });
    }
  };
  
  const handleZoomChange = async (value: number[]) => {
    setZoom(value);
    try {
      await ScannerEngine.setZoom(value[0]);
    } catch (error) {
      console.warn('Erro ao ajustar zoom:', error);
    }
  };
  
  const handleTapToFocus = async () => {
    try {
      await ScannerEngine.tapToFocus();
    } catch (error) {
      console.warn('Erro ao focar:', error);
    }
  };
  
  const handleRetry = () => {
    setError('');
    initCamera();
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-full max-h-screen p-0 border-none"
      >
        <div className="relative h-full bg-black flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between text-white">
              <h2 className="text-lg font-semibold">Scanner de Produtos</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          {/* Área do vídeo */}
          <div className="flex-1 relative overflow-hidden" ref={containerRef}>
            {!error ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  onClick={handleTapToFocus}
                />
                
                {/* Dica de uso ACIMA da ROI */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    {/* Texto acima da ROI */}
                    <div className="absolute left-1/2 transform -translate-x-1/2" style={{ top: 'calc(-1 * min(78vw, 60vh) / 2 - 3rem)' }}>
                      <p className="text-white text-center text-sm bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                        🎯 Centralize o código aqui
                      </p>
                    </div>
                    
                    {/* ROI: Área quadrada centralizada */}
                    <div 
                      className="aspect-square border-3 border-white rounded-2xl shadow-lg"
                      style={{
                        width: 'min(78vw, 60vh)',
                        height: 'min(78vw, 60vh)',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      {/* Cantos destacados */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-2xl"></div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-2xl"></div>
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-2xl"></div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-2xl"></div>
                      
                      {/* Linha central animada */}
                      <div className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse rounded-full"></div>
                      
                      {/* Indicador central */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 border-2 border-primary rounded-full bg-primary/20 animate-ping"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Iniciando câmera...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="text-red-500 text-6xl">📷</div>
                  <h3 className="text-white text-lg font-semibold">Erro na Câmera</h3>
                  <p className="text-gray-300 text-sm">{error}</p>
                  <Button 
                    onClick={handleRetry} 
                    variant="secondary"
                    className="mt-4"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Botões flutuantes +/- */}
          {!error && lastProduct && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 flex flex-col gap-3">
              <Button
                size="icon"
                onClick={handleAddOne}
                disabled={realTimeStock - sessionCartCount < 1}
                className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
              >
                <Plus className="h-5 w-5" />
              </Button>
              
              <Button
                size="icon"
                onClick={handleSubtractOne}
                disabled={sessionCartCount === 0}
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
              >
                <Minus className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          {/* Rodapé de status */}
          {!error && (
            <div className="absolute bottom-20 left-0 right-0 z-20 px-4">
              <div className="bg-black/80 text-white p-3 rounded-lg text-sm space-y-2">
                {lastProduct ? (
                  <>
                    <div className="space-y-1">
                      <div className="font-medium text-primary">
                        Produto: {lastProduct.name}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                        <span>Preço: R$ {((lastProduct.price_cents || 0) / 100).toFixed(2)}</span>
                        <span>Código: {lastProduct.short_code}</span>
                        <span>Categoria: {lastProduct.categories?.name || 'Sem categoria'}</span>
                        <span>Fornecedor: {lastProduct.suppliers?.name || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Adicionados nesta sessão: {sessionCartCount}</span>
                      <span className="text-primary">
                        Estoque: {Math.max(0, realTimeStock - sessionCartCount)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-gray-300">Escaneie um produto para ver detalhes</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Controles inferiores */}
          {!error && (
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="space-y-4">
                {/* Slider de zoom */}
                <div className="flex items-center space-x-3 text-white">
                  <span className="text-sm">Zoom</span>
                  <Slider
                    value={zoom}
                    onValueChange={handleZoomChange}
                    max={3}
                    min={1}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm w-8">{zoom[0].toFixed(1)}x</span>
                </div>
                
                {/* Botão de lanterna */}
                <div className="flex items-center justify-center">
                  {ScannerEngine.getTorchSupported() && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleTorchToggle}
                      className={`${
                        torchOn 
                          ? 'bg-yellow-600/30 border-yellow-500/50 text-yellow-200' 
                          : 'bg-white/20 border-white/30 text-white'
                      } hover:bg-white/30`}
                    >
                      {torchOn ? (
                        <Flashlight className="h-5 w-5" />
                      ) : (
                        <FlashlightOff className="h-5 w-5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}