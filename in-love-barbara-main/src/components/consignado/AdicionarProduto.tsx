/**
 * Componente: Adicionar Produto à Folha
 * 
 * Este componente permite adicionar produtos a uma folha específica
 * usando código, scanner ou busca por nome.
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  QrCode, 
  Search,
  Package,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { SmartScannerSheet } from '@/components/scan/SmartScannerSheet'
import { useFolhaConsignacao } from '@/hooks/useFolhaConsignacao'
import { useToast } from '@/hooks/use-toast'
import { useStockQuery } from '@/hooks/useStockQuery'

interface AdicionarProdutoProps {
  folhaCodigo: string
  onItemAdded?: (product: any, qty: number) => void
}

export interface DraftItemData {
  product_id: string
  product_name: string
  product_code: string
  qty: number
  preco_base_cents: number
  subtotal_cents: number
  commission_percent: number
}

export function AdicionarProduto({ folhaCodigo, onItemAdded }: AdicionarProdutoProps) {
  const [productCode, setProductCode] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [productStocks, setProductStocks] = useState<Record<string, number>>({})
  const { toast } = useToast()
  const { addItem, isAddingItem } = useFolhaConsignacao({ folhaCodigo })
  const { getAvailableStock } = useStockQuery()

  // Função para buscar produtos por nome
  const searchProducts = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      setProductStocks({})
      return
    }

    try {
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      const filtered = products?.filter((product: any) => 
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        product.short_code?.toLowerCase().includes(term.toLowerCase()) ||
        product.brand?.toLowerCase().includes(term.toLowerCase()) ||
        product.category?.toLowerCase().includes(term.toLowerCase())
      ) || []

      const limitedResults = filtered.slice(0, 10) // Limitar a 10 resultados
      setSearchResults(limitedResults)
      setShowSearchResults(true)
      
      // Buscar estoque disponível para cada produto encontrado
      const stockPromises = limitedResults.map(async (product) => {
        try {
          const availableStock = await getAvailableStock(product.id)
          return { productId: product.id, stock: availableStock }
        } catch (error) {
          console.error(`Erro ao buscar estoque do produto ${product.id}:`, error)
          return { productId: product.id, stock: product.stock || 0 }
        }
      })
      
      const stockResults = await Promise.all(stockPromises)
      const stockMap = stockResults.reduce((acc, { productId, stock }) => {
        acc[productId] = stock
        return acc
      }, {} as Record<string, number>)
      
      setProductStocks(stockMap)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      setSearchResults([])
      setShowSearchResults(false)
      setProductStocks({})
    }
  }

  // Função para selecionar produto da busca
  const selectProduct = async (product: any) => {
    try {
      // ✅ CORREÇÃO: Usar estoque físico em vez de estoque disponível
      const stockFisico = product.stock ?? 0
      
      if (stockFisico < 1) {
        toast({
          title: "❌ Estoque insuficiente",
          description: `${product.name}: Estoque físico ${stockFisico}`,
          variant: "destructive",
          duration: 3000
        })
        return
      }

      // Adicionar ao rascunho
      onItemAdded?.(product, 1)
      
      // Limpar busca
      setSearchTerm('')
      setSearchResults([])
      setShowSearchResults(false)
      setProductStocks({})
      
      toast({
        title: "✅ Produto adicionado ao rascunho",
        description: `${product.name} - 1 unidade adicionada`,
        duration: 1500
      })
      
    } catch (error: any) {
      console.error('Erro ao adicionar produto:', error)
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error.message || "Erro inesperado",
        variant: "destructive",
        duration: 3000
      })
    }
  }

  const handleAddProduct = async () => {
    if (!productCode.trim()) {
      toast({
        title: "❌ Código vazio",
        description: "Digite ou escaneie o código do produto",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      // Buscar produto pelo código direto do universalDataAdapter
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      const product = products?.find((p: any) => 
        p.short_code?.toLowerCase() === productCode.toLowerCase() ||
        p.id === productCode ||
        p.name.toLowerCase().includes(productCode.toLowerCase())
      )
      
      if (!product) {
        throw new Error('product_not_found')
      }

      // ✅ CORREÇÃO: Usar estoque físico em vez de estoque disponível
      const stockFisico = product.stock || 0
      if (stockFisico < 1) {
        throw new Error(`stock_insufficient: Estoque físico: ${stockFisico}, Solicitado: 1`)
      }

      // Adicionar ao rascunho através da callback com quantidade inicial 1
      onItemAdded?.(product, 1)
      setProductCode('')
      
      toast({
        title: "✅ Produto adicionado ao rascunho",
        description: `${product.name} - 1 unidade adicionada`,
      })
      
      // Feedback visual de sucesso
      if (navigator.vibrate) {
        navigator.vibrate(40)
      }
    } catch (error: any) {
      console.error('Erro ao buscar produto:', error)
      
      let errorMessage = 'Erro ao buscar produto'
      if (error.message?.includes('product_not_found')) {
        errorMessage = 'Produto não encontrado'
      } else if (error.message?.includes('stock_insufficient')) {
        errorMessage = `Estoque insuficiente. Disponível: ${error.message.split(':')[1] || ''}`
      }

      toast({
        title: "❌ Erro",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddProduct()
    }
  }

  // Função para buscar produto por código - VERSÃO ROBUSTA
  const getProductByCode = async (code: string) => {
    try {
      console.log(`🔍 [AdicionarProduto] Buscando produto com código: "${code}"`);
      
      const { universalDataAdapter } = await import('@/lib/universal-data-adapter')
      const { data: products } = await universalDataAdapter.getProducts()
      
      if (!products || products.length === 0) {
        console.log(`❌ [AdicionarProduto] Nenhum produto encontrado no sistema`);
        return null;
      }
      
      // Normalizar entrada removendo espaços extras
      const normalizedCode = code.trim();
      console.log(`🔍 [AdicionarProduto] Código normalizado: "${normalizedCode}"`);
      
      // 1. Buscar por short_code exato (prioridade máxima para códigos de barras)
      let product = products.find((p: any) => p.short_code === normalizedCode);
      if (product) {
        console.log(`✅ [AdicionarProduto] Encontrado por short_code: ${product.name}`);
        return product;
      }
      
      // 2. Buscar por QR code completo (prioridade alta para QR codes)
      product = products.find((p: any) => p.qr_code === normalizedCode);
      if (product) {
        console.log(`✅ [AdicionarProduto] Encontrado por QR code: ${product.name}`);
        return product;
      }
      
      // 3. Tentar parse de formato inlove_product:shortCode (formato padrão de QR codes)
      const parts = normalizedCode.split(':');
      if (parts.length === 2 && parts[0] === 'inlove_product') {
        const [, shortCode] = parts;
        console.log(`🔍 [AdicionarProduto] Tentando buscar por short_code extraído: "${shortCode}"`);
        product = products.find((p: any) => p.short_code === shortCode);
        if (product) {
          console.log(`✅ [AdicionarProduto] Encontrado por formato inlove_product: ${product.name}`);
          return product;
        }
      }
      
      // 4. Buscar por ID exato
      product = products.find((p: any) => p.id === normalizedCode);
      if (product) {
        console.log(`✅ [AdicionarProduto] Encontrado por ID: ${product.name}`);
        return product;
      }
      
      // 5. Busca por conteúdo parcial em QR codes (para QR codes customizados)
      if (normalizedCode.length > 10) {
        product = products.find((p: any) =>
          (p.qr_code && p.qr_code.includes(normalizedCode)) ||
          normalizedCode.includes(p.short_code) ||
          normalizedCode.includes(p.id)
        );
        if (product) {
          console.log(`✅ [AdicionarProduto] Encontrado por conteúdo parcial: ${product.name}`);
          return product;
        }
      }
      
      // 6. Busca parcial por nome (case-insensitive) - apenas se código for curto
      if (normalizedCode.length <= 20) {
        const lc = normalizedCode.toLowerCase();
        product = products.find((p: any) =>
          p.name.toLowerCase().includes(lc) ||
          lc.includes(p.name.toLowerCase().substring(0, 5))
        );
        if (product) {
          console.log(`✅ [AdicionarProduto] Encontrado por nome parcial: ${product.name}`);
          return product;
        }
      }
      
      console.log(`❌ [AdicionarProduto] Produto não encontrado para código: "${normalizedCode}"`);
      console.log(`📋 [AdicionarProduto] Produtos disponíveis:`, products.slice(0, 5).map((p: any) => ({ 
        short_code: p.short_code, 
        qr_code: p.qr_code, 
        name: p.name 
      })));
      
      return null;
    } catch (error) {
      console.error('❌ [AdicionarProduto] Erro ao buscar produto:', error);
      return null;
    }
  }


  // Função para confirmar item do scanner
  const handleConfirmItem = async (productId: string, qty: number): Promise<void> => {
    try {
      console.log(`🔍 [AdicionarProduto] Confirmando item do scanner:`, { productId, qty });
      
      // ✅ CORREÇÃO: productId na verdade é o código escaneado, não o ID do produto
      const product = await getProductByCode(productId);
      if (!product) {
        throw new Error(`Produto não encontrado para código: ${productId}`);
      }

      console.log(`✅ [AdicionarProduto] Produto encontrado:`, { 
        id: product.id, 
        name: product.name, 
        short_code: product.short_code 
      });

      // ✅ CORREÇÃO: Usar estoque físico em vez de estoque disponível
      const stockFisico = product.stock || 0;
      if (stockFisico < qty) {
        throw new Error(`Estoque insuficiente. Estoque físico: ${stockFisico}, solicitado: ${qty}`);
      }

      // Adicionar ao rascunho com quantidade solicitada pelo scanner
      onItemAdded?.(product, qty);
      // ✅ CORREÇÃO: NÃO fechar o scanner para permitir adicionar múltiplos itens
      // setScannerOpen(false) // REMOVIDO: Scanner permanece aberto
      
      toast({
        title: "✅ Produto adicionado ao rascunho",
        description: `${product.name} (${qty}x) - pronto para salvar`,
      });
      
      console.log(`✅ [AdicionarProduto] Item adicionado ao rascunho com sucesso`);
    } catch (error: any) {
      console.error('❌ [AdicionarProduto] Erro ao adicionar item:', error);
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error.message || "Erro inesperado",
        variant: "destructive"
      });
    }
  }

  const handleScannerClick = () => {
    setScannerOpen(true)
  }

  return (
    <div className="consignado-adicionar-produto bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-4 md:p-5 lg:p-5 xl:p-6">
      <div className="space-y-4 sm:space-y-4 md:space-y-5 lg:space-y-5 xl:space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-sm sm:text-base md:text-lg lg:text-lg xl:text-xl font-semibold text-slate-900 mb-2 break-words whitespace-normal hyphens-none leading-tight">Adicionar Produto</h2>
          <p className="text-[10px] sm:text-xs md:text-sm text-slate-600 break-words whitespace-normal hyphens-none leading-tight">Digite o código, nome do produto ou use o scanner</p>
        </div>

        {/* Campos de entrada */}
        <div className="space-y-4">
          {/* Campo de busca por nome */}
          <div className="relative consignado-search-input-container">
            <Input
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                searchProducts(e.target.value)
              }}
              disabled={isProcessing || isAddingItem}
              className="consignado-search-input h-11 sm:h-12 text-center text-sm sm:text-base md:text-lg font-medium bg-slate-50 border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl w-full"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400 pointer-events-none" />
          </div>

          {/* Campo de código */}
          <div className="relative consignado-code-input-container">
            <Input
              placeholder="Ex: IL00001"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing || isAddingItem}
              className="consignado-code-input h-11 sm:h-12 text-center text-sm sm:text-base md:text-lg font-medium bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl w-full"
            />
          </div>

          {/* Resultados da busca */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => selectProduct(product)}
                  className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-sm text-slate-500">
                        Código: {product.short_code || product.id.slice(-8)}
                        {product.brand && ` • ${product.brand}`}
                        {product.category && ` • ${product.category}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        R$ {(product.price_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Estoque: {product.stock ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mensagem quando não há resultados */}
          {showSearchResults && searchResults.length === 0 && searchTerm.trim() && (
            <div className="text-center py-4 text-slate-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto encontrado</p>
              <p className="text-sm">Tente outro termo de busca</p>
            </div>
          )}

          {/* Botões de ação */}
          <div className="consignado-action-buttons flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center w-full">
            <Button
              variant="outline"
              onClick={handleScannerClick}
              disabled={isProcessing || isAddingItem}
              className="consignado-scanner-button flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 h-10 sm:h-auto border-slate-300 hover:bg-slate-50 rounded-xl text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto flex-1 sm:flex-initial"
            >
              <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Scanner</span>
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={isProcessing || isAddingItem || !productCode.trim()}
              className="consignado-add-button flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 h-10 sm:h-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-sm text-xs sm:text-sm whitespace-nowrap w-full sm:w-auto flex-1 sm:flex-initial"
            >
              {isProcessing || isAddingItem ? (
                <>
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                  <span className="hidden sm:inline">Adicionando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Adicionar</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dicas visuais limpas */}
        <div className="consignado-tips-container bg-slate-50 rounded-xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          <div className="consignado-tip-item flex items-start sm:items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
            <div className="consignado-tip-icon w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </div>
            <span className="consignado-tip-text text-slate-700 break-words">Digite o código do produto</span>
          </div>
          <div className="consignado-tip-item flex items-start sm:items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
            <div className="consignado-tip-icon w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <span className="consignado-tip-text text-slate-700 break-words">Use o scanner para QR Code</span>
          </div>
          <div className="consignado-tip-item flex items-start sm:items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
            <div className="consignado-tip-icon w-5 h-5 sm:w-6 sm:h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
            </div>
            <span className="consignado-tip-text text-slate-700 break-words">Produtos iguais serão somados</span>
          </div>
        </div>

        {/* Status */}
        {(isProcessing || isAddingItem) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700 font-medium">Processando produto...</span>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      <SmartScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        mode="consignado"
        onConfirmItem={handleConfirmItem}
        getProductByCode={getProductByCode}
        getAvailableStock={async (productId: string) => {
          // ✅ CORREÇÃO: Usar estoque físico em vez de estoque disponível
          const product = await getProductByCode(productId)
          return product?.stock || 0
        }}
      />
    </div>
  )
}
