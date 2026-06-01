import React, { createContext, useContext, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { authService, AuthSession, AuthUser } from '@/lib/auth-service';

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  forceSupabaseAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const currentSession = await authService.getCurrentSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
        }
      } catch (error) {
        logger.auth('Erro ao carregar sessao:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authService.signIn(email, password);

      if (result.data.user && result.data.session) {
        setUser(result.data.user);
        setSession(result.data.session);
      }

      return result;
    } catch (error) {
      logger.auth('Erro no login:', error);
      return { data: { user: null, session: null }, error: { message: 'Erro no login' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await authService.signUp(email, password);

      if (result.data.user && result.data.session) {
        setUser(result.data.user);
        setSession(result.data.session);
      }

      return result;
    } catch (error) {
      logger.auth('Erro no cadastro:', error);
      return { data: { user: null, session: null }, error: { message: 'Erro no cadastro' } };
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
  };

  const forceSupabaseAuth = async () => authService.forceSupabaseAuth();

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    forceSupabaseAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
