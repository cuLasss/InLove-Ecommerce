import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useScannerPendingItem, PendingItem } from "@/hooks/useScannerPendingItem";
import ScannerEngine from "@/lib/scan/ScannerEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Flashlight, FlashlightOff, X, Keyboard, Plus, Minus, Check, XCircle, AlertTriangle, Smartphone, Monitor, Scan, Zap, Search, Slash, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useProducts } from "@/hooks/useProducts";

interface ResponsiveScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  mode?: 'return' | 'consignado' | 'varejo';
  loteItems?: any[];
  onConfirmAction?: (productId: string, qty: number) => Promise<void>;
  getProductByCode?: (code: string) => Promise<any>;
  getAvailableStock?: (productId: string) => Promise<number>;
  getDraftQty?: (productId: string) => number;
  validateProduct?: (product: any) => Promise<{ valid: boolean; message: string; type: 'error' | 'warning' | 'success' }>;
  onCodeDetected?: (code: string) => Promise<void>;
  // ✅ NOVA PROP: Produtos da folha para busca filtrada
  folhaProducts?: any[];
}

export function ResponsiveScannerSheet({ 
  open, 
  onOpenChange, 
  title = "Scanner de Produtos",
  subtitle = "Escaneie o código de barras do produto",
  mode = 'varejo',
  loteItems = [],
  onConfirmAction,
  getProductByCode,
  getAvailableStock,
  getDraftQty,
  validateProduct,
  onCodeDetected,
  folhaProducts
}: ResponsiveScannerSheetProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roiRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{type: 'error' | 'success' | 'warning', message: string} | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [deviceOrientation, setDeviceOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  
  const { toast } = useToast();
  const { products, findProductByCode } = useProducts();

  // Hook para item pendente
  const pendingItemHook = useScannerPendingItem({
    mode: mode as 'consignado' | 'varejo',
    onConfirm: onConfirmAction || (async () => {}),
    onCancel: () => {
      setValidationMessage(null);
    }
  });

  const { 
    pendingItem, 
    setPending, 
    incrementPending, 
    decrementPending, 
    confirmPending, 
    cancelPending,
    canIncrement,
    canDecrement,
    hasPending
  } = pendingItemHook;

  // Detectar dispositivo móvel e orientação
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      
      setIsMobile(mobile);
      setDeviceOrientation(orientation);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Função para feedback tátil (vibração)
  const triggerHapticFeedback = (type: 'success' | 'error' | 'warning' = 'success') => {
    if ('vibrate' in navigator) {
      switch (type) {
        case 'success':
          navigator.vibrate([50, 50, 100]); // Padrão de sucesso
          break;
        case 'error':
          navigator.vibrate([100, 50, 100, 50, 100]); // Padrão de erro
          break;
        case 'warning':
          navigator.vibrate([200]); // Vibração única para aviso
          break;
      }
    }
  };

  // Função para feedback sonoro removida - sem efeitos sonoros

  // Função para feedback visual animado - ESTÁVEL
  const triggerVisualFeedback = useCallback((type: 'success' | 'error' | 'warning' = 'success') => {
    const roiElement = roiRef.current;
    if (!roiElement) return;
    
    // Remover classes anteriores
    roiElement.classList.remove('animate-pulse', 'border-green-500', 'border-red-500', 'border-yellow-500');
    
    // Adicionar nova classe baseada no tipo
    switch (type) {
      case 'success':
        roiElement.classList.add('border-green-500', 'animate-pulse');
        setTimeout(() => {
          roiElement.classList.remove('border-green-500', 'animate-pulse');
        }, 1000);
        break;
      case 'error':
        roiElement.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => {
          roiElement.classList.remove('border-red-500', 'animate-pulse');
        }, 1000);
        break;
      case 'warning':
        roiElement.classList.add('border-yellow-500', 'animate-pulse');
        setTimeout(() => {
          roiElement.classList.remove('border-yellow-500', 'animate-pulse');
        }, 800);
        break;
    }
  }, []);

  // Função combinada de feedback - apenas háptico e visual - ESTÁVEL
  const triggerFeedback = useCallback((type: 'success' | 'error' | 'warning' = 'success') => {
    triggerHapticFeedback(type);
    triggerVisualFeedback(type);
  }, [triggerVisualFeedback]);

  // Validação padrão para modo de devolução
  const defaultReturnValidation = async (product: any) => {
    if (mode === 'return') {
      if (!loteItems.some(item => item.product_id === product.id)) {
        return {
          valid: false,
          type: 'error' as const,
          message: 'Esse item não faz parte desse lote'
        };
      }

      const loteItem = loteItems.find(item => item.product_id === product.id);
      const returnableQty = loteItem ? loteItem.qty : 0;
      
      if (returnableQty <= 0) {
        return {
          valid: false,
          type: 'warning' as const,
          message: 'Este item já foi totalmente devolvido'
        };
      }

      return {
        valid: true,
        type: 'success' as const,
        message: `Item válido! ${returnableQty} unidade(s) disponível(is) para devolução`
      };
    }

    // Para modos varejo e consignado - verificar estoque
    if (mode === 'varejo' || mode === 'consignado') {
      try {
        // ✅ CORREÇÃO: Usar estoque físico em vez de estoque disponível
        const stockFisico = product.stock || 0;
        
        // Verificar se há estoque suficiente
        if (!stockFisico || stockFisico <= 0) {
          return {
            valid: false,
            type: 'error' as const,
            message: `Produto sem estoque. Estoque atual: ${stockFisico || 0} unidades`
          };
        }

        // Verificar se já existe no carrinho/rascunho
        const alreadyInDraft = getDraftQty ? getDraftQty(product.id) : 0;
        const remainingStock = stockFisico - alreadyInDraft;

        if (remainingStock <= 0) {
          return {
            valid: false,
            type: 'warning' as const,
            message: `Produto já adicionado ao carrinho. Estoque restante: ${remainingStock} unidades`
          };
        }

        return {
          valid: true,
          type: 'success' as const,
          message: `Produto disponível! Estoque: ${stockFisico} unidades, Restante: ${remainingStock} unidades`
        };
      } catch (error) {
        console.error('Erro ao verificar estoque:', error);
        return {
          valid: false,
          type: 'error' as const,
          message: 'Erro ao verificar estoque do produto'
        };
      }
    }

    return { valid: true, type: 'success' as const, message: 'Item válido!' };
  };

  // Adicionar debounce para otimização de performance
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };
  
  // Callback para código detectado com feedback e debounce otimizado - ESTÁVEL
  const handleCodeDetected = useCallback(async (code: string) => {
    // Prevenir múltiplas detecções muito rápidas - otimizado para mobile
    const now = Date.now();
    const minInterval = isMobile ? 1500 : 1000; // Intervalo maior em mobile
    if (now - lastScanTime < minInterval) return;
    setLastScanTime(now);
    
    setIsProcessing(true);
    
    try {
      console.log('[ResponsiveScannerSheet] 🔍 Código detectado:', code);
      
      // Se tem callback customizado, usar ele (prioridade) - ISOLADO do HUD global
      if (onCodeDetected) {
        await onCodeDetected(code);
        triggerFeedback('success');
        return;
      }

      if (getProductByCode) {
        // Buscar produto com timeout otimizado para mobile - SEM afetar currentItem global
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na busca do produto')), isMobile ? 8000 : 5000)
        );
        
        const product = await Promise.race([
          getProductByCode(code),
          timeoutPromise
        ]);
        
        if (!product) {
          triggerFeedback('error');
          toast({
            title: "❌ Produto não encontrado",
            description: `Código: ${code}`,
            variant: "destructive"
          });
          return;
        }

        // Validar produto se função de validação foi fornecida
        const validation = validateProduct ? await validateProduct(product) : await defaultReturnValidation(product);
        
        if (!validation.valid) {
          triggerFeedback(validation.type === 'warning' ? 'warning' : 'error');
          toast({
            title: validation.type === 'warning' ? "⚠️ Aviso" : "❌ Erro",
            description: validation.message,
            variant: validation.type === 'warning' ? "default" : "destructive"
          });
          return;
        }
        
        // Produto válido - feedback de sucesso - NÃO atualizar HUD global
        triggerFeedback('success');
        toast({
          title: "✅ Produto encontrado",
          description: validation.message,
          duration: 1000, // 1 segundo para fechar rapidamente
        });

        // Se já existe um item pendente com o mesmo código, incrementar
        if (pendingItemHook.pendingItem?.code === code) {
          pendingItemHook.incrementPending();
          return;
        }

        // Se existe um item pendente diferente, mostrar aviso
        if (pendingItemHook.pendingItem) {
          triggerFeedback('warning');
          toast({
            title: "⚠️ Item pendente",
            description: "Confirme ou cancele o item atual antes de escanear outro",
            variant: "default"
          });
          return;
        }

        // Criar novo item pendente
        const available = getAvailableStock ? await getAvailableStock(product.id) : 999;
        const alreadyInDraft = getDraftQty ? getDraftQty(product.id) : 0;
        
        // Garantir que available seja um número válido
        const validAvailable = isNaN(available) ? 0 : available;
        const validAlreadyInDraft = isNaN(alreadyInDraft) ? 0 : alreadyInDraft;
        
        const pendingData: PendingItem = {
          productId: product.id,
          name: product.name,
          code: code,
          price: (product.price_cents || 0) / 100,
          priceCents: product.price_cents || 0,
          available: validAvailable,
          alreadyInDraft: validAlreadyInDraft,
          toAddQty: 1
        };

        setPending(pendingData);

      } else {
        // Fallback - apenas feedback de sucesso
        triggerFeedback('success');
        toast({
          title: "✅ Código detectado",
          description: code,
          duration: 1000, // 1 segundo para fechar rapidamente
        });
      }

    } catch (error: any) {
      triggerFeedback('error');
      toast({
        title: "❌ Erro ao processar código",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isMobile, lastScanTime, onCodeDetected, getProductByCode, validateProduct, getAvailableStock, getDraftQty, triggerFeedback, toast, setPending, pendingItemHook.pendingItem, pendingItemHook.incrementPending]);
  
  // Debounced version para otimização - ESTÁVEL
  const debouncedHandleCodeDetected = useMemo(() => 
    debounce(handleCodeDetected, isMobile ? 300 : 200), 
    [handleCodeDetected, isMobile]
  );

  // Função para buscar produtos por nome ou código
  const searchProducts = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    // ✅ CORREÇÃO: Para modo consignado, usar apenas produtos da folha
    let productsToSearch = products;
    if (mode === 'consignado' && folhaProducts && folhaProducts.length > 0) {
      // Buscar produtos da folha usando os IDs
      const folhaProductIds = folhaProducts.map(p => p.product_id);
      productsToSearch = products.filter(product => folhaProductIds.includes(product.id));
    }
    
    const results = productsToSearch.filter(product => 
      product.name.toLowerCase().includes(term) ||
      product.short_code.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    ).slice(0, 5); // Máximo 5 resultados

    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, [products, mode, folhaProducts]);

  // Função para selecionar um produto dos resultados
  const selectProduct = useCallback(async (product: any) => {
    setManualCode(product.short_code);
    setShowSearchResults(false);
    setSearchResults([]);
    
    // Verificar estoque antes de processar
    try {
      const availableStock = getAvailableStock ? await getAvailableStock(product.id) : product.stock || 0;
      
      if (!availableStock || availableStock <= 0) {
        toast({
          title: "❌ Produto sem estoque",
          description: `${product.name} - Estoque atual: ${availableStock || 0} unidades`,
          variant: "destructive",
          duration: 3000
        });
        // Limpar entrada manual mesmo com erro
        setManualCode('');
        setShowManualInput(false);
        return;
      }

      // Verificar se já existe no carrinho/rascunho
      const alreadyInDraft = getDraftQty ? getDraftQty(product.id) : 0;
      const remainingStock = availableStock - alreadyInDraft;

      if (remainingStock <= 0) {
        toast({
          title: "⚠️ Produto já adicionado",
          description: `${product.name} - Estoque restante: ${remainingStock} unidades`,
          variant: "default",
          duration: 3000
        });
        // Limpar entrada manual mesmo com aviso
        setManualCode('');
        setShowManualInput(false);
        return;
      }

      // Processar o produto selecionado
      await handleCodeDetected(product.short_code);
      setManualCode('');
      setShowManualInput(false);
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      toast({
        title: "❌ Erro ao verificar estoque",
        description: "Não foi possível verificar o estoque do produto",
        variant: "destructive",
        duration: 3000
      });
      // Limpar entrada manual mesmo com erro
      setManualCode('');
      setShowManualInput(false);
    }
  }, [handleCodeDetected, getAvailableStock, getDraftQty, toast]);

  // Processar código manual
  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    
    // Primeiro tentar buscar por código exato
    const product = findProductByCode(manualCode.trim());
    if (product) {
      await handleCodeDetected(manualCode.trim());
      setManualCode('');
      setShowManualInput(false);
      setShowSearchResults(false);
      setSearchResults([]);
    } else {
      // Se não encontrar por código, fazer busca por nome
      searchProducts(manualCode.trim());
      // Não limpar o campo aqui para permitir busca por nome
    }
  };

  // Inicializar scanner
  useEffect(() => {
    if (!open) return;

    const initScanner = async () => {
      try {
        await ScannerEngine.open();
        
        const videoElement = ScannerEngine.getVideoElement();
        if (videoElement && videoRef.current) {
          // Limpar srcObject anterior para evitar AbortError
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
            await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa
          }
          
          videoRef.current.srcObject = videoElement.srcObject;
          
          // Otimizações de vídeo para mobile
          if (isMobile) {
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            videoRef.current.muted = true;
          }
          
          // Aguardar o vídeo estar pronto antes de tentar reproduzir
          await new Promise((resolve, reject) => {
            const handleLoadedData = () => {
              videoRef.current?.removeEventListener('loadeddata', handleLoadedData);
              videoRef.current?.removeEventListener('error', handleError);
              resolve(void 0);
            };
            
            const handleError = (error: Event) => {
              videoRef.current?.removeEventListener('loadeddata', handleLoadedData);
              videoRef.current?.removeEventListener('error', handleError);
              reject(error);
            };
            
            if (videoRef.current?.readyState >= 2) {
              // Vídeo já está pronto
              resolve(void 0);
            } else {
              videoRef.current?.addEventListener('loadeddata', handleLoadedData);
              videoRef.current?.addEventListener('error', handleError);
            }
          });
          
          // Tentar reproduzir o vídeo com tratamento de erro
          try {
            await videoRef.current.play();
          } catch (playError: any) {
            if (playError.name === 'AbortError') {
              console.log('[Scanner] Play interrompido, tentando novamente...');
              await new Promise(resolve => setTimeout(resolve, 200));
              await videoRef.current.play();
            } else {
              throw playError;
            }
          }
        }

        // Usar versão debounced em mobile para melhor performance
        await ScannerEngine.startDetect(isMobile ? debouncedHandleCodeDetected : handleCodeDetected);
        setIsScanning(true);
        
        setTorchSupported(ScannerEngine.getTorchSupported());
        setTorchOn(ScannerEngine.getTorchState());

      } catch (error: any) {
        console.error('Erro ao inicializar scanner:', error);
        toast({
          title: "❌ Erro na câmera",
          description: error.message || "Não foi possível acessar a câmera",
          variant: "destructive"
        });
      }
    };

    initScanner();

    return () => {
      // Limpeza adequada dos recursos
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      
      ScannerEngine.close();
      setIsScanning(false);
    };
  }, [open, isMobile]); // Removidas dependências desnecessárias que causavam o flicker

  // Controle do torch - ESTÁVEL
  const toggleTorch = useCallback(async () => {
    try {
      await ScannerEngine.toggleTorch();
      setTorchOn(ScannerEngine.getTorchState());
    } catch (error) {
      console.warn('Erro ao alternar flash:', error);
    }
  }, []);

  // Fechar scanner
  const handleClose = () => {
    cancelPending();
    setValidationMessage(null);
    onOpenChange(false);
  };

  // Calcular dimensões responsivas da ROI
  const getROIDimensions = () => {
    if (isMobile) {
      if (deviceOrientation === 'landscape') {
        return {
          size: 'min(50vh, 40vw)',
          topOffset: 'calc(-1 * min(50vh, 40vw) / 2 - 2rem)'
        };
      } else {
        return {
          size: 'min(65vw, 45vh)',
          topOffset: 'calc(-1 * min(65vw, 45vh) / 2 - 2.5rem)'
        };
      }
    } else {
      return {
        size: 'min(50vw, 60vh)',
        topOffset: 'calc(-1 * min(50vw, 60vh) / 2 - 3rem)'
      };
    }
  };

  const roiDimensions = getROIDimensions();

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className={`${isMobile ? 'h-[100vh]' : 'h-[90vh]'} p-0 max-w-none overflow-hidden [&>button]:hidden`}
      >
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
          {/* Header Premium com gradiente dourado */}
          <SheetHeader className={`${isMobile ? 'p-4' : 'p-6'} bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 shadow-2xl relative overflow-hidden`}>
            {/* Efeito de brilho sutil */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <SheetTitle className="text-white flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="p-2 bg-white/20 rounded-xl backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-300"
                >
                  <X className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </Button>
                <div className="flex flex-col">
                  <span className={`${isMobile ? 'text-base' : 'text-lg'} font-bold tracking-wide`}>{title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    {isMobile && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full">
                        <Smartphone className="h-3 w-3 text-amber-100" />
                        <span className="text-xs font-medium text-amber-100">Mobile</span>
                      </div>
                    )}
                    {!isMobile && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full">
                        <Monitor className="h-3 w-3 text-amber-100" />
                        <span className="text-xs font-medium text-amber-100">Desktop</span>
                      </div>
                    )}
                  </div>
                </div>
              </SheetTitle>
            </div>
            <p className={`text-amber-50 ${isMobile ? 'text-sm' : 'text-base'} font-medium mt-2 relative z-10 flex items-center gap-2`}>
              <Zap className="h-4 w-4 text-amber-200" />
              {subtitle}
            </p>
          </SheetHeader>

          {/* Área do scanner com overlay premium */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover transition-opacity duration-300"
              playsInline
              muted
              style={{
                willChange: 'auto',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)'
              }}
            />
            
            {/* Overlay com gradiente sutil */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
            
            {/* ROI Overlay Premium */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Instrução premium acima da área de scan */}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2" 
                style={{ top: roiDimensions.topOffset }}
              >
                <div className={`text-white text-center ${isMobile ? 'text-sm' : 'text-base'} bg-gradient-to-r from-amber-500/90 to-yellow-500/90 px-4 py-2 rounded-2xl backdrop-blur-md shadow-2xl border border-amber-300/30 font-semibold`}>
                  <div className="flex items-center gap-2 justify-center">
                    <Scan className="h-4 w-4 text-amber-100 animate-pulse" />
                    <span>Centralize o código aqui</span>
                  </div>
                </div>
              </div>
              
              {/* ROI Premium com animações fluidas */}
              <div className="relative w-full max-w-sm">
                {/* Área transparente com bordas premium */}
                <div 
                  ref={roiRef}
                  className={`w-full aspect-square max-w-64 border-2 rounded-2xl bg-transparent mx-auto transition-all duration-500 ${
                    isProcessing ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-pulse' : 'border-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  }`}
                  style={{
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
                  }}
                />
                
                {/* Cantos animados premium com gradiente */}
                <div className={`absolute -top-2 -left-2 w-8 h-8 sm:w-10 sm:h-10 border-l-4 border-t-4 rounded-tl-2xl transition-all duration-300 ${
                  isProcessing ? 'border-amber-400 animate-pulse' : 'border-white'
                }`} />
                <div className={`absolute -top-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 border-r-4 border-t-4 rounded-tr-2xl transition-all duration-300 ${
                  isProcessing ? 'border-amber-400 animate-pulse' : 'border-white'
                }`} />
                <div className={`absolute -bottom-2 -left-2 w-8 h-8 sm:w-10 sm:h-10 border-l-4 border-b-4 rounded-bl-2xl transition-all duration-300 ${
                  isProcessing ? 'border-amber-400 animate-pulse' : 'border-white'
                }`} />
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 border-r-4 border-b-4 rounded-br-2xl transition-all duration-300 ${
                  isProcessing ? 'border-amber-400 animate-pulse' : 'border-white'
                }`} />
                
                {/* Linha de varredura premium com gradiente */}
                <div className={`absolute inset-x-4 top-1/2 h-1 rounded-full transition-all duration-500 ${
                  isProcessing ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-ping shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-gradient-to-r from-transparent via-white to-transparent animate-pulse'
                }`} />
                
                {/* Indicador de processamento premium */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 backdrop-blur-md rounded-2xl p-4 animate-pulse shadow-2xl border border-amber-300/30">
                      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin shadow-lg" />
                    </div>
                  </div>
                )}
                
                {/* Efeito de brilho nos cantos */}
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-gradient-to-br from-white/40 to-transparent rounded-full animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-bl from-white/40 to-transparent rounded-full animate-pulse" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-tr from-white/40 to-transparent rounded-full animate-pulse" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-tl from-white/40 to-transparent rounded-full animate-pulse" />
              </div>
            </div>

            {/* Mensagem de validação responsiva premium */}
            {validationMessage && (
              <div className={`absolute ${isMobile ? 'top-16 left-2 right-2' : 'top-20 left-4 right-4'} z-20`}>
                <Card className={`border-2 backdrop-blur-md shadow-2xl transition-all duration-500 transform animate-in slide-in-from-top-2 ${
                  validationMessage.type === 'error' ? 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-400/60 shadow-red-500/20' :
                  validationMessage.type === 'warning' ? 'bg-gradient-to-r from-yellow-900/95 to-amber-800/95 border-amber-400/60 shadow-amber-500/20' :
                  'bg-gradient-to-r from-green-900/95 to-emerald-800/95 border-emerald-400/60 shadow-emerald-500/20'
                }`}>
                  <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className="flex items-center gap-3 text-white">
                      <div className={`p-1 rounded-full ${
                        validationMessage.type === 'error' ? 'bg-red-500/30' :
                        validationMessage.type === 'warning' ? 'bg-amber-500/30' :
                        'bg-emerald-500/30'
                      }`}>
                        {validationMessage.type === 'error' && <XCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-300`} />}
                        {validationMessage.type === 'warning' && <AlertTriangle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-amber-300`} />}
                        {validationMessage.type === 'success' && <Check className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-emerald-300`} />}
                      </div>
                      <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}>{validationMessage.message}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Item pendente premium com animações fluidas */}
            {hasPending && pendingItem && (
              <div className={`absolute ${isMobile ? 'bottom-16 left-2 right-2' : 'bottom-20 left-4 right-4'} z-20`}>
                <Card className="bg-gradient-to-r from-amber-900/95 to-yellow-900/95 border-2 border-amber-400/60 shadow-2xl backdrop-blur-md transform animate-in slide-in-from-bottom-2 transition-all duration-500">
                  <CardContent className={`${isMobile ? 'p-4' : 'p-5'}`}>
                    <div className="text-white space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500/30 rounded-xl">
                          <Scan className="h-5 w-5 text-amber-200" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} text-amber-50 leading-tight`}>{pendingItem.name}</h3>
                          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-amber-200/90 font-medium mt-1`}>
                            Código: <span className="text-amber-100">{pendingItem.code}</span> • Disponível: <span className="text-amber-100">{pendingItem.available}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-amber-800/30 rounded-2xl p-3 border border-amber-600/30">
                        <div className="flex items-center gap-3">
                          <Button
                            size={isMobile ? "sm" : "default"}
                            variant="outline"
                            onClick={decrementPending}
                            disabled={!canDecrement}
                            className="bg-white/20 border-white/40 text-white hover:bg-white/30 disabled:opacity-40 transition-all duration-300 hover:scale-110 shadow-lg rounded-xl"
                          >
                            <Minus className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                          </Button>
                          <div className="bg-gradient-to-r from-amber-600/50 to-yellow-600/50 px-4 py-2 rounded-xl border border-amber-400/30 flex items-center justify-center">
                            <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold min-w-[2rem] text-center text-amber-50`}>
                              {pendingItem.toAddQty}
                            </span>
                          </div>
                          <Button
                            size={isMobile ? "sm" : "default"}
                            variant="outline"
                            onClick={incrementPending}
                            disabled={!canIncrement}
                            className="bg-white/20 border-white/40 text-white hover:bg-white/30 disabled:opacity-40 transition-all duration-300 hover:scale-110 shadow-lg rounded-xl"
                          >
                            <Plus className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                          </Button>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button
                            size={isMobile ? "sm" : "default"}
                            variant="outline"
                            onClick={cancelPending}
                            className="bg-red-600/40 border-red-400/60 text-red-100 hover:bg-red-600/60 transition-all duration-300 hover:scale-110 shadow-lg rounded-xl"
                          >
                            <Slash className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} ${!isMobile ? 'mr-2' : ''}`} />
                            {!isMobile && 'Cancelar'}
                          </Button>
                          <Button
                            size={isMobile ? "sm" : "default"}
                            onClick={confirmPending}
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 transition-all duration-300 hover:scale-110 shadow-lg rounded-xl border border-emerald-400/30"
                          >
                            <Check className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'} ${!isMobile ? 'mr-2' : ''}`} />
                            {!isMobile && 'Confirmar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Controles inferiores premium - sempre visíveis */}
            <div className={`absolute bottom-0 left-0 right-0 z-30 ${isMobile ? 'p-4' : 'p-6'} bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-none`}>
              <div className={`flex justify-center items-center ${isMobile ? 'gap-4' : 'gap-6'} pointer-events-auto`}>
                {torchSupported && (
                  <Button
                    variant="outline"
                    size={isMobile ? "default" : "lg"}
                    onClick={toggleTorch}
                    className={`${
                      torchOn 
                        ? 'bg-gradient-to-r from-yellow-600/50 to-amber-600/50 border-yellow-400/60 text-yellow-100 shadow-yellow-500/30' 
                        : 'bg-gradient-to-r from-amber-900/90 to-yellow-900/90 border-amber-400/60 text-amber-50 shadow-amber-500/30'
                    } hover:from-amber-800/90 hover:to-yellow-800/90 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 rounded-2xl border-2 ${isMobile ? 'min-w-[56px] h-12' : 'min-w-[64px] h-14'} flex-shrink-0`}
                  >
                    <div className="flex items-center gap-2">
                      {torchOn ? 
                        <FlashlightOff className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} /> : 
                        <Flashlight className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                      }
                      {!isMobile && (
                        <span className="font-semibold text-sm">
                          {torchOn ? 'Desligar' : 'Flash'}
                        </span>
                      )}
                    </div>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "lg"}
                  onClick={() => setShowManualInput(true)}
                  className={`bg-gradient-to-r from-amber-900/90 to-yellow-900/90 border-amber-400/60 text-amber-50 hover:from-amber-800/90 hover:to-yellow-800/90 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 rounded-2xl border-2 shadow-amber-500/30 ${isMobile ? 'min-w-[56px] h-12' : 'min-w-[64px] h-14'} flex-shrink-0`}
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                    {!isMobile && (
                      <span className="font-semibold text-sm">Manual</span>
                    )}
                  </div>
                </Button>

                {/* Botão de fechar - sempre visível */}
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "lg"}
                  onClick={() => onOpenChange(false)}
                  className={`bg-gradient-to-r from-red-900/90 to-rose-900/90 border-red-400/60 text-red-50 hover:from-red-800/90 hover:to-rose-800/90 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 rounded-2xl border-2 shadow-red-500/30 ${isMobile ? 'min-w-[56px] h-12' : 'min-w-[64px] h-14'} flex-shrink-0`}
                >
                  <div className="flex items-center gap-2">
                    <X className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                    {!isMobile && (
                      <span className="font-semibold text-sm">Fechar</span>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Input manual premium - sempre visível quando ativo */}
          {showManualInput && (
            <div className={`absolute ${isMobile ? 'bottom-20 left-3 right-3' : 'bottom-24 left-6 right-6'} z-40`}>
              <Card className="bg-gradient-to-r from-amber-900/95 to-yellow-900/95 border-2 border-amber-400/60 shadow-2xl backdrop-blur-md transform animate-in slide-in-from-bottom-2 transition-all duration-500">
                <CardContent className={`${isMobile ? 'p-4' : 'p-5'}`}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-amber-500/30 rounded-xl">
                        <Keyboard className="h-5 w-5 text-amber-200" />
                      </div>
                      <div>
                        <h3 className="text-amber-50 font-bold text-base">Entrada Manual</h3>
                        <p className="text-amber-200/80 text-sm">Digite o código ou nome do produto</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-amber-800/30 rounded-2xl p-3 border border-amber-600/30">
                      <Input
                        value={manualCode}
                        onChange={(e) => {
                          setManualCode(e.target.value);
                          // Busca em tempo real conforme digita
                          if (e.target.value.length >= 2) {
                            searchProducts(e.target.value);
                          } else {
                            setShowSearchResults(false);
                            setSearchResults([]);
                          }
                        }}
                        placeholder="Código ou nome do produto..."
                        className={`flex-1 bg-white/95 border-2 border-amber-300/50 text-gray-900 placeholder:text-gray-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 ${isMobile ? 'text-base' : 'text-lg'} shadow-lg rounded-xl font-medium`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleManualSubmit(e);
                          }
                        }}
                      />
                      <Button
                        size={isMobile ? "default" : "lg"}
                        onClick={handleManualSubmit}
                        disabled={!manualCode.trim()}
                        className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg transition-all duration-300 hover:scale-110 rounded-xl border border-emerald-400/30 disabled:opacity-40"
                      >
                        <Check className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'} ${!isMobile ? 'mr-2' : ''}`} />
                        {!isMobile && 'Confirmar'}
                      </Button>
                      <Button
                        size={isMobile ? "default" : "lg"}
                        variant="outline"
                        onClick={() => {
                          setShowManualInput(false);
                          setManualCode('');
                        }}
                        className="bg-red-600/40 border-red-400/60 text-red-100 hover:bg-red-600/60 shadow-lg transition-all duration-300 hover:scale-110 rounded-xl"
                      >
                        <ChevronDown className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'} ${!isMobile ? 'mr-2' : ''}`} />
                        {!isMobile && 'Fechar'}
                      </Button>
                    </div>

                    {/* Resultados da busca */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="bg-amber-800/20 rounded-xl border border-amber-600/30 max-h-48 overflow-y-auto">
                        <div className="p-3 border-b border-amber-600/30">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-amber-300" />
                            <span className="text-amber-200 text-sm font-medium">
                              {searchResults.length} produto{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 p-2">
                          {searchResults.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => selectProduct(product)}
                              className="w-full text-left p-3 rounded-lg bg-amber-700/30 hover:bg-amber-600/40 transition-colors duration-200 border border-amber-600/20"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-amber-50 font-medium text-sm truncate">
                                    {product.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-amber-300 text-xs">
                                      Código: {product.short_code}
                                    </span>
                                    <span className="text-amber-300 text-xs">
                                      R$ {(product.price_cents / 100).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <Check className="h-4 w-4 text-amber-300 ml-2" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-amber-200 text-center font-medium`}>
                    Digite o código ou nome e pressione Enter ou clique em buscar
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}