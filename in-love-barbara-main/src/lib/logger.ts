/**
 * Utilitário para logs condicionais baseados no ambiente
 * Em produção, logs sensíveis são desabilitados
 * Para desabilitar TODOS os logs, defina VITE_DISABLE_ALL_LOGS=true
 */

const isDevelopment = import.meta.env.DEV;
const enableDebugLogs = import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';
const disableAllLogs = import.meta.env.VITE_DISABLE_ALL_LOGS === 'true';

export const logger = {
  // Logs sempre visíveis (erros críticos) - desabilitados se VITE_DISABLE_ALL_LOGS=true
  error: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // console.error(`[ERROR] ${message}`, ...args);
  },

  // Logs apenas em desenvolvimento ou quando habilitado
  debug: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // if (isDevelopment || enableDebugLogs) {
    //   console.log(`[DEBUG] ${message}`, ...args);
    // }
  },

  // Logs de informação (sempre visíveis) - desabilitados se VITE_DISABLE_ALL_LOGS=true
  info: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // console.info(`[INFO] ${message}`, ...args);
  },

  // Logs de aviso (sempre visíveis) - desabilitados se VITE_DISABLE_ALL_LOGS=true
  warn: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // console.warn(`[WARN] ${message}`, ...args);
  },

  // Logs de segurança (apenas em desenvolvimento)
  security: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // if (isDevelopment) {
    //   console.log(`[SECURITY] ${message}`, ...args);
    // }
  },

  // Logs de API (apenas em desenvolvimento)
  api: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // if (isDevelopment || enableDebugLogs) {
    //   console.log(`[API] ${message}`, ...args);
    // }
  },

  // Logs de autenticação (apenas em desenvolvimento)
  auth: (message: string, ...args: any[]) => {
    if (disableAllLogs) return;
    // if (isDevelopment) {
    //   console.log(`[AUTH] ${message}`, ...args);
    // }
  }
};

export default logger;
