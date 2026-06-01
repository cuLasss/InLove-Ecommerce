import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRetailSaleStore } from '@/stores/retailSaleStore';
import { useStockQuery } from '@/hooks/useStockQuery';
import { useProducts } from '@/hooks/useProducts';
import { useConsignadoReservas } from '@/hooks/useConsignadoReservas';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Search } from 'lucide-react';
import { ProductSelectionDialog } from '@/components/ui/product-selection-dialog';

interface ManualProductEntryProps {
  disabled?: boolean;
  placeholder?: string;
  onOpenSelectionDialog?: () => void; // Callback para quando o modal de seleção abrir
}

export function ManualProductEntry({ 
  disabled = false, 
  placeholder = "Digite código reduzido, ID ou QR...",
  onOpenSelectionDialog
}: ManualProductEntryProps) {
  const [manualCode, setManualCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [foundProducts, setFoundProducts] = useState<any[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const { findProductByCode, findProductsByCode, products } = useProducts();
  const { addOrIncrementItem, items } = useRetailSaleStore();
  const { getAvailableStock } = useStockQuery();
  const { data: reservasData } = useConsignadoReservas();

  // Auto-focus quando o componente é montado
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Buscar sugestões baseadas no texto digitado
  const suggestions = useMemo(() => {
    if (!manualCode.trim() || manualCode.length < 2) {
      return [];
    }

    const searchTerm = manualCode.toLowerCase().trim();
    const filtered = products.filter(product => {
      // Buscar por nome
      if (product.name.toLowerCase().includes(searchTerm)) return true;
      
      // Buscar por código
      if (product.short_code.toLowerCase().includes(searchTerm)) return true;
      
      // Buscar por ID
      if (product.id.toLowerCase().includes(searchTerm)) return true;
      
      // Buscar por marca
      if (product.brand && product.brand.toLowerCase().includes(searchTerm)) return true;
      
      return false;
    });

    // Ordenar por relevância (nome primeiro, depois código)
    return filtered.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(searchTerm);
      const bNameMatch = b.name.toLowerCase().includes(searchTerm);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      return a.name.localeCompare(b.name);
    }).slice(0, 5); // Limitar a 5 sugestões
  }, [manualCode, products]);

  // Mostrar/ocultar sugestões baseado no texto
  useEffect(() => {
    if (suggestions.length > 0 && manualCode.trim().length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [suggestions, manualCode]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K para focar o input
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Esc para limpar o input se estiver focado
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        e.preventDefault();
        setManualCode("");
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAdd = async () => {
    if (!manualCode.trim() || disabled) return;
    
    setIsLoading(true);
    
    try {
      const code = manualCode.trim();
      
      // Primeiro, tentar encontrar produtos múltiplos
      const foundProducts = findProductsByCode(code);
      
      if (foundProducts.length === 0) {
        toast({
          title: "❌ Código não reconhecido",
          description: code,
          variant: "destructive",
          duration: 5000, // 5 segundos para ler o erro
        });
        inputRef.current?.select();
        return;
      }
      
      // Se encontrou apenas um produto, adicionar diretamente
      if (foundProducts.length === 1) {
        const product = foundProducts[0];
        await addProductToCart(product);
        setManualCode("");
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
      
      // Se encontrou múltiplos produtos, mostrar diálogo de seleção
      console.log('🔍 [ManualProductEntry] Múltiplos produtos encontrados:', foundProducts.length);
      
      // Fechar qualquer Sheet (scanner) que esteja aberto antes de abrir o modal
      // Isso é importante para evitar conflitos de z-index
      const closeSheets = () => {
        // Procurar por qualquer Sheet aberto e fechar
        const sheets = document.querySelectorAll('[data-radix-dialog-content]');
        sheets.forEach((sheet) => {
          const el = sheet as HTMLElement;
          // Se não é nosso modal de seleção, pode ser um Sheet que precisa ser fechado
          if (!el.classList.contains('product-selection-dialog-content')) {
            // Verificar se é um Sheet (geralmente tem side="bottom" ou outras características)
            const isSheet = el.classList.toString().includes('inset') || 
                           el.getAttribute('data-side') || 
                           window.getComputedStyle(el).position === 'fixed';
            if (isSheet) {
              // Não fechar programaticamente, apenas garantir que nosso modal terá z-index maior
              console.log('⚠️ [ManualProductEntry] Sheet detectado, modal terá z-index maior');
            }
          }
        });
      };
      
      closeSheets();
      
      // Notificar o componente pai que o modal de seleção está abrindo
      // Isso permite fechar o scanner se estiver aberto
      if (onOpenSelectionDialog) {
        onOpenSelectionDialog();
      }
      
      setFoundProducts(foundProducts);
      setCurrentSearchTerm(code);
      setShowSelectionDialog(true);
      console.log('✅ [ManualProductEntry] Modal de seleção aberto');
      
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast({
        title: "❌ Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
        duration: 5000, // 5 segundos para ler o erro
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addProductToCart = async (product: any) => {
    // Verificar estoque disponível
    const availableServer = await getAvailableStock(product.id);
    const currentQty = items.find(item => item.product_id === product.id)?.qty || 0;
    const availableSession = Math.max(0, availableServer - currentQty);

    console.log(`[ManualProductEntry] Verificação de estoque para ${product.name}:`);
    console.log(`- Estoque no servidor: ${availableServer}`);
    console.log(`- Quantidade atual no carrinho: ${currentQty}`);
    console.log(`- Estoque disponível na sessão: ${availableSession}`);

    if (availableSession <= 0) {
      toast({
        title: "❌ Sem estoque disponível",
        description: `${product.name} (${availableServer} disponível, ${currentQty} no carrinho)`,
        variant: "destructive",
        duration: 5000, // 5 segundos para ler o erro
      });
      return;
    }

    // Adicionar produto ao carrinho
    addOrIncrementItem(product, availableServer);
    
    // UX/feedbacks
    navigator.vibrate?.(30);
    toast({
      title: "✅ Produto adicionado",
      description: product.name,
      duration: 1000, // 1 segundo para sucesso (muito curto)
    });
    
    // Manter foco para próxima entrada
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleProductSelect = async (product: any) => {
    await addProductToCart(product);
    setManualCode("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Se há uma sugestão selecionada, usar ela
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        const selectedProduct = suggestions[selectedSuggestionIndex];
        setManualCode(selectedProduct.short_code);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        // Adicionar o produto selecionado
        setTimeout(() => handleAdd(), 100);
      } else {
        handleAdd();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      }
    }
  };

  const handleSuggestionClick = (product: any) => {
    setManualCode(product.short_code);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Adicionar o produto selecionado
    setTimeout(() => handleAdd(), 100);
  };

  return (
    <>
      <style>{`
        .manual-entry-container {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          position: relative !important;
        }
        
        /* Garantir que as sugestões apareçam acima de tudo */
        .manual-entry-container > div[class*="Card"] {
          z-index: 9997 !important;
          position: absolute !important;
        }
        
        .manual-entry-help-text {
          font-size: 10px !important;
          line-height: 1.4 !important;
          word-wrap: break-word !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          hyphens: auto !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        
        .manual-entry-help-text span {
          display: inline-block !important;
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: anywhere !important;
        }
        
        @media (min-width: 375px) {
          .manual-entry-help-text {
            font-size: 11px !important;
          }
        }
        
        @media (min-width: 640px) {
          .manual-entry-help-text {
            font-size: 12px !important;
            line-height: 1.5 !important;
          }
        }
        
        .manual-entry-button-text {
          display: none !important;
        }
        
        @media (min-width: 375px) {
          .manual-entry-button-text {
            display: inline !important;
          }
        }
        
        .manual-entry-button-text-mobile {
          display: inline !important;
        }
        
        @media (min-width: 375px) {
          .manual-entry-button-text-mobile {
            display: none !important;
          }
        }
      `}</style>
      <div className="space-y-2 min-w-0 w-full max-w-full manual-entry-container" style={{ position: 'relative', overflow: 'visible' }}>
        <div className="relative min-w-0 w-full max-w-full py-1 pl-1" style={{ zIndex: 1 }}>
          <div className="flex gap-2 sm:gap-2.5 min-w-0 w-full max-w-full items-center">
          <Input
            ref={inputRef}
            id="manual-code"
            placeholder={placeholder}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
              className="flex-1 min-w-0 max-w-full h-10"
          />
          <Button 
            id="btn-add-code"
            onClick={handleAdd}
            disabled={!manualCode.trim() || isLoading || disabled}
            size="sm"
              className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
          >
              <span className="manual-entry-button-text">{isLoading ? "..." : "Adicionar"}</span>
              <span className="manual-entry-button-text-mobile">{isLoading ? "..." : "Add"}</span>
          </Button>
        </div>
        
        {/* Sugestões - z-index muito alto para aparecer acima de tudo, exceto do modal de seleção */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              zIndex: 9997,
            }}
          >
          <Card 
            ref={suggestionsRef}
              className="max-h-60 overflow-y-auto shadow-2xl border-2 border-slate-300 rounded-lg bg-white w-full"
              style={{
                zIndex: 9997,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                backgroundColor: 'white',
              }}
          >
            <CardContent className="p-0">
              {suggestions.map((product, index) => {
                const currentQty = items.find(item => item.product_id === product.id)?.qty || 0;
                // CORREÇÃO: Calcular estoque disponível considerando unidades consignadas
                const stockFisico = product.stock || 0;
                const reserva = reservasData?.reservas?.find(r => r.product_id === product.id);
                const unidadesEmConsignacao = reserva?.total_reservado || 0;
                const estoqueDisponivel = Math.max(0, stockFisico - unidadesEmConsignacao);
                const availableStock = Math.max(0, estoqueDisponivel - currentQty);
                const isOutOfStock = availableStock <= 0;
                
                return (
                  <div
                    key={product.id}
                    className={`p-3 border-b last:border-b-0 transition-all duration-200 ${
                      isOutOfStock 
                        ? 'cursor-not-allowed opacity-60 bg-red-50' 
                        : 'cursor-pointer hover:bg-slate-50'
                    } ${
                      index === selectedSuggestionIndex ? 'bg-slate-100' : ''
                    }`}
                    onClick={() => !isOutOfStock && handleSuggestionClick(product)}
                  >
                    <div className="flex items-center gap-3">
                      <Package className={`h-4 w-4 ${isOutOfStock ? 'text-red-400' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isOutOfStock ? 'text-red-600' : ''}`}>
                          {product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {product.short_code} • {product.brand} • {product.size}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            R$ {(product.price_cents / 100).toFixed(2)}
                          </span>
                          <span className={`font-medium ${
                            isOutOfStock 
                              ? 'text-red-600' 
                              : availableStock <= 5 
                                ? 'text-orange-600' 
                                : 'text-green-600'
                          }`}>
                            Disponível: {availableStock}
                            {currentQty > 0 && ` (${currentQty} no carrinho)`}
                          </span>
                          {isOutOfStock && (
                            <span className="text-red-600 font-medium">• Sem estoque</span>
                          )}
                        </div>
                      </div>
                      <Search className={`h-4 w-4 ${isOutOfStock ? 'text-red-400' : 'text-muted-foreground'}`} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          </div>
        )}
      </div>
      
      <div className="space-y-0.5 min-w-0 w-full max-w-full">
        <p className="manual-entry-help-text text-muted-foreground">
          <span className="hidden sm:inline">💡 </span>
          <span className="inline">Atalhos: </span>
          <span className="inline sm:inline">Ctrl+K | Enter | Esc</span>
          <span className="hidden sm:inline"> (focar | adicionar | limpar)</span>
      </p>
        <p className="manual-entry-help-text text-muted-foreground opacity-75">
          <span className="inline">Suporta: ID, código, EAN, QR</span>
          <span className="hidden sm:inline"> reduzido</span>
          <span className="inline"> • </span>
          <span className="inline">Digite 2+ chars</span>
          <span className="hidden sm:inline"> para buscar</span>
      </p>
      </div>

      {/* Diálogo de seleção de produtos - só renderizar quando houver produtos e estiver aberto */}
      {foundProducts.length > 0 && (
      <ProductSelectionDialog
        open={showSelectionDialog}
          onOpenChange={(open) => {
            console.log('🔍 [ManualProductEntry] Modal onOpenChange:', open, 'Produtos:', foundProducts.length);
            setShowSelectionDialog(open);
            if (!open) {
              // Limpar produtos quando fechar
              setFoundProducts([]);
              setCurrentSearchTerm('');
            }
          }}
        products={foundProducts}
        searchTerm={currentSearchTerm}
        onSelectProduct={handleProductSelect}
      />
      )}
    </div>
    </>
  );
}