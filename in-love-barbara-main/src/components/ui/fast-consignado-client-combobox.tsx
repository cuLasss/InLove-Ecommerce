import * as React from "react";
import { Check, ChevronsUpDown, Loader2, RefreshCw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { clientsApi, blacklistApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { matchesSearch, matchesPhone } from "@/lib/text-utils";

interface ConsignacaoClient {
  id: string;
  name: string;
  whatsapp?: string;
}

interface FastConsignacaoClientComboboxProps {
  value: string;
  onValueChange: (clientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FastConsignacaoClientCombobox({
  value,
  onValueChange,
  placeholder = "Selecione uma cliente consignado...",
  disabled = false
}: FastConsignacaoClientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const cacheRef = React.useRef<ConsignacaoClient[]>([]);
  const [filteredClients, setFilteredClients] = React.useState<ConsignacaoClient[]>([]);
  
  // Debounce search for local filtering
  const debouncedSearch = useDebounce(searchValue, 150);

  // Prefetch all consignado clients once when modal opens
  const { data: clients, isLoading, error, refetch } = useQuery({
    queryKey: ['consignado-clients-prefetch'],
    queryFn: clientsApi.getConsignadoList,
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Buscar blacklist específica do consignado
  const { data: blacklistEntries = [] } = useQuery({
    queryKey: ['blacklist-consignado'],
    queryFn: () => blacklistApi.getByType('CONSIGNADO'),
    enabled: open,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  // Update cache and reset search when data changes
  React.useEffect(() => {
    if (clients) {
      cacheRef.current = clients;
      setFilteredClients(clients.slice(0, 20)); // Initial 20 results
    }
  }, [clients]);

  // Local filtering with debounce
  React.useEffect(() => {
    if (!cacheRef.current.length) return;

    const query = debouncedSearch.trim();
    
    if (!query) {
      setFilteredClients(cacheRef.current.slice(0, 20));
      return;
    }

    const filtered = cacheRef.current.filter(client => 
      matchesSearch(client.name, query) ||
      matchesPhone(client.whatsapp || '', query)
    ).slice(0, 20);

    setFilteredClients(filtered);
  }, [debouncedSearch]);

  const selectedClient = cacheRef.current.find(client => client.id === value);

  // Função para verificar se cliente está bloqueado no CONSIGNADO
  const isClientBlocked = (clientId: string): boolean => {
    const now = new Date();
    return blacklistEntries.some(entry => {
      // Verificar se é o cliente correto E se é do tipo CONSIGNADO E se está ativo
      if (entry.client_id !== clientId || entry.client_type !== 'CONSIGNADO' || !entry.is_active) {
        return false;
      }
      // Verificar se o bloqueio ainda está válido (não expirado)
      const blockedUntil = new Date(entry.blocked_until);
      return now <= blockedUntil;
    });
  };

  const handleSelect = (selectedValue: string) => {
    // Verificar se cliente está bloqueado
    if (isClientBlocked(selectedValue)) {
      return; // Não permite seleção de cliente bloqueado
    }
    
    onValueChange(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchValue("");
    }
  };

  const displayValue = selectedClient?.name || placeholder;

  return (
    <div className="relative z-0">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-xs sm:text-sm h-9 sm:h-10",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <span className="truncate text-left flex-1 min-w-0 break-words whitespace-normal">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[calc(100vw-2rem)] sm:w-[400px] max-w-[calc(100vw-2rem)] sm:max-w-[400px] p-0" 
          align="start"
          sideOffset={4}
          style={{ zIndex: 110 }}
        >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar cliente consignado..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="text-xs sm:text-sm h-9 sm:h-10"
          />
          <CommandList className="max-h-[300px] sm:max-h-[400px]">
            <CommandEmpty className="text-xs sm:text-sm py-4 px-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-3 sm:p-4">
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-2" />
                  <span className="text-xs sm:text-sm">Carregando clientes...</span>
                </div>
              ) : error ? (
                <div className="p-3 sm:p-4 text-center">
                  <div className="text-xs sm:text-sm text-destructive mb-2 break-words">
                    Erro ao carregar clientes
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="text-[10px] sm:text-xs h-7 sm:h-8"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    Recarregar lista
                  </Button>
                </div>
              ) : searchValue.trim() ? (
                <span className="break-words whitespace-normal">Nenhum cliente consignado encontrado</span>
              ) : (
                <span className="break-words whitespace-normal">Digite para buscar clientes consignado...</span>
              )}
            </CommandEmpty>
            
            <CommandGroup>
              {filteredClients.map((client) => {
                const blocked = isClientBlocked(client.id);
                return (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => handleSelect(client.id)}
                    className={cn(
                      "cursor-pointer text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3",
                      blocked && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={blocked}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <div className="font-medium break-words whitespace-normal flex-1 min-w-0">{client.name}</div>
                        {blocked && (
                          <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      {client.whatsapp && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground break-words whitespace-normal mt-0.5">
                          📱 {client.whatsapp}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <div className="text-[9px] sm:text-xs text-green-600 font-medium whitespace-nowrap">
                          CONSIGNADO
                        </div>
                        {blocked && (
                          <div className="text-[9px] sm:text-xs text-red-600 font-medium whitespace-nowrap">
                            BLOQUEADO
                          </div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      </Popover>
    </div>
  );
}