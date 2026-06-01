/**
 * Componente: Busca de Colaboradora com Autocomplete
 * 
 * Baseado no ClientSearch, mas específico para colaboradoras/usuários
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

interface Collaborator {
  id: string
  name: string
  role?: string
  whatsapp?: string
}

interface CollaboratorSearchProps {
  collaborators: Collaborator[]
  value: { id?: string; name: string; isNew?: boolean } | null
  onValueChange: (value: { id?: string; name: string; isNew?: boolean } | null) => void
  placeholder?: string
  disabled?: boolean
  label?: string
}

export function CollaboratorSearch({
  collaborators,
  value,
  onValueChange,
  placeholder = "Digite o nome da colaboradora...",
  disabled = false,
  label = "Colaboradora"
}: CollaboratorSearchProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value?.name || '')
  const [searchResults, setSearchResults] = useState<Collaborator[]>([])
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
  }, [value?.id]) // Apenas quando o ID muda (colaboradora selecionada muda)

  // Função de busca com debounce
  const searchCollaborators = (query: string) => {
    setIsSearching(true)
    
    // Simular delay de busca (opcional)
    setTimeout(() => {
      if (!query.trim()) {
        // Se não há query, limpar resultados
        setSearchResults([])
      } else {
        // Se há query, filtrar colaboradoras
        const results = collaborators.filter(collaborator =>
          collaborator.name.toLowerCase().includes(query.toLowerCase()) ||
          collaborator.role?.toLowerCase().includes(query.toLowerCase()) ||
          collaborator.whatsapp?.includes(query)
        )
        setSearchResults(results)
      }
      
      setIsSearching(false)
    }, 100)
  }

  // Debounce da busca - só buscar quando estiver digitando E não tiver colaboradora selecionada
  useEffect(() => {
    // Se não está digitando OU se há uma colaboradora selecionada e o texto corresponde ao nome, não buscar
    if (!isTyping || (value?.id && inputValue === value.name)) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (inputValue.trim()) {
      searchCollaborators(inputValue)
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
    
    // Se o campo está vazio, limpar a colaboradora
    if (!newValue.trim()) {
      onValueChange(null)
      setSearchResults([])
      setIsTyping(false)
      return
    }

    // Ativar modo de digitação quando o usuário começar a digitar
    // Mas só se o texto for diferente da colaboradora selecionada
    if (!value?.id || newValue !== value.name) {
      setIsTyping(true)
    }

    // Se havia uma colaboradora selecionada e o texto mudou, limpar seleção
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

      // Se há uma colaboradora selecionada e o inputValue corresponde ao nome, manter selecionada
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

  const handleSelectCollaborator = (collaborator: Collaborator) => {
    // Primeiro fechar as sugestões e desativar modo de digitação IMEDIATAMENTE
    setIsTyping(false)
    setSearchResults([])
    setOpen(false)
    isSelectingRef.current = true
    
    // Atualizar o valor do input
    setInputValue(collaborator.name)
    
    // Atualizar o valor da colaboradora
    onValueChange({ id: collaborator.id, name: collaborator.name })
    
    // Resetar flag após um delay para permitir que o useEffect processe corretamente
    setTimeout(() => {
      isSelectingRef.current = false
      // Garantir que o estado está consistente após a seleção
      if (inputValue === collaborator.name) {
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
      
      // Atualizar o valor da colaboradora
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

  // Verificar se é uma colaboradora nova
  const isNewCollaborator = inputValue.trim().length > 0 && 
    !collaborators.some(c => c.name.toLowerCase() === inputValue.toLowerCase())

  // Só mostrar sugestões se:
  // 1. Estiver digitando (isTyping)
  // 2. Houver texto no input
  // 3. NÃO tiver uma colaboradora selecionada OU o texto seja diferente da colaboradora selecionada
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
                  placeholder="Buscar colaboradora..."
                  value={inputValue}
                  onValueChange={setInputValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {inputValue.trim() ? (
                      <div className="p-2">
                        <div className="text-sm text-muted-foreground mb-2">
                          Nenhuma colaboradora encontrada
                        </div>
                        {isNewCollaborator && (
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
                          {collaborators.length > 0 ? `${collaborators.length} colaboradoras disponíveis` : "Nenhuma colaboradora cadastrada"}
                        </div>
                        {collaborators.length > 0 && (
                          <div className="space-y-1">
                            {collaborators.slice(0, 5).map((collaborator) => (
                              <div
                                key={collaborator.id}
                                className="px-2 py-1 hover:bg-gray-50 cursor-pointer rounded text-sm"
                                onClick={() => handleSelectCollaborator(collaborator)}
                              >
                                <div className="font-medium">{collaborator.name}</div>
                                <div className="text-xs text-gray-500">
                                  {collaborator.role && `${collaborator.role}`}
                                  {collaborator.whatsapp && ` • ${collaborator.whatsapp}`}
                                </div>
                              </div>
                            ))}
                            {collaborators.length > 5 && (
                              <div className="text-xs text-gray-400 px-2">
                                E mais {collaborators.length - 5} colaboradoras...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CommandEmpty>
                  
                  <CommandGroup>
                    {searchResults.map((collaborator) => (
                      <CommandItem
                        key={collaborator.id}
                        onSelect={() => handleSelectCollaborator(collaborator)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value?.id === collaborator.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{collaborator.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {collaborator.role && `Cargo: ${collaborator.role}`}
                            {collaborator.whatsapp && ` • WhatsApp: ${collaborator.whatsapp}`}
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
            {searchResults.slice(0, 5).map((collaborator) => (
              <div
                key={collaborator.id}
                onMouseDown={(e) => {
                  // Usar onMouseDown em vez de onClick para evitar blur antes do click
                  e.preventDefault()
                  handleSelectCollaborator(collaborator)
                }}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-sm">{collaborator.name}</div>
                <div className="text-xs text-gray-500">
                  {collaborator.role && `${collaborator.role}`}
                  {collaborator.whatsapp && ` • ${collaborator.whatsapp}`}
                </div>
              </div>
            ))}
            
            {isNewCollaborator && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleCreateNew()
                }}
                className="px-3 py-2 hover:bg-green-50 cursor-pointer border-t border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-green-600">
                      Criar: "{inputValue}"
                    </div>
                    <div className="text-xs text-gray-500">
                      Nova colaboradora
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badge de colaboradora selecionada */}
        {value && !value.isNew && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              Cadastrada: {value.name}
            </Badge>
          </div>
        )}

        {/* Badge de colaboradora nova */}
        {value && value.isNew && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Nova: {value.name}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
