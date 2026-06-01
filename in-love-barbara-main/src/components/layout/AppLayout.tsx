import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { TopBar } from "./TopBar"
import { RouteCleaner } from "./RouteCleaner"
import { RoutePerformanceMonitor } from "./RoutePerformanceMonitor"
import { Suspense, useEffect, useRef } from "react"
import { DataLoader } from "@/components/ui/PageLoader"
import { GlobalPageLoader } from "@/components/ui/GlobalPageLoader"
import { useLocation } from "react-router-dom"

interface AppLayoutProps {
  children: React.ReactNode
}

function LayoutContent({ children }: AppLayoutProps) {
  const { setOpen } = useSidebar()
  
  // Garantir que o sidebar fique aberto em telas >= 768px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setOpen(true)
      }
    }
    
    // Executar imediatamente
    handleResize()
    
    // Adicionar listener
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [setOpen])
  
  return (
    <>
      <RouteCleaner />
      <RoutePerformanceMonitor />
      <GlobalPageLoader />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 responsive-padding overflow-hidden">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <Suspense fallback={<DataLoader message="Carregando dados da página..." />}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  // ✅ OTIMIZAÇÃO: usePageRefresh removido - não é necessário recarregar dados a cada navegação
  // O cache do React Query já gerencia isso de forma eficiente
  
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}