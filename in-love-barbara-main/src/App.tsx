import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { PreloadWrapper } from "@/components/PreloadWrapper";
import { PageLoader } from "@/components/ui/PageLoader";
import { performanceMonitor } from "@/utils/performance";

// ✅ LAZY LOADING OTIMIZADO COM MÉTRICAS: Cada página é carregada apenas quando necessário
// Mas com métricas de performance para monitorar tempo de carregamento
// Isso garante que:
// 1. O site não trave ao carregar todas as páginas de uma vez
// 2. Os dados são sempre atualizados ao entrar na página
// 3. Melhor performance e experiência do usuário
// 4. Logs detalhados para monitorar performance

// Função auxiliar para lazy loading com métricas
const createLazyRoute = (importFn: () => Promise<any>, routeName: string) => {
  return lazy(() => {
    const startTime = performance.now();
    performanceMonitor.startComponentLoad(routeName);
    
    return importFn().then((module) => {
      const duration = performance.now() - startTime;
      performanceMonitor.endComponentLoad(routeName, {
        route: routeName,
        loadTime: duration
      });
      return module;
    }).catch((error) => {
      performanceMonitor.log('component_load', `Erro ao carregar ${routeName}`, performance.now() - startTime, {
        route: routeName,
        error: error.message
      });
      throw error;
    });
  });
};

const Clientes = createLazyRoute(() => import("./pages/Clientes"), "Clientes");
const Produtos = createLazyRoute(() => import("./pages/Produtos"), "Produtos");
const Varejo = createLazyRoute(() => import("./pages/Varejo"), "Varejo");
const VarejoNovo = createLazyRoute(() => import("./pages/VarejoNovo"), "VarejoNovo");
const VarejoSimplificado = createLazyRoute(() => import("./pages/VarejoSimplificado"), "VarejoSimplificado");
const Consignado = createLazyRoute(() => import("./pages/Consignado"), "Consignado");
const ConsignacaoNovo = createLazyRoute(() => import("./pages/ConsignacaoNovo"), "ConsignacaoNovo");
const ConsignacaoLotes = createLazyRoute(() => import("./pages/consignado/lotes/page"), "ConsignacaoLotes");
const ConsignacaoNova = createLazyRoute(() => import("./pages/consignado/nova/page"), "ConsignacaoNova");
const ConsignacaoLoteDetail = createLazyRoute(() => import("./pages/consignado/lotes/[id]/page"), "ConsignacaoLoteDetail");
const ConsignacaoLotesEntregues = createLazyRoute(() => import("./pages/consignado/lotes/entregues/page"), "ConsignacaoLotesEntregues");
const ConsignacaoAcerto = createLazyRoute(() => import("./pages/consignado/acerto/[id]/page"), "ConsignacaoAcerto");
const FolhaConsignacaoPage = createLazyRoute(() => import("./pages/consignado/FolhaConsignacaoPage"), "FolhaConsignacaoPage");
const Atacado = createLazyRoute(() => import("./pages/Atacado"), "Atacado");
const NotasFiscais = createLazyRoute(() => import("./pages/NotasFiscais"), "NotasFiscais");
const Aniversariantes = createLazyRoute(() => import("./pages/Aniversariantes"), "Aniversariantes");
const Colaboradoras = createLazyRoute(() => import("./pages/Colaboradoras"), "Colaboradoras");
const Financeiro = createLazyRoute(() => import("./pages/Financeiro"), "Financeiro");
const NotFound = createLazyRoute(() => import("./pages/NotFound"), "NotFound");

// ✅ OTIMIZAÇÃO: Layout Route que mantém AuthWrapper e AppLayout montados entre navegações
// Isso evita recriar esses componentes a cada mudança de rota, melhorando performance
const ProtectedLayout = () => (
  <AuthWrapper>
    <PreloadWrapper>
      <AppLayout>
        <Suspense fallback={<PageLoader message="Carregando página..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="/clientes" replace />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/varejo" element={<Varejo />} />
            <Route path="/varejo/novo" element={<VarejoNovo />} />
            <Route path="/varejo/simplificado" element={<VarejoSimplificado />} />
            <Route path="/consignado" element={<Consignado />} />
            <Route path="/consignado/novo" element={<ConsignacaoNovo />} />
            <Route path="/consignado/lotes" element={<ConsignacaoLotes />} />
            <Route path="/consignado/lotes/entregues" element={<ConsignacaoLotesEntregues />} />
            <Route path="/consignado/nova" element={<ConsignacaoNova />} />
            <Route path="/consignado/lotes/:id" element={<ConsignacaoLoteDetail />} />
            <Route path="/consignado/acerto/:id" element={<ConsignacaoAcerto />} />
            <Route path="/consignado/folha/:folhaCodigo" element={<FolhaConsignacaoPage />} />
            <Route path="/atacado" element={<Atacado />} />
            <Route path="/notas-fiscais" element={<NotasFiscais />} />
            <Route path="/aniversariantes" element={<Aniversariantes />} />
            <Route path="/colaboradoras" element={<Colaboradoras />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </PreloadWrapper>
  </AuthWrapper>
)

const App = () => (
  <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          <Route path="*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  )

export default App;
