/**
 * Componente: Input de Cliente com Digitação Livre
 * 
 * Permite digitar o nome do cliente diretamente ou selecionar da lista
 */

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  whatsapp?: string
}

interface ClientInputProps {
  clients: Client[]
  value: { id?: string; name: string; isNew?: boolean } | null
  onValueChange: (client: { id?: string; name: string; isNew?: boolean } | null) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

export function ClientInput({
  clients,
  value,
  onValueChange,
  placeholder = "Digite o nome do cliente...",
  disabled = false,
  label = "Cliente"
}: ClientInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value?.name || '')

  // Atualizar input quando value muda externamente
  useEffect(() => {
    setInputValue(value?.name || '')
  }, [value])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    
    // Se o campo está vazio, limpar o cliente
    if (!newValue.trim()) {
      onValueChange(null)
      return
    }

    // Verificar se existe um cliente com esse nome exato
    const exactMatch = clients.find(c => c.name.toLowerCase() === newValue.toLowerCase())
    if (exactMatch) {
      onValueChange({ id: exactMatch.id, name: exactMatch.name })
    } else {
      // Cliente novo digitado
      onValueChange({ name: newValue.trim(), isNew: true })
    }
  }

  const handleSelectClient = (client: Client) => {
    setInputValue(client.name)
    onValueChange({ id: client.id, name: client.name })
    setOpen(false)
  }

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      onValueChange({ name: inputValue.trim(), isNew: true })
      setOpen(false)
    }
  }

  // Filtrar clientes baseado na busca
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(inputValue.toLowerCase()) ||
    client.whatsapp?.includes(inputValue)
  )

  // Verificar se é um cliente novo
  const isNewClient = inputValue.trim().length > 0 && 
    !clients.some(c => c.name.toLowerCase() === inputValue.toLowerCase())

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full"
          />
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={disabled}
              className="shrink-0"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar cliente..."
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {inputValue.trim() ? (
                    <div className="p-2">
                      <div className="text-sm text-muted-foreground mb-2">
                        Nenhum cliente encontrado
                      </div>
                      {isNewClient && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateNew}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar "{inputValue}"
                        </Button>
                      )}
                    </div>
                  ) : (
                    "Digite para buscar clientes..."
                  )}
                </CommandEmpty>
                
                <CommandGroup>
                  {filteredClients.map((client) => (
                    <CommandItem
                      key={client.id}
                      onSelect={() => handleSelectClient(client)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value?.id === client.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{client.name}</div>
                        {client.whatsapp && (
                          <div className="text-sm text-muted-foreground">
                            {client.whatsapp}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Indicador de status do cliente */}
      {value && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {value.isNew ? (
              <>
                <Badge variant="outline" className="mr-2">
                  Novo
                </Badge>
                Cliente avulso: {value.name}
              </>
            ) : (
              <>
                <Badge variant="default" className="mr-2">
                  Cadastrado
                </Badge>
                {value.name}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
