import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-96 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl font-bold text-primary mb-4">404</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Página não encontrada
            </h1>
            <p className="text-muted-foreground mb-6">
              A página que você está procurando não existe ou foi movida.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button asChild className="bg-primary hover:bg-primary-hover">
                <a href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default NotFound;
