import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useCurrentItem } from '@/hooks/useCurrentItem';
import { DollarSign, Building2, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import ScannerEngine from '@/lib/scan/ScannerEngine';

export function ScanHUD() {
  const { currentItem, currentQty, availableSession } = useCurrentItem();
  
  console.log('[ScanHUD] currentItem:', currentItem);
  console.log('[ScanHUD] currentQty:', currentQty);
  console.log('[ScanHUD] availableSession:', availableSession);
  const [zoomValue, setZoomValue] = useState([1.0]);
  const [zoomSupported, setZoomSupported] = useState(false);

  useEffect(() => {
    // Verificar se zoom é suportado
    const checkZoomSupport = async () => {
      try {
        const videoElement = ScannerEngine.getVideoElement();
        if (videoElement?.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities?.() as any;
          setZoomSupported(!!capabilities?.zoom);
        }
      } catch (error) {
        setZoomSupported(false);
      }
    };

    checkZoomSupport();
  }, []);

  const handleZoomChange = (value: number[]) => {
    setZoomValue(value);
    ScannerEngine.setZoom(value[0]);
  };

  if (!currentItem) return null;

  const priceInReais = currentItem.price / 100;

  return (
    <Card className="fixed bottom-20 left-4 right-20 z-20 bg-background/95 backdrop-blur-sm border-2 border-primary/30">
      <CardContent className="p-4 space-y-3">
        {/* Nome do produto */}
        <div>
          <h3 className="font-bold text-lg leading-tight text-primary">
            {currentItem.name}
          </h3>
        </div>

        {/* Linha com preço, fornecedor e categoria */}
        <div className="text-sm text-muted-foreground">
          <span className="text-primary font-semibold">
            Preço: R$ {priceInReais.toFixed(2)}
          </span>
          {currentItem.supplier && (
            <span> • Fornecedor: {currentItem.supplier}</span>
          )}
          {currentItem.category && (
            <span> • Categoria: {currentItem.category}</span>
          )}
        </div>

        {/* Contadores em tempo real */}
        <div className="text-sm font-semibold">
          <span className="text-primary">Adicionados: {currentQty}</span>
          <span className="text-muted-foreground"> • </span>
          <span className={availableSession <= 0 ? 'text-destructive' : 'text-green-600'}>
            Estoque: {availableSession}
          </span>
        </div>

        {/* Barra de zoom (só se suportado) */}
        {zoomSupported && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span>{zoomValue[0].toFixed(1)}x</span>
            </div>
            <Slider
              value={zoomValue}
              onValueChange={handleZoomChange}
              min={1.0}
              max={3.0}
              step={0.1}
              className="w-full"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}