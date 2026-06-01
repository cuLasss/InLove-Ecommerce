import React from "react"
import { cn } from "@/lib/utils"

interface TouchTargetProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function TouchTarget({ children, className, ...props }: TouchTargetProps) {
  return (
    <div 
      className={cn("touch-target", className)} 
      {...props}
    >
      {children}
    </div>
  )
}

interface MobileHiddenProps {
  children: React.ReactNode
  breakpoint?: "sm" | "md" | "lg"
}

export function MobileHidden({ children, breakpoint = "sm" }: MobileHiddenProps) {
  const breakpointClasses = {
    sm: "hidden sm:block",
    md: "hidden md:block", 
    lg: "hidden lg:block"
  }

  return (
    <div className={breakpointClasses[breakpoint]}>
      {children}
    </div>
  )
}

interface MobileOnlyProps {
  children: React.ReactNode
  breakpoint?: "sm" | "md" | "lg"
}

export function MobileOnly({ children, breakpoint = "sm" }: MobileOnlyProps) {
  const breakpointClasses = {
    sm: "block sm:hidden",
    md: "block md:hidden",
    lg: "block lg:hidden"
  }

  return (
    <div className={breakpointClasses[breakpoint]}>
      {children}
    </div>
  )
}