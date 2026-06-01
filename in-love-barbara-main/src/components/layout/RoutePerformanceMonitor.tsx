import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { performanceMonitor } from '@/utils/performance';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Componente que monitora performance de navegação entre rotas
 * Adiciona logs detalhados e métricas de tempo de carregamento
 */
export function RoutePerformanceMonitor() {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);
  const navigationStartTime = useRef<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentPath = location.pathname;
    const now = performance.now();
    
    // Se é uma nova navegação (não é inicial)
    if (previousPath.current && previousPath.current !== currentPath) {
      const navigationTime = now - navigationStartTime.current;
      
      // Obter informações de conexão
      const connectionInfo = performanceMonitor.getConnectionInfo();
      
      // Medir tempo de renderização do componente
      const renderStartTime = performance.now();
      
      // Aguardar próximo frame para medir tempo de renderização
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const renderTime = performance.now() - renderStartTime;
          
          // Finalizar métrica de navegação (sem logs)
          const totalDuration = performanceMonitor.endNavigation(
            previousPath.current!,
            currentPath,
            {
              renderTime: `${renderTime.toFixed(2)}ms`,
              connection: connectionInfo.type,
              online: connectionInfo.online,
              queryCacheSize: queryClient.getQueryCache().getAll().length
            }
          );

          // ✅ Logs desabilitados - métricas ainda são coletadas internamente
          // mas não são exibidas no console
        });
      });
    }
    
    // Iniciar nova medição (sem logs)
    previousPath.current = currentPath;
    navigationStartTime.current = performance.now();
    performanceMonitor.startNavigation(previousPath.current || 'initial', currentPath);
    
    // ✅ Logs desabilitados - monitoramento de conexão continua funcionando
    // mas sem exibir warnings no console
  }, [location.pathname, queryClient]);

  return null; // Este componente não renderiza nada
}

