import { useState, useCallback } from 'react';

export interface ScanResult {
  raw: string;
  format: string;
}

export interface UseScannerOptions {
  autoClose?: boolean;
  onResult?: (result: ScanResult) => void;
  onProductAdd?: (productCode: string, quantity: number) => boolean;
  maxStock?: number;
}

export function useScanner(options: UseScannerOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  const handleResult = useCallback((result: ScanResult) => {
    options.onResult?.(result);
  }, [options.onResult]);
  
  const props = {
    open: isOpen,
    onOpenChange: setIsOpen,
    onResult: handleResult,
    autoClose: options.autoClose ?? false
  };
  
  return {
    isOpen,
    open,
    close,
    props
  };
}