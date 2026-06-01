import { useState, useEffect } from "react";
import { Menu, LogOut, User, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GlobalProductScannerModal } from "@/components/GlobalProductScannerModal";

export function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scannerOpen, setScannerOpen] = useState(false);
  const { signOut, user } = useAuth()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <header className="flex h-12 xs:h-14 sm:h-16 items-center justify-between border-b border-border bg-background px-2 xs:px-3 sm:px-4 lg:px-6 shadow-card">
        <div className="flex items-center gap-1 xs:gap-2 sm:gap-4">
          <SidebarTrigger className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 lg:hidden" />
          <div className="hidden md:flex flex-col">
            <span className="text-xs xs:text-sm font-medium text-foreground">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(currentTime)}
            </span>
          </div>
          {/* Time only for mobile */}
          <div className="md:hidden">
            <span className="text-xs xs:text-sm font-medium text-foreground">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Scanner - visível apenas em telas <= 768px */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setScannerOpen(true)}
            className="gap-1 xs:gap-2 h-8 xs:h-9 sm:h-10 hidden max-[900px]:inline-flex"
          >
            <ScanLine className="h-3 w-3 xs:h-4 xs:w-4" />
            <span className="hidden xs:inline text-xs xs:text-sm">Scanner</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 xs:gap-2 h-8 xs:h-9 sm:h-10">
                <User className="h-3 w-3 xs:h-4 xs:w-4" />
                <span className="hidden lg:inline text-xs xs:text-sm">{user?.email || 'Usuário'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 xs:w-48">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive text-xs xs:text-sm">
                <LogOut className="mr-2 h-3 w-3 xs:h-4 xs:w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal de Scanner Global */}
      <GlobalProductScannerModal 
        open={scannerOpen} 
        onOpenChange={setScannerOpen} 
      />
    </>
  );
}