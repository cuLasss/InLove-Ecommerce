import { useState, useEffect } from "react"
import { 
  Users, 
  ShoppingCart, 
  Package, 
  Handshake,
  FileText,
  Gift,
  DollarSign,
  UserCog,
  TrendingUp,
  LogOut,
  X
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const mainItems = [
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Varejo", url: "/varejo", icon: ShoppingCart },
  { title: "Consignado", url: "/consignado", icon: Handshake },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Atacado", url: "/atacado", icon: Package },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileText },
  { title: "Financeiro", url: "/financeiro", icon: TrendingUp },
  { title: "Aniversariantes", url: "/aniversariantes", icon: Gift },
  { title: "Colaboradoras", url: "/colaboradoras", icon: UserCog },
]

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"
  const { signOut, user } = useAuth()
  
  // Estado para detectar se é mobile/pequenas telas (abaixo de 768px)
  const [isMobile, setIsMobile] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)

  // Detecta tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // Para auto-fechar ao navegar
      setIsSmallMobile(window.innerWidth <= 500) // Para mostrar botão X
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Função para fechar sidebar em mobile ao clicar em um link (só abaixo de 768px)
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Função para mapear email para nome do usuário
  const getUserNameFromEmail = (email: string): { name: string; initial: string } => {
    const emailLower = email.toLowerCase()
    
    if (emailLower.includes('lucas')) {
      return { name: 'Lucas', initial: 'L' }
    } else if (emailLower.includes('victor') || emailLower.includes('bitas')) {
      return { name: 'Victor', initial: 'V' }
    } else if (emailLower.includes('barbara')) {
      return { name: 'Barbara', initial: 'B' }
    } else {
      // Fallback para outros emails
      const emailParts = email.split('@')[0]
      const name = emailParts.charAt(0).toUpperCase() + emailParts.slice(1)
      return { name, initial: name.charAt(0).toUpperCase() }
    }
  }

  const userInfo = user ? getUserNameFromEmail(user.email) : { name: 'Usuário', initial: 'U' }

  const handleLogout = async () => {
    await signOut()
  }

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }
  
  const getNavCls = (path: string) => 
    isActive(path) 
      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
      : "hover:bg-sidebar-accent text-sidebar-foreground"

  // ✅ OTIMIZAÇÃO: Pré-carregar páginas ao passar o mouse (prefetch inteligente)
  const prefetchPage = (path: string) => {
    // Mapear caminhos para componentes lazy
    const pathToComponent: Record<string, () => Promise<any>> = {
      '/clientes': () => import("@/pages/Clientes"),
      '/produtos': () => import("@/pages/Produtos"),
      '/varejo': () => import("@/pages/Varejo"),
      '/consignado': () => import("@/pages/Consignado"),
      '/atacado': () => import("@/pages/Atacado"),
      '/notas-fiscais': () => import("@/pages/NotasFiscais"),
      '/aniversariantes': () => import("@/pages/Aniversariantes"),
      '/colaboradoras': () => import("@/pages/Colaboradoras"),
      '/financeiro': () => import("@/pages/Financeiro"),
    }
    
    const componentLoader = pathToComponent[path]
    if (componentLoader && !isActive(path)) {
      // Pré-carregar apenas se não estiver na página ativa
      componentLoader().catch(() => {
        // Ignorar erros de prefetch silenciosamente
      })
    }
  }

  return (
    <Sidebar
      className={collapsed ? "w-12 xs:w-14 sm:w-16" : "w-48 xs:w-52 sm:w-56 md:w-60 lg:w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 xs:gap-3 px-2 xs:px-3 sm:px-4 py-3 xs:py-4">
          <div className="flex items-center gap-2 xs:gap-3">
            <div className="flex h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg overflow-hidden">
              <img 
                src="/homepage.jpg" 
                alt="IN LOVE Logo" 
                className="h-full w-full object-cover"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-xs xs:text-sm font-semibold text-sidebar-foreground">IN LOVE</span>
                <span className="text-xs text-muted-foreground hidden xs:block">Moda Íntima</span>
              </div>
            )}
          </div>
          {/* Botão de fechar - apenas telas até 500px */}
          {isSmallMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setOpenMobile(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls(item.url)}
                      onClick={handleNavClick}
                      onMouseEnter={() => prefetchPage(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <SidebarMenuButton className="hover:bg-red-500 hover:text-white transition-colors duration-200 text-red-600">
                      <LogOut className="h-4 w-4" />
                      {!collapsed && <span>Sair</span>}
                    </SidebarMenuButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza que deseja sair?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você será desconectado da sua conta e precisará fazer login novamente para acessar o sistema.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sim, sair
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 xs:gap-3 px-2 xs:px-3 sm:px-4 py-2 xs:py-3">
          <div className="flex h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-gold text-white text-xs xs:text-sm font-medium">
            {userInfo.initial}
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs xs:text-sm font-medium text-sidebar-foreground">{userInfo.name}</span>
              <span className="text-xs text-muted-foreground hidden xs:block">Administrador</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}