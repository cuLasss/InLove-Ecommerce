import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient<Database> | null = null;

function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
    );
  }
}

function getSupabaseClient(): SupabaseClient<Database> {
  assertSupabaseEnv();

  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'in-love-app',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return supabaseInstance;
}

function createLazyClient(): SupabaseClient<Database> {
  return new Proxy({} as SupabaseClient<Database>, {
    get(_target, prop) {
      const client = getSupabaseClient();
      const value = (client as any)[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

export const supabase = createLazyClient();

// Backward-compatible export. This must never use a service role key in the browser.
// Administrative operations should move to Supabase Edge Functions or another backend.
export const supabaseAdmin = supabase;

export async function authenticateSupabase() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return !error && Boolean(user);
  } catch {
    return false;
  }
}
