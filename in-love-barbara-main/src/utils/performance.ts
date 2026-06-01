/**
 * Utilitários de performance e monitoramento
 * Sistema de logs detalhado para monitorar navegação, carregamento de componentes e performance geral
 */

interface PerformanceMetric {
  type: 'navigation' | 'component_load' | 'query' | 'render' | 'network';
  label: string;
  duration: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private navigationStartTime: number = 0;
  private componentLoadTimes: Map<string, number> = new Map();
  private isOnline: boolean = navigator.onLine;
  private connectionType: string = 'unknown';

  constructor() {
    // Monitorar conexão de internet
    this.setupNetworkMonitoring();
    
    // Limpar métricas antigas periodicamente
    setInterval(() => this.cleanupOldMetrics(), 60000); // A cada 1 minuto
  }

  private setupNetworkMonitoring() {
    // Detectar tipo de conexão
    if ('connection' in navigator) {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        this.connectionType = conn.effectiveType || 'unknown';
        
        // Monitorar mudanças na conexão (sem logs)
        conn.addEventListener('change', () => {
          this.connectionType = conn.effectiveType || 'unknown';
          // ✅ Logs desabilitados - atualização de conexão continua funcionando
          // mas sem exibir logs no console
        });
      }
    }

    // Monitorar status online/offline (sem logs)
    window.addEventListener('online', () => {
      this.isOnline = true;
      // ✅ Logs desabilitados - monitoramento continua funcionando
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      // ✅ Logs desabilitados - monitoramento continua funcionando
    });
  }

  /**
   * Inicia medição de navegação (sem logs)
   */
  startNavigation(from: string, to: string) {
    this.navigationStartTime = performance.now();
    // ✅ Logs desabilitados - medição continua funcionando silenciosamente
  }

  /**
   * Finaliza medição de navegação
   */
  endNavigation(from: string, to: string, metadata?: Record<string, any>) {
    const duration = performance.now() - this.navigationStartTime;
    
    // Classificar velocidade baseado na conexão e tempo
    let severity: 'info' | 'warning' | 'error' = 'info';
    if (duration > 3000 || (!this.isOnline && duration > 1000)) {
      severity = 'error';
    } else if (duration > 1500 || this.connectionType === 'slow-2g' || this.connectionType === '2g') {
      severity = 'warning';
    }

    const metric: PerformanceMetric = {
      type: 'navigation',
      label: `Navegação: ${from} → ${to}`,
      duration,
      metadata: {
        ...metadata,
        from,
        to,
        connection: this.connectionType,
        online: this.isOnline,
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.logMetric(metric, severity);

    // Enviar para analytics se disponível (apenas em produção)
    if (import.meta.env.PROD && duration > 2000) {
      this.sendToAnalytics(metric);
    }

    return duration;
  }

  /**
   * Inicia medição de carregamento de componente
   */
  startComponentLoad(componentName: string) {
    this.componentLoadTimes.set(componentName, performance.now());
  }

  /**
   * Finaliza medição de carregamento de componente
   */
  endComponentLoad(componentName: string, metadata?: Record<string, any>) {
    const startTime = this.componentLoadTimes.get(componentName);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.componentLoadTimes.delete(componentName);

    const metric: PerformanceMetric = {
      type: 'component_load',
      label: `Componente carregado: ${componentName}`,
      duration,
      metadata: {
        ...metadata,
        component: componentName,
        connection: this.connectionType,
        online: this.isOnline
      },
      timestamp: Date.now()
    };

    this.metrics.push(metric);

    // Log apenas se demorar mais que 500ms
    if (duration > 500) {
      this.logMetric(metric, duration > 2000 ? 'error' : 'warning');
    }
  }

  /**
   * Log genérico de performance
   */
  log(type: PerformanceMetric['type'], label: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      type,
      label,
      duration,
      metadata,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // Manter apenas últimas 100 métricas
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Loga métrica com nível de severidade apropriado
   */
  private logMetric(metric: PerformanceMetric, severity: 'info' | 'warning' | 'error' = 'info') {
    const emoji = severity === 'error' ? '🐌' : severity === 'warning' ? '⚠️' : '⚡';
    const prefix = `[PERFORMANCE] ${emoji}`;
    
    const logData = {
      ...metric.metadata,
      duration: `${metric.duration.toFixed(2)}ms`,
      type: metric.type
    };

    try {
      if (severity === 'error') {
        console.error(`${prefix} ${metric.label}`, logData);
      } else if (severity === 'warning') {
        console.warn(`${prefix} ${metric.label}`, logData);
      } else {
        console.log(`${prefix} ${metric.label}`, logData);
      }
    } catch (e) {
      // Ignorar erros de log
    }
  }

  /**
   * Envia métricas para analytics (se configurado)
   */
  private sendToAnalytics(metric: PerformanceMetric) {
    try {
      // Aqui você pode integrar com seu serviço de analytics
      // Por exemplo: Google Analytics, Sentry, etc.
      if (window.gtag) {
        window.gtag('event', 'slow_navigation', {
          event_category: 'Performance',
          event_label: metric.label,
          value: Math.round(metric.duration)
        });
      }
    } catch (e) {
      // Ignorar erros de analytics
    }
  }

  /**
   * Remove métricas antigas
   */
  private cleanupOldMetrics() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);
  }

  /**
   * Obtém métricas recentes
   */
  getRecentMetrics(limit: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Obtém informações de conexão
   */
  getConnectionInfo() {
    return {
      online: this.isOnline,
      type: this.connectionType,
      // Adicionar mais informações se disponível
      ...(navigator.connection && {
        downlink: (navigator.connection as any).downlink,
        rtt: (navigator.connection as any).rtt,
        saveData: (navigator.connection as any).saveData
      })
    };
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook para medir performance de componente
 */
export function usePerformanceMeasure(componentName: string) {
  useEffect(() => {
    performanceMonitor.startComponentLoad(componentName);
    
    return () => {
      performanceMonitor.endComponentLoad(componentName);
    };
  }, [componentName]);
}

// Adicionar declaração para window.gtag se necessário
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Importar React para o hook
import { useEffect } from 'react';

