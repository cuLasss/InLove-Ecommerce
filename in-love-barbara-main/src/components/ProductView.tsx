import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Tag, DollarSign, Palette, Ruler, X } from 'lucide-react';
import { Product } from '@/hooks/useProducts';

interface ProductViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductView({ product, isOpen, onClose }: ProductViewProps) {
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produto Encontrado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações principais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Código:</span>
                  <Badge variant="outline">{product.short_code}</Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Preço:</span>
                  <span className="font-semibold text-primary">
                    R$ {(Number(product.price) || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Categoria:</span>
                  <div className="font-medium">{product.category}</div>
                </div>
                
                <div>
                  <span className="text-sm text-muted-foreground">Estoque:</span>
                  <div className="font-medium">{product.stock} unidades</div>
                </div>
              </div>

              {(product.brand || product.size) && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 gap-2">
                    {product.brand && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Marca:</span>
                        <span className="text-sm font-medium">{product.brand}</span>
                      </div>
                    )}
                    
                    {product.size && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Tamanho:</span>
                        </div>
                        <span className="text-sm font-medium">{product.size}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-2">
            <Button onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
            <Button variant="outline" className="flex-1">
              <Package className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}