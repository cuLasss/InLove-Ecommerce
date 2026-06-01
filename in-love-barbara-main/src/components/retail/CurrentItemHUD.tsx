import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Plus, Minus, DollarSign, Building2, Tag } from 'lucide-react';
import { useCurrentItem } from '@/hooks/useCurrentItem';

export function CurrentItemHUD() {
  const {
    currentItem,
    currentQtyInCart,
    availableSession,
    addOne,
    removeOne,
    canAddMore,
    canRemove
  } = useCurrentItem();

  if (!currentItem) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            Escaneie um produto para começar
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Use a câmera ou digite o código manualmente
          </p>
        </CardContent>
      </Card>
    );
  }

  const priceInReais = currentItem.price / 100;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-6">
        {/* Cabeçalho do item */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Item Atual
              </span>
            </div>
            <h3 className="text-lg font-semibold leading-tight mb-2">
              {currentItem.name}
            </h3>
            
            {/* Detalhes do produto */}
            <div className="flex flex-wrap gap-2 mb-3">
              {currentItem.brand && (
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {currentItem.brand}
                </Badge>
              )}
              {currentItem.category && (
                <Badge variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {currentItem.category}
                </Badge>
              )}
              {currentItem.color && (
                <Badge variant="outline" className="text-xs">
                  {currentItem.color}
                </Badge>
              )}
              {currentItem.size && (
                <Badge variant="outline" className="text-xs">
                  {currentItem.size}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Preço */}
          <div className="text-right">
            <div className="flex items-center gap-1 text-lg font-bold text-primary">
              <DollarSign className="h-4 w-4" />
              {priceInReais.toFixed(2)}
            </div>
            {currentItem.supplier && (
              <p className="text-xs text-muted-foreground mt-1">
                {currentItem.supplier}
              </p>
            )}
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Controles de quantidade */}
        <div className="space-y-3">
          {/* Status da sessão */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Adicionados nesta sessão:
            </span>
            <span className="font-medium">
              {currentQtyInCart}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Estoque disponível:
            </span>
            <span className={`font-medium ${availableSession <= 0 ? 'text-destructive' : 'text-foreground'}`}>
              {availableSession}
            </span>
          </div>

          {/* Botões de controle */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={removeOne}
              disabled={!canRemove}
              className="flex-1"
            >
              <Minus className="h-4 w-4 mr-2" />
              Remover
            </Button>
            
            <Button
              onClick={addOne}
              disabled={!canAddMore}
              className="flex-1"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Dicas */}
          <div className="text-xs text-muted-foreground text-center pt-2">
            {!canAddMore && availableSession <= 0 && (
              <span className="text-destructive">⚠️ Sem estoque disponível</span>
            )}
            {canAddMore && (
              <span>💡 Escaneie outro código para trocar o item atual</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}