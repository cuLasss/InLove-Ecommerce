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

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CLIENT_TYPES = [
  { id: "VAREJO", label: "Varejo" },
  { id: "CONSIGNADO", label: "Consignado" },
  { id: "ATACADO", label: "Atacado" }
]

export function ClientFormDialog({ open, onOpenChange, onSuccess }: ClientFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    mode: "onChange", // Validação em tempo real
    defaultValues: {
      name: "",
      birthday: "",
      whatsapp: "",
      types: [],
      city: ""
    }
  })

  // Limpar formulário sempre que o modal for aberto
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        birthday: "",
        whatsapp: "",
        types: [],
        city: ""
      })
    }
  }, [open, form])

  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 2) {
      return `(${numbers}`
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  const formatBirthday = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")
    
    // Aplica a máscara DD/MM/AAAA
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
    // Trigger validation immediately
    setTimeout(() => form.trigger("whatsapp"), 100)
  }

  const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBirthday(e.target.value)
    form.setValue("birthday", formatted)
    // Trigger validation immediately
    setTimeout(() => form.trigger("birthday"), 100)
  }

  const convertDateToISO = (dateStr: string) => {
    // Converte DD/MM/YYYY para YYYY-MM-DD
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true)
    try {
      await clientsApi.create({
        name: data.name,
        birthday: convertDateToISO(data.birthday),
        whatsapp: data.whatsapp,
        types: data.types,
        city: data.city || null
      })

      toast({
        title: "Cliente cadastrado com sucesso!",
        description: `${data.name} foi adicionado à sua lista de clientes.`
      })

      form.reset() // Limpar formulário após sucesso
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("❌ [ClientForm] Erro detalhado:", error)
      console.error("❌ [ClientForm] Dados enviados:", data)
      
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
      } else if (error?.message?.includes("date/time field")) {
        errorMessage = "Formato de data inválido. Use o formato DD/MM/AAAA."
      } else if (error?.message?.includes("categorias")) {
        errorMessage = error.message
      } else if (error?.message?.includes("WhatsApp já existe")) {
        errorMessage = "Este número de WhatsApp já está cadastrado para outro cliente."
      } else if (error?.message?.includes("duplicate key")) {
        errorMessage = "Já existe um cliente com estas informações."
      } else if (error?.message?.includes("violates check constraint")) {
        errorMessage = "Valores inválidos detectados. Verifique as categorias selecionadas."
      } else if (error?.message) {
        errorMessage = error.message
      }

      toast({
        title: "Erro ao cadastrar cliente",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[98vh] overflow-y-auto">        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente para cadastrá-lo no sistema.
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
                      onChange={(e) => {
                        field.onChange(e)
                        // Trigger validation after a short delay
                        setTimeout(() => form.trigger("name"), 100)
                      }}
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
                              const newTypes = [...field.value, type.id]
                              field.onChange(newTypes)
                              // Trigger validation immediately
                              form.trigger("types")
                            } else {
                              const newTypes = field.value.filter((t) => t !== type.id)
                              field.onChange(newTypes)
                              // Trigger validation immediately
                              form.trigger("types")
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
                onClick={() => {
                  form.reset() // Limpar formulário ao cancelar
                  onOpenChange(false)
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Salvando..." : "Salvar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}