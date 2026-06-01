import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommissionInputProps {
  value: number | string
  onChange: (value: string) => void
  onSave?: () => void
  onCancel?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  min?: string
  max?: string
  step?: string
}

export function CommissionInput({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = "0",
  className,
  autoFocus = false,
  min = "0",
  max = "100",
  step = "0.01"
}: CommissionInputProps) {
  const [internalValue, setInternalValue] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Inicializar valor apenas uma vez quando o componente monta
  useEffect(() => {
    if (!isInitialized) {
      const displayValue = value === '' || value === null || value === undefined 
        ? '' 
        : String(value)
      setInternalValue(displayValue)
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  // Auto focus quando solicitado
  useEffect(() => {
    if (autoFocus && inputRef.current && isInitialized) {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [autoFocus, isInitialized])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange(newValue)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Selecionar todo o texto para facilitar edição
    setTimeout(() => {
      e.target.select()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSave) {
      e.preventDefault()
      onSave()
    }
    
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }

    // Permitir navegação e edição
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ]

    // Permitir números, ponto decimal e teclas de controle
    const isNumber = /^[0-9]$/.test(e.key)
    const isDecimal = e.key === '.' && !internalValue.includes('.')
    const isControlKey = e.ctrlKey || e.metaKey
    const isAllowedKey = allowedKeys.includes(e.key)

    if (!isNumber && !isDecimal && !isControlKey && !isAllowedKey) {
      e.preventDefault()
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={cn("text-center", className)}
        autoComplete="off"
        spellCheck={false}
      />
      <span className="text-xs text-muted-foreground">%</span>
      
      {/* Botões simples e profissionais */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onSave}
        className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-700 transition-none"
        title="Salvar"
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-700 transition-none"
        title="Cancelar"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}