import { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface InfoChipProps {
  icon: ReactNode
  label: string
  value: string
  variant?: "default" | "secondary" | "outline"
  className?: string
  onClick?: () => void
  title?: string
}

export function InfoChip({ 
  icon, 
  label, 
  value, 
  variant = "outline", 
  className,
  onClick,
  title 
}: InfoChipProps) {
  return (
    <Badge 
      variant={variant} 
      className={cn(
        "gap-1.5 text-xs font-medium cursor-default",
        onClick && "cursor-pointer hover:bg-accent transition-colors",
        className
      )}
      onClick={onClick}
      title={title || `${label}: ${value}`}
    >
      {icon}
      <span className="truncate">{value}</span>
    </Badge>
  )
}