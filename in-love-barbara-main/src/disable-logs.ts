/**
 * ⚠️ DESABILITA TODOS OS LOGS DO CONSOLE ⚠️
 * 
 * Este arquivo é importado PRIMEIRO, antes de qualquer outro código,
 * para garantir que todos os console.log/warn/error sejam desabilitados.
 * 
 * Para HABILITAR logs:
 * 1. Crie um arquivo .env.local com: VITE_DISABLE_ALL_LOGS=false
 * 2. OU comente a linha de import no main.tsx
 */

// ✅ CRÍTICO: Executar IMEDIATAMENTE, antes de qualquer outro código
// Por padrão, logs estão DESABILITADOS (true)
// Para habilitar, defina VITE_DISABLE_ALL_LOGS=false no .env.local
const DISABLE_LOGS = import.meta.env.VITE_DISABLE_ALL_LOGS !== 'false';

// ✅ OTIMIZAÇÃO: Executar sincronamente, sem esperar
(function disableConsoleLogs() {
  if (DISABLE_LOGS) {
    // Função vazia para substituir todos os métodos do console
    const noop = () => {};
    
    // ✅ CRÍTICO: Sobrescrever TODOS os métodos do console IMEDIATAMENTE
    // Isso garante que mesmo logs executados no top-level de outros módulos sejam desabilitados
    try {
      Object.defineProperty(console, 'log', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'info', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'warn', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'error', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'debug', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'trace', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'dir', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'dirxml', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'group', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'groupCollapsed', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'groupEnd', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'table', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'time', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'timeEnd', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'timeLog', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'count', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'countReset', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'assert', { value: noop, writable: false, configurable: false });
      Object.defineProperty(console, 'clear', { value: noop, writable: false, configurable: false });
    } catch (e) {
      // Fallback: se Object.defineProperty falhar, usar atribuição direta
      const noop = () => {};
      console.log = noop;
      console.info = noop;
      console.warn = noop;
      console.error = noop;
      console.debug = noop;
      console.trace = noop;
      console.dir = noop;
      console.dirxml = noop;
      console.group = noop;
      console.groupCollapsed = noop;
      console.groupEnd = noop;
      console.table = noop;
      console.time = noop;
      console.timeEnd = noop;
      console.timeLog = noop;
      console.count = noop;
      console.countReset = noop;
      console.assert = noop;
      console.clear = noop;
    }
  }
})();

export {}; // Para tornar este um módulo ES

