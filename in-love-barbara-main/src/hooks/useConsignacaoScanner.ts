import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseConsignacaoScannerOptions {
  onAddItem: (code: string) => Promise<void>;
  throttleMs?: number;
  blockRepeatMs?: number;
}

export function useConsignacaoScanner({
  onAddItem,
  throttleMs = 200,
  blockRepeatMs = 1500
}: UseConsignacaoScannerOptions) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedCode = useRef<string>('');
  const lastProcessedTime = useRef<number>(0);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  const processCode = useCallback(async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    const now = Date.now();

    // Verificar se é o mesmo código processado recentemente
    if (normalizedCode === lastProcessedCode.current && 
        (now - lastProcessedTime.current) < blockRepeatMs) {
      console.log('🚫 [CONSIGNADO] Código ignorado (repetição):', normalizedCode);
      return;
    }

    // Verificar throttling
    if (isProcessing) {
      console.log('🚫 [CONSIGNADO] Código ignorado (throttling):', normalizedCode);
      return;
    }

    // Limpar timeout anterior se existir
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }

    // Aplicar throttling
    setIsProcessing(true);
    lastProcessedCode.current = normalizedCode;
    lastProcessedTime.current = now;

    try {
      console.log('✅ [CONSIGNADO] Processando código:', normalizedCode);
      await onAddItem(normalizedCode);
      
      // Feedback de sucesso
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch (error: any) {
      console.error('❌ [CONSIGNADO] Erro ao processar código:', error);
      toast({
        title: "❌ Erro ao adicionar produto",
        description: error.message || `Erro ao processar código: ${normalizedCode}`,
        variant: "destructive"
      });
    } finally {
      // Liberar após throttling
      throttleTimeout.current = setTimeout(() => {
        setIsProcessing(false);
      }, throttleMs);
    }
  }, [onAddItem, throttleMs, blockRepeatMs, isProcessing, toast]);

  return {
    processCode,
    isProcessing
  };
}
