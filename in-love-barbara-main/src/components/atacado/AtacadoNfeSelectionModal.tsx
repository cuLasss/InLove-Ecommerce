import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, FileText, Calendar, User, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
  id: string;
  client_id: string;
  user_id: string;
  channel: string;
  status: string;
  total_cents: number;
  created_at: string;
  client?: {
    name: string;
  };
  user?: {
    name: string;
  };
  payments?: Array<{
    amount_cents: number;
    method: string;
  }>;
}

interface AtacadoNfeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSale: (sale: Sale) => void;
  sales: Sale[];
}

export function AtacadoNfeSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectSale, 
  sales 
}: AtacadoNfeSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Filtrar apenas vendas finalizadas
  const finalizedSales = sales.filter(sale => sale.status === 'FECHADA');

  // Filtrar vendas por termo de busca
  const filteredSales = finalizedSales.filter(sale => {
    const clientName = sale.client?.name?.toLowerCase() || '';
    const userName = sale.user?.name?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return clientName.includes(search) || 
           userName.includes(search) ||
           sale.id.toLowerCase().includes(search);
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getPaymentStatus = (sale: Sale) => {
    if (!sale.payments || sale.payments.length === 0) {
      return { status: 'PENDENTE', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
    }

    const totalAmount = sale.total_cents;
    const paidAmount = sale.payments.reduce((sum, payment) => sum + payment.amount_cents, 0);

    if (paidAmount >= totalAmount) {
      return { status: 'PAGO', color: 'bg-green-100 text-green-800', icon: '✅' };
    } else if (paidAmount > 0) {
      return { status: 'PARCIAL', color: 'bg-orange-100 text-orange-800', icon: '⚠️' };
    } else {
      return { status: 'PENDENTE', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
    }
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSaleId(sale.id);
  };

  const handleGenerateNfe = () => {
    if (selectedSaleId) {
      const sale = filteredSales.find(s => s.id === selectedSaleId);
      if (sale) {
        onSelectSale(sale);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[1024px] xl:max-w-[1200px] max-h-[90vh] overflow-hidden p-3 sm:p-4 md:p-6 atacado-nfe-selection-modal">
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="flex items-center gap-2 text-xs sm:text-sm md:text-base lg:text-lg break-words leading-tight">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
            <span className="hidden sm:inline">Selecionar Venda para Gerar Nota Fiscal</span>
            <span className="sm:hidden">Selecionar Venda - NF-e</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className={`absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none transition-opacity duration-200 z-10 ${searchTerm ? 'opacity-0' : 'opacity-100'}`} />
            <Input
              placeholder="Buscar por cliente, vendedor ou ID da venda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 text-xs sm:text-sm h-8 sm:h-9 md:h-10"
            />
          </div>

          {/* Lista de Vendas */}
          <style>{`
            .atacado-nfe-selection-modal {
              padding: 0.75rem !important;
            }
            
            @media (min-width: 640px) {
              .atacado-nfe-selection-modal {
                padding: 1rem !important;
              }
            }
            
            @media (min-width: 768px) {
              .atacado-nfe-selection-modal {
                padding: 1.5rem !important;
              }
            }
            
            .nfe-sales-container {
              width: 100% !important;
              max-width: 100% !important;
              overflow-x: auto !important;
              overflow-y: auto !important;
              -webkit-overflow-scrolling: touch !important;
              scrollbar-width: thin !important;
              scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent !important;
              max-height: calc(90vh - 200px) !important;
            }
            
            @media (max-width: 640px) {
              .nfe-sales-container {
                max-height: calc(90vh - 180px) !important;
              }
            }
            
            .nfe-sales-container::-webkit-scrollbar {
              height: 8px;
              width: 8px;
            }
            
            .nfe-sales-container::-webkit-scrollbar-track {
              background: hsl(var(--muted) / 0.1);
              border-radius: 4px;
            }
            
            .nfe-sales-container::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.3);
              border-radius: 4px;
            }
            
            .nfe-sales-container::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.5);
            }
            
            .nfe-sales-list {
              display: flex !important;
              flex-direction: row !important;
              gap: 0.75rem !important;
              padding-bottom: 0.5rem !important;
              min-width: min-content !important;
            }
            
            @media (min-width: 768px) {
              .nfe-sales-list {
                gap: 1rem !important;
              }
            }
            
            .nfe-sale-item {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              gap: 0.5rem !important;
              padding: 0.75rem !important;
              border: 1px solid hsl(var(--border)) !important;
              border-radius: 0.5rem !important;
              min-width: 280px !important;
              max-width: 320px !important;
              flex-shrink: 0 !important;
              cursor: pointer !important;
              transition: all 0.2s !important;
              background: hsl(var(--card)) !important;
            }
            
            @media (min-width: 640px) {
              .nfe-sale-item {
                min-width: 320px !important;
                max-width: 360px !important;
                padding: 0.875rem !important;
                gap: 0.625rem !important;
              }
            }
            
            @media (min-width: 768px) {
              .nfe-sale-item {
                min-width: 350px !important;
                max-width: 400px !important;
                padding: 1rem !important;
                gap: 0.75rem !important;
              }
            }
            
            @media (min-width: 1024px) {
              .nfe-sale-item {
                min-width: 380px !important;
                max-width: 420px !important;
              }
            }
            
            .nfe-sale-item:hover {
              background: hsl(var(--muted) / 0.3) !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
            }
            
            .nfe-sale-item.selected {
              border-color: hsl(var(--primary)) !important;
              background: hsl(var(--primary) / 0.05) !important;
              ring: 2px solid hsl(var(--primary)) !important;
            }
            
            .nfe-sale-item-content {
              display: flex !important;
              flex-direction: column !important;
              gap: 0.375rem !important;
              flex: 1 1 auto !important;
              min-width: 0 !important;
            }
            
            @media (min-width: 768px) {
              .nfe-sale-item-content {
                gap: 0.5rem !important;
              }
            }
            
            .nfe-sale-item-header {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              gap: 0.375rem !important;
              flex-wrap: wrap !important;
            }
            
            @media (min-width: 768px) {
              .nfe-sale-item-header {
                gap: 0.5rem !important;
              }
            }
            
            .nfe-sale-item-name {
              font-weight: 500 !important;
              font-size: 0.75rem !important;
              white-space: nowrap !important;
              flex-shrink: 0 !important;
            }
            
            @media (min-width: 640px) {
              .nfe-sale-item-name {
                font-size: 0.8125rem !important;
              }
            }
            
            @media (min-width: 768px) {
              .nfe-sale-item-name {
                font-size: 0.875rem !important;
              }
            }
            
            .nfe-sale-item-details {
              display: flex !important;
              flex-direction: column !important;
              gap: 0.25rem !important;
              font-size: 0.75rem !important;
              color: hsl(var(--muted-foreground)) !important;
            }
            
            @media (min-width: 640px) {
              .nfe-sale-item-details {
                font-size: 0.8125rem !important;
              }
            }
            
            @media (min-width: 768px) {
              .nfe-sale-item-details {
                font-size: 0.875rem !important;
              }
            }
            
            .nfe-sale-item-price {
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-end !important;
              gap: 0.25rem !important;
              flex-shrink: 0 !important;
            }
            
            .nfe-sale-item-price .text-lg {
              font-size: 0.875rem !important;
            }
            
            @media (min-width: 640px) {
              .nfe-sale-item-price .text-lg {
                font-size: 1rem !important;
              }
            }
            
            @media (min-width: 768px) {
              .nfe-sale-item-price .text-lg {
                font-size: 1.125rem !important;
              }
            }
          `}</style>
          <div className="nfe-sales-container">
            {filteredSales.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-xs sm:text-sm md:text-base">Nenhuma venda finalizada encontrada</p>
              </div>
            ) : (
              <div className="nfe-sales-list">
                {filteredSales.map((sale) => {
                const paymentStatus = getPaymentStatus(sale);
                const isSelected = selectedSaleId === sale.id;

                return (
                    <div
                    key={sale.id} 
                      className={`nfe-sale-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectSale(sale)}
                  >
                          <Checkbox 
                            checked={isSelected}
                            onChange={() => handleSelectSale(sale)}
                        className="flex-shrink-0"
                          />
                      <div className="nfe-sale-item-content">
                        <div className="nfe-sale-item-header">
                          <span className="nfe-sale-item-name">
                                #{sale.id.slice(-8)}
                              </span>
                          <Badge className={`${paymentStatus.color} flex-shrink-0`}>
                                {paymentStatus.icon} {paymentStatus.status}
                              </Badge>
                            </div>
                        <div className="nfe-sale-item-details">
                              <div className="flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">{sale.client?.name || 'Cliente não informado'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            Vendedor: {sale.user?.name || 'Não informado'}
                          </div>
                        </div>
                      </div>
                      <div className="nfe-sale-item-price">
                        <div className="flex items-center gap-1 text-lg font-semibold text-green-600 whitespace-nowrap">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          {formatCurrency(sale.total_cents)}
                        </div>
                      </div>
                    </div>
                );
                })}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9 md:h-10"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateNfe}
              disabled={!selectedSaleId}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9 md:h-10"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Gerar NF-e</span>
              <span className="sm:hidden">Gerar</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

