import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Percent, DollarSign, Check } from 'lucide-react';
export interface DiscountConfig {
  tipo: 'PERCENTUAL'; // Only percentage allowed now
  valor: number;
}
interface DiscountConfigProps {
  discount: DiscountConfig;
  onUpdate: (discount: DiscountConfig) => void;
  onApplyToAllItems?: (commission: number) => void;
  isUpdating?: boolean;
  disabled?: boolean;
}
export function DiscountConfig({
  discount,
  onUpdate,
  onApplyToAllItems,
  isUpdating = false,
  disabled = false
}: DiscountConfigProps) {
  const [localDiscount, setLocalDiscount] = useState<DiscountConfig>(discount);
  const [hasChanges, setHasChanges] = useState(false);
  const handleTipoChange = (tipo: 'PERCENTUAL') => {
    // Only PERCENTUAL is allowed now
    const newDiscount = {
      ...localDiscount,
      tipo: 'PERCENTUAL' as const
    };
    setLocalDiscount(newDiscount);
    setHasChanges(newDiscount.valor !== discount.valor);
  };
  const handleValorChange = (valor: string) => {
    const numericValue = parseFloat(valor) || 0;
    const newDiscount = {
      ...localDiscount,
      valor: numericValue
    };
    setLocalDiscount(newDiscount);
    setHasChanges(newDiscount.tipo !== discount.tipo || newDiscount.valor !== discount.valor);
  };
  const handleApply = () => {
    onUpdate(localDiscount);
    setHasChanges(false);
  };
  const handleApplyToAllItems = () => {
    if (onApplyToAllItems && isValidValue()) {
      onApplyToAllItems(localDiscount.valor);
    }
  };
  const handleReset = () => {
    setLocalDiscount(discount);
    setHasChanges(false);
  };

  // Validation (only percentage now)
  const isValidValue = () => {
    return localDiscount.valor >= 0 && localDiscount.valor <= 100;
  };
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Comissão do Lote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valor da comissão - Only percentage */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Comissão Percentual (%)
          </Label>
          <Input type="number" min="0" max="100" step="1" value={localDiscount.valor || ''} onChange={e => handleValorChange(e.target.value)} placeholder="0" disabled={disabled} className="text-center text-lg font-medium" />
          <p className="text-xs text-muted-foreground">
            Aplique uma comissão de 0% a 100% sobre o total dos itens
          </p>
        </div>

        {/* Validação */}
        {!isValidValue() && <div className="text-sm text-red-600">
            Percentual deve estar entre 0% e 100%
          </div>}

        {/* Ações */}
        {hasChanges && isValidValue() && <div className="flex gap-2">
            
            {onApplyToAllItems && <Button onClick={handleApplyToAllItems} disabled={isUpdating || disabled} size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                <Percent className="h-4 w-4 mr-2" />
                Aplicar a Todos
              </Button>}
            <Button variant="outline" onClick={handleReset} disabled={isUpdating || disabled} size="sm">
              Cancelar
            </Button>
          </div>}

        {/* Preview da comissão atual */}
        {discount.valor > 0 && <div className="p-3 bg-muted rounded-lg">
            <strong>Comissão ativa:</strong> {discount.valor}%
          </div>}
      </CardContent>
    </Card>;
}