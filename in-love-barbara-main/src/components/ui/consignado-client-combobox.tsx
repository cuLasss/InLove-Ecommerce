import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
import { clientsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface ConsignacaoClient {
  id: string;
  name: string;
  whatsapp?: string;
}

interface ConsignacaoClientComboboxProps {
  value: string;
  onValueChange: (clientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ConsignacaoClientCombobox({
  value,
  onValueChange,
  placeholder = "Selecione uma cliente consignado...",
  disabled = false
}: ConsignacaoClientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  
  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(searchValue, 300);

  const { data: searchResult, isLoading } = useQuery({
    queryKey: ['clients-consignado-search', debouncedSearch, currentPage],
    queryFn: () => clientsApi.searchConsignado({
      query: debouncedSearch,
      page: currentPage,
      perPage: 20
    }),
    enabled: open, // Only fetch when dropdown is open
  });

  const clients = searchResult?.data || [];
  const totalPages = searchResult?.totalPages || 1;
  const selectedClient = clients.find(client => client.id === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearchValue("");
    setCurrentPage(1);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchValue("");
      setCurrentPage(1);
    }
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const displayValue = selectedClient?.name || placeholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {displayValue}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar cliente consignado..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Buscando clientes...
                </div>
              ) : searchValue.trim() ? (
                <div className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Nenhum cliente consignado encontrado
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Tente buscar por nome ou WhatsApp
                  </div>
                </div>
              ) : (
                "Digite para buscar clientes consignado..."
              )}
            </CommandEmpty>
            
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{client.name}</div>
                    {client.whatsapp && (
                      <div className="text-sm text-muted-foreground">
                        📱 {client.whatsapp}
                      </div>
                    )}
                    <div className="text-xs text-green-600 font-medium">
                      CONSIGNADO
                    </div>
                  </div>
                </CommandItem>
              ))}

              {/* Load more button for pagination */}
              {!isLoading && currentPage < totalPages && (
                <CommandItem
                  onSelect={handleLoadMore}
                  className="cursor-pointer border-t justify-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Carregar mais clientes...
                </CommandItem>
              )}

              {isLoading && currentPage > 1 && (
                <CommandItem className="justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Carregando mais...
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}