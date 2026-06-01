/**
 * Componente: Busca de Cliente com Autocomplete
 * 
 * Busca automática de clientes ao digitar, igual aos produtos
 */

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Plus, User, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  whatsapp?: string
  city?: string
}

interface ClientSearchProps {
  clients: Client[]
  value: { id?: string; name: string; isNew?: boolean } | null
  onValueChange: (client: { id?: string; name: string; isNew?: boolean } | null) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

export function ClientSearch({
  clients,
  value,
  onValueChange,
  placeholder = "Digite o nome do cliente...",
  disabled = false,
  label = "Cliente"
}: ClientSearchProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value?.name || '')
  const [searchResults, setSearchResults] = useState<Client[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const isSelectingRef = useRef(false) // Flag para evitar atualização durante seleção

  // Sincronizar inputValue com value quando value muda externamente
  // Mas não atualizar se estiver selecionando ou digitando
  useEffect(() => {
    if (isSelectingRef.current) {
      return // Não atualizar durante seleção
    }

    if (value?.name && value.name !== inputValue) {
      // Só atualizar se o value mudou e não estamos digitando
      if (!isTyping) {
        setInputValue(value.name)
        setIsTyping(false)
        setSearchResults([])
      }
    } else if (!value && inputValue) {
      // Se value foi limpo e há texto no input, limpar apenas se não estiver digitando
      if (!isTyping) {
        setInputValue('')
        setSearchResults([])
      }
    }
  }, [value?.id]) // Apenas quando o ID muda (cliente selecionado muda)

  // Função de busca com debounce
  const searchClients = (query: string) => {
    setIsSearching(true)
    
    // Simular delay de busca (opcional)
    setTimeout(() => {
      if (!query.trim()) {
        // Se não há query, limpar resultados
        setSearchResults([])
      } else {
        // Se há query, filtrar clientes
        const results = clients.filter(client =>
          client.name.toLowerCase().includes(query.toLowerCase()) ||
          client.whatsapp?.includes(query) ||
          client.city?.toLowerCase().includes(query.toLowerCase())
        )
        setSearchResults(results)
      }
      
      setIsSearching(false)
    }, 100)
  }

  // Debounce da busca - só buscar quando estiver digitando E não tiver cliente selecionado
  useEffect(() => {
    // Se não está digitando OU se há um cliente selecionado e o texto corresponde ao nome, não buscar
    if (!isTyping || (value?.id && inputValue === value.name)) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (inputValue.trim()) {
      searchClients(inputValue)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [inputValue, isTyping, value?.id, value?.name])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    isSelectingRef.current = false
    
    // Se o campo está vazio, limpar o cliente
    if (!newValue.trim()) {
      onValueChange(null)
      setSearchResults([])
      setIsTyping(false)
      return
    }

    // Ativar modo de digitação quando o usuário começar a digitar
    // Mas só se o texto for diferente do cliente selecionado
    if (!value?.id || newValue !== value.name) {
      setIsTyping(true)
    }

    // Se havia um cliente selecionado e o texto mudou, limpar seleção
    if (value?.id && newValue !== value.name) {
      onValueChange({ name: newValue.trim(), isNew: true })
    }
  }

  const handleInputFocus = () => {
    // Quando o input recebe foco, não fazer nada ainda
    // As sugestões só aparecem quando o usuário começar a digitar
  }

  const handleInputBlur = () => {
    // Aguardar um pouco antes de fechar para permitir clique nos resultados
    setTimeout(() => {
      if (isSelectingRef.current) {
        // Se acabou de selecionar, não fazer nada
        return
      }

      // Se há um cliente selecionado e o inputValue corresponde ao nome, manter selecionado
      if (value?.id && inputValue.trim() === value.name) {
        setIsTyping(false)
        setSearchResults([])
      } else if (!inputValue.trim()) {
        // Campo vazio
        setIsTyping(false)
        setSearchResults([])
      }
      // Se há texto diferente, manter em modo de digitação para mostrar sugestões
    }, 250)
  }

  const handleSelectClient = (client: Client) => {
    // Primeiro fechar as sugestões e desativar modo de digitação IMEDIATAMENTE
    setIsTyping(false)
    setSearchResults([])
    setOpen(false)
    isSelectingRef.current = true
    
    // Atualizar o valor do input
    setInputValue(client.name)
    
    // Atualizar o valor do cliente
    onValueChange({ id: client.id, name: client.name })
    
    // Resetar flag após um delay para permitir que o useEffect processe corretamente
    setTimeout(() => {
      isSelectingRef.current = false
      // Garantir que o estado está consistente após a seleção
      if (inputValue === client.name) {
        setIsTyping(false)
    setSearchResults([])
      }
    }, 400)
  }

  const handleCreateNew = () => {
    if (inputValue.trim()) {
      // Primeiro fechar as sugestões e desativar modo de digitação IMEDIATAMENTE
      setIsTyping(false)
      setSearchResults([])
      setOpen(false)
      isSelectingRef.current = true
      
      // Atualizar o valor do cliente
      const newName = inputValue.trim()
      onValueChange({ name: newName, isNew: true })
      
      // Resetar flag após um delay
      setTimeout(() => {
        isSelectingRef.current = false
        // Garantir que o estado está consistente após a criação
        if (inputValue === newName) {
          setIsTyping(false)
      setSearchResults([])
        }
      }, 400)
    }
  }

  // Verificar se é um cliente novo
  const isNewClient = inputValue.trim().length > 0 && 
    !clients.some(c => c.name.toLowerCase() === inputValue.toLowerCase())

  // Só mostrar sugestões se:
  // 1. Estiver digitando (isTyping)
  // 2. Houver texto no input
  // 3. NÃO tiver um cliente selecionado OU o texto seja diferente do cliente selecionado
  const shouldShowSuggestions = isTyping && 
    inputValue.trim().length > 0 && 
    (!value?.id || inputValue !== value.name)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full"
            />
            
            {/* Indicador de busca */}
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
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
                      <div className="p-2">
                        <div className="text-sm text-muted-foreground mb-2">
                          {clients.length > 0 ? `${clients.length} clientes disponíveis` : "Nenhum cliente cadastrado"}
                        </div>
                        {clients.length > 0 && (
                          <div className="space-y-1">
                            {clients.slice(0, 5).map((client) => (
                              <div
                                key={client.id}
                                className="px-2 py-1 hover:bg-gray-50 cursor-pointer rounded text-sm"
                                onClick={() => handleSelectClient(client)}
                              >
                                <div className="font-medium">{client.name}</div>
                                <div className="text-xs text-gray-500">
                                  {client.whatsapp && `${client.whatsapp}`}
                                  {client.city && ` • ${client.city}`}
                                </div>
                              </div>
                            ))}
                            {clients.length > 5 && (
                              <div className="text-xs text-gray-400 px-2">
                                E mais {clients.length - 5} clientes...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CommandEmpty>
                  
                  <CommandGroup>
                    {searchResults.map((client) => (
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
                          <div className="text-sm text-muted-foreground">
                            {client.whatsapp && `WhatsApp: ${client.whatsapp}`}
                            {client.city && ` • ${client.city}`}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Sugestões em tempo real - só mostrar quando estiver digitando */}
        {shouldShowSuggestions && searchResults.length > 0 && !open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.slice(0, 5).map((client) => (
              <div
                key={client.id}
                onMouseDown={(e) => {
                  // Usar onMouseDown em vez de onClick para evitar blur antes do click
                  e.preventDefault()
                  handleSelectClient(client)
                }}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-gray-500">
                      {client.whatsapp && `WhatsApp: ${client.whatsapp}`}
                      {client.city && ` • ${client.city}`}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Cadastrado
                  </Badge>
                </div>
              </div>
            ))}
            
            {isNewClient && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleCreateNew()
                }}
                className="p-3 hover:bg-green-50 cursor-pointer border-t border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-green-600">
                      Criar: "{inputValue}"
                    </div>
                    <div className="text-sm text-gray-500">
                      Cliente avulso
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600">
                    Novo
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
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
