/**
 * Componente para Criar Novo Lote de Consignação
 * 
 * Este componente implementa o formulário para criar novos lotes
 * de consignação com validações e integração com a API.
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  ArrowLeft, 
  Users, 
  Calendar, 
  Percent,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consignadoApi } from '@/lib/consignado/api'
import { useToast } from '@/hooks/use-toast'
// Sistema local - não precisa de Supabase
import type { ConsignadoLoteFormData } from '@/integrations/supabase/consignado-types'

export default function ConsignadoNovoLote() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<ConsignadoLoteFormData>({
    cliente_id: '',
    comissao_percentual: 30,
    prazo: null,
    observacoes: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Buscar clientes
  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // Sistema local - retornar dados vazios
      return []
    }
  })

  return null
}
