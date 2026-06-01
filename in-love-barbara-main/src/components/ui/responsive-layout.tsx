import React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps {
  children: React.ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: number
  className?: string
}

export function ResponsiveGrid({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 4 },
  gap = 4,
  className 
}: ResponsiveGridProps) {
  const gridClasses = cn(
    "grid",
    `gap-${gap}`,
    `grid-cols-${columns.mobile || 1}`,
    `lg:grid-cols-${columns.tablet || 2}`,
    `xl:grid-cols-${columns.desktop || 4}`,
    className
  )

  return (
    <div className={gridClasses}>
      {children}
    </div>
  )
}

interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "compact" | "full"
}

export function ResponsiveCard({ children, className, variant = "default" }: ResponsiveCardProps) {
  const cardClasses = cn(
    "bg-card text-card-foreground rounded-lg border shadow-sm",
    {
      "p-3 xs:p-4 sm:p-6": variant === "default",
      "p-2 xs:p-3 sm:p-4": variant === "compact", 
      "p-4 xs:p-6 sm:p-8": variant === "full"
    },
    className
  )

  return (
    <div className={cardClasses}>
      {children}
    </div>
  )
}

interface MobileStackProps {
  children: React.ReactNode
  className?: string
  spacing?: "tight" | "normal" | "loose"
}

export function MobileStack({ children, className, spacing = "normal" }: MobileStackProps) {
  const spaceClasses = {
    tight: "space-y-1 xs:space-y-2",
    normal: "space-y-2 xs:space-y-3 sm:space-y-4", 
    loose: "space-y-3 xs:space-y-4 sm:space-y-6"
  }

  return (
    <div className={cn("flex flex-col", spaceClasses[spacing], className)}>
      {children}
    </div>
  )
}