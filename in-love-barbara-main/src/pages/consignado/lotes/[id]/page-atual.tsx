import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// Sistema local - não precisa de Supabase
import { GerenciarFolha } from '@/components/consignado/GerenciarFolha'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FolhaInfo {
  id: string
  codigo: string
  cliente_name: string
  created_at: string
  prazo: string
  status: string
}

export default function ConsignacaoLoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [folhaInfo, setFolhaInfo] = useState<FolhaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar informações da folha
  useEffect(() => {
    const fetchFolhaInfo = async () => {
      if (!id) return

      try {
        setIsLoading(true)
        setError(null)

        // Sistema local - retornar dados vazios
        console.log('Buscando lote (modo local)')
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchFolhaInfo()
  }, [id])

  return null
}
