'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer } from 'lucide-react';
import { useProducts, type Product } from '@/hooks/useProducts';

interface QRCodeDisplayProps {
  product: Product;
}

export const QRCodeDisplay = ({ product }: QRCodeDisplayProps) => {
  const [open, setOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { generateQRCode } = useProducts();

  // Verificar se o produto existe e tem as propriedades necessárias
  if (!product || !product.short_code) {
    return null;
  }

  const handleShowQRCode = async () => {
    if (!qrCodeUrl) {
      setLoading(true);
      try {
        const url = await generateQRCode(product.id, product.short_code);
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      } finally {
        setLoading(false);
      }
    }
    setOpen(true);
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `qrcode-${product.short_code}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handlePrintLabel = () => {
    if (!qrCodeUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 220;
    canvas.height = 152;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.crossOrigin = 'anonymous'; // evita canvas tainted quando QR vem de outro domínio

    img.onload = () => {
      ctx.drawImage(img, 10, 10, 80, 80);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText((product.name || 'Produto').substring(0, 25), 100, 25);

      ctx.font = '10px Arial';
      ctx.fillText(`Código: ${product.short_code || 'N/A'}`, 100, 45);
      ctx.fillText(`Preço: R$ ${Number(product.price || 0).toFixed(2)}`, 100, 65);
      ctx.fillText(`Categoria: ${product.category || 'Sem categoria'}`, 100, 85);

      const dataUrl = canvas.toDataURL();

      const w = window.open('', '_blank');
      if (w) {
        // Create document structure safely using DOM methods instead of document.write()
        const doc = w.document;
        
        // Create and append head elements
        const head = doc.createElement('head');
        const title = doc.createElement('title');
        title.textContent = `Etiqueta - ${product.short_code}`;
        head.appendChild(title);
        
        const style = doc.createElement('style');
        style.textContent = `
          body { margin: 0; padding: 10px; }
          .label { width: 58mm; height: 40mm; border: 1px solid #ccc; }
          img { max-width: 100%; height: auto; }
          @media print {
            body { margin: 0; }
            .label { border: none; }
          }
        `;
        head.appendChild(style);
        
        // Create and append body elements
        const body = doc.createElement('body');
        const labelDiv = doc.createElement('div');
        labelDiv.className = 'label';
        
        const img = doc.createElement('img');
        img.src = dataUrl;
        img.alt = 'Etiqueta do produto';
        
        labelDiv.appendChild(img);
        body.appendChild(labelDiv);
        
        // Append to document
        doc.documentElement.appendChild(head);
        doc.documentElement.appendChild(body);
        
        // Trigger print and close
        w.onload = () => {
          w.print();
          w.close();
        };
      }
    };

    img.onerror = () => {
      alert('Falha ao carregar a imagem do QR (CORS). Garanta Access-Control-Allow-Origin no servidor do QR.');
    };

    img.src = qrCodeUrl;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleShowQRCode}>
            <QrCode className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>QR Code - {product.short_code || 'N/A'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              {loading ? (
                <div className="w-48 h-48 bg-muted animate-pulse mx-auto rounded" />
              ) : qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              ) : null}
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium">{product.name || 'Produto'}</p>
              <p className="text-sm text-muted-foreground">Código: {product.short_code || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">Preço: R$ {Number(product.price || 0).toFixed(2)}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} disabled={!qrCodeUrl} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handlePrintLabel} disabled={!qrCodeUrl} variant="outline" className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Etiqueta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
};
