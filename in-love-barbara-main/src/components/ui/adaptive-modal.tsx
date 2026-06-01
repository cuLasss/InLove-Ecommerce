import React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

interface AdaptiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

export function AdaptiveModal({ 
  open, 
  onOpenChange, 
  title, 
  children, 
  size = "md",
  className 
}: AdaptiveModalProps) {
  const isMobile = useIsMobile()

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl"
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className={cn("h-[85vh] rounded-t-lg", className)}
        >
          <SheetHeader className="pb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-full pb-6">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeClasses[size], "max-h-[85vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

interface ResponsiveFormProps {
  children: React.ReactNode
  columns?: number
  className?: string
}

export function ResponsiveForm({ children, columns = 2, className }: ResponsiveFormProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
      className
    )}>
      {children}
    </div>
  )
}