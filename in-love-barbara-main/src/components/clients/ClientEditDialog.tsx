import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { clientsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const clientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  birthday: z.string().min(1, "Data de nascimento é obrigatória"),
  whatsapp: z.string().min(1, "WhatsApp é obrigatório"),
  types: z.array(z.string()).min(1, "Selecione pelo menos uma categoria"),
  city: z.string().optional()
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  client: any | null
}

const CLIENT_TYPES = [
  { id: "VAREJO", label: "Varejo" },
  { id: "CONSIGNADO", label: "Consignado" },
  { id: "ATACADO", label: "Atacado" }
]

export function ClientEditDialog({ open, onOpenChange, onSuccess, client }: ClientEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      birthday: formatDateForInput(client?.birthday) || "",
      whatsapp: client?.whatsapp || "",
      types: client?.types || [],
      city: client?.city || ""
    }
  })

  // Atualiza os valores do form quando o client muda
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        birthday: formatDateForInput(client.birthday) || "",
        whatsapp: client.whatsapp || "",
        types: client.types || [],
        city: client.city || ""
      })
    }
  }, [client, form])

  function formatDateForInput(dateStr: string | null) {
    if (!dateStr) return ""
    // Converte YYYY-MM-DD para DD/MM/YYYY
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const [year, month, day] = parts
      return `${day}/${month}/${year}`
    }
    return dateStr
  }

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    
    if (numbers.length <= 2) {
      return `(${numbers}`
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  const formatBirthday = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
    }
  }

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value)
    form.setValue("whatsapp", formatted)
  }

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthday(e.target.value)
    form.setValue("birthday", formatted)
  }

  const convertDateToISO = (dateStr: string) => {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }

  const onSubmit = async (data: ClientFormData) => {
    if (!client?.id) return
    
    setIsSubmitting(true)
    try {
      await clientsApi.update(client.id, {
        name: data.name,
        birthday: convertDateToISO(data.birthday),
        whatsapp: data.whatsapp,
        types: data.types,
        city: data.city || null
      })

      toast({
        title: "Cliente atualizado com sucesso!",
        description: `${data.name} foi atualizado com sucesso.`
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("Erro detalhado:", error)
      
      let errorMessage = "Tente novamente ou entre em contato com o suporte."
      
      // Handle validation errors from database
      if (error?.message?.includes("Invalid email format")) {
        errorMessage = "Email inválido. Por favor, use um formato válido (exemplo@email.com)."
      } else if (error?.message?.includes("Invalid phone number length")) {
        errorMessage = "Telefone/WhatsApp inválido. Deve ter entre 10 e 15 dígitos."
      } else if (error?.message?.includes("Invalid CPF length")) {
        errorMessage = "CPF inválido. Deve conter exatamente 11 dígitos."
      } else if (error?.message?.includes("Invalid CNPJ length")) {
        errorMessage = "CNPJ inválido. Deve conter exatamente 14 dígitos."
      } else if (error?.message?.includes("Rate limit exceeded")) {
        errorMessage = "Limite de requisições excedido. Por favor, aguarde alguns minutos e tente novamente."
      } else if (error?.message?.includes("Client name is required")) {
        errorMessage = "Nome do cliente é obrigatório."
      } else if (error?.message?.includes("row-level security")) {
        errorMessage = "Erro de permissão. Você não tem acesso para realizar esta operação."
      } else if (error?.message) {
        errorMessage = error.message
      }

      toast({
        title: "Erro ao atualizar cliente",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite o nome completo do cliente"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="25/10/2003"
                      value={field.value}
                      onChange={handleBirthdayChange}
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(31) 99999-9999"
                      value={field.value}
                      onChange={handleWhatsAppChange}
                      maxLength={15}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite a cidade"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorias</FormLabel>
                  <div className="space-y-2">
                    {CLIENT_TYPES.map((type) => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.id}
                          checked={field.value.includes(type.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, type.id])
                            } else {
                              field.onChange(field.value.filter((t) => t !== type.id))
                            }
                          }}
                        />
                        <Label htmlFor={type.id} className="text-sm font-normal">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}