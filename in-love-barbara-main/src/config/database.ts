const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const DATABASE_CONFIG = {
  mode: 'supabase' as 'local' | 'supabase',

  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },

  local: {
    simulateNetworkDelay: true,
    delayMs: 100,
    persistData: true,
    enableLogs: import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
  },
};

export const isLocalMode = () => DATABASE_CONFIG.mode === 'local';

export const isSupabaseMode = () => DATABASE_CONFIG.mode === 'supabase';

export const switchToSupabase = () => {
  DATABASE_CONFIG.mode = 'supabase';
};

export const switchToLocal = () => {
  DATABASE_CONFIG.mode = 'local';
};
