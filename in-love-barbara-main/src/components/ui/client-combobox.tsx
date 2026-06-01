import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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

interface Client {
  id: string;
  name: string;
  whatsapp?: string;
}

interface ClientComboboxProps {
  clients: Client[];
  value: { id?: string; name: string } | null;
  onValueChange: (client: { id?: string; name: string; isNew?: boolean } | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientCombobox({
  clients,
  value,
  onValueChange,
  placeholder = "Digite o nome ou escolha um cliente...",
  disabled = false
}: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const handleSelect = (selectedValue: string) => {
    if (selectedValue === "NONE") {
      onValueChange(null);
    } else if (selectedValue.startsWith("NEW:")) {
      // Cliente novo digitado livremente
      const newName = selectedValue.substring(4);
      onValueChange({ name: newName, isNew: true });
    } else {
      // Cliente existente
      const client = clients.find(c => c.id === selectedValue);
      if (client) {
        onValueChange({ id: client.id, name: client.name });
      }
    }
    setOpen(false);
    setSearchValue("");
  };

  const displayValue = value?.name || "Cliente avulso";
  
  // Filtrar clientes baseado na busca
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    client.whatsapp?.includes(searchValue)
  );

  // Verificar se o texto digitado é um novo cliente
  const isNewClient = searchValue.trim().length > 0 && 
    !filteredClients.some(c => c.name.toLowerCase() === searchValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Command>
          <CommandInput
            placeholder="Digite para buscar ou criar cliente..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue.trim() ? (
                <div className="p-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    Nenhum cliente encontrado
                  </div>
                </div>
              ) : (
                "Digite para buscar clientes..."
              )}
            </CommandEmpty>
            
            <CommandGroup>
              <CommandItem
                value="NONE"
                onSelect={handleSelect}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                Cliente avulso
              </CommandItem>

              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={handleSelect}
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

              {isNewClient && (
                <CommandItem
                  value={`NEW:${searchValue}`}
                  onSelect={handleSelect}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-green-600">
                      Criar: "{searchValue}"
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cliente avulso
                    </div>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}