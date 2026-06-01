import React from "react"
import { cn } from "@/lib/utils"

interface PageShellProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
  padding?: "sm" | "md" | "lg"
}

export function PageShell({ 
  children, 
  className, 
  maxWidth = "full", 
  padding = "md" 
}: PageShellProps) {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl", 
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "w-full"
  }

  const paddingClasses = {
    sm: "space-y-4",
    md: "space-y-6",
    lg: "space-y-8"
  }

  return (
    <div className={cn(
      "w-full mx-auto responsive-padding",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 xs:gap-3 sm:gap-4", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-xs xs:text-sm lg:text-base text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col tablet:flex-row flex-wrap items-stretch tablet:items-center gap-2 xs:gap-3 min-w-0">
          {actions}
        </div>
      )}
    </div>
  )
}