import { supabase } from '@/integrations/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  whatsapp?: string;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  expires_at: number;
}

const emptyAuthData = {
  user: null,
  session: null,
};

function toAuthUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name,
    role: user.user_metadata?.role || user.app_metadata?.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
    active: true,
  };
}

function toAuthSession(session: Session): AuthSession {
  return {
    user: toAuthUser(session.user),
    access_token: session.access_token,
    expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + 60 * 60 * 1000,
  };
}

class AuthService {
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.session || !data.user) {
        return {
          data: emptyAuthData,
          error: error || { message: 'Sessao nao criada pelo Supabase' },
        };
      }

      const session = toAuthSession(data.session);
      return {
        data: {
          user: session.user,
          session,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: emptyAuthData,
        error: {
          message: error instanceof Error ? error.message : 'Erro interno no login',
        },
      };
    }
  }

  async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        return {
          data: emptyAuthData,
          error,
        };
      }

      if (!data.session || !data.user) {
        return {
          data: emptyAuthData,
          error: null,
        };
      }

      const session = toAuthSession(data.session);
      return {
        data: {
          user: session.user,
          session,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: emptyAuthData,
        error: {
          message: error instanceof Error ? error.message : 'Erro interno no cadastro',
        },
      };
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return null;
      }

      return toAuthSession(session);
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return Boolean(session && session.expires_at > Date.now());
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await this.getCurrentSession();
    return session?.user || null;
  }

  async forceSupabaseAuth(): Promise<boolean> {
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
}

export const authService = new AuthService();

export const useAuthService = () => ({
  signIn: authService.signIn.bind(authService),
  signUp: authService.signUp.bind(authService),
  signOut: authService.signOut.bind(authService),
  getCurrentSession: authService.getCurrentSession.bind(authService),
  getCurrentUser: authService.getCurrentUser.bind(authService),
  isAuthenticated: authService.isAuthenticated.bind(authService),
  forceSupabaseAuth: authService.forceSupabaseAuth.bind(authService),
});
