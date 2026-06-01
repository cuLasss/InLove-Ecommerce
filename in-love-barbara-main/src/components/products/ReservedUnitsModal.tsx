import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, Users, FileText } from 'lucide-react'
import { ConsignadoReserva } from '@/hooks/useConsignadoReservas'

interface ReservedUnitsModalProps {
  reservas: ConsignadoReserva
  children: React.ReactNode
}

export function ReservedUnitsModal({ reservas, children }: ReservedUnitsModalProps) {
  if (reservas.total_reservado === 0) {
    return null
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Unidades Reservadas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informações do produto */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-medium text-sm">{reservas.product_name}</h3>
            <p className="text-xs text-muted-foreground">
              Código: {reservas.short_code || 'N/A'}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                {reservas.total_reservado} unidades reservadas
              </Badge>
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Reservado por ({reservas.clientes.length} cliente{reservas.clientes.length !== 1 ? 's' : ''})
            </h4>
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {reservas.clientes.map((cliente, index) => (
                <div key={`${cliente.cliente_id}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cliente.cliente_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>Folha: {cliente.folha_codigo}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {cliente.quantidade} unid.
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total reservado:</span>
              <span className="font-medium">{reservas.total_reservado} unidades</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

