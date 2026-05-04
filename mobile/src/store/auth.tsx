import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthService } from '../services/AuthService';
import { setApiAuthToken } from '../services/http';
import { clearSession, loadSession, saveSession, subscribeSession } from '../services/authSession';

type AuthState = {
  userEmail: string | null;
  userId: string | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAuthToken: (token: string, user: { id: string; email: string }, refreshToken?: string | null) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  userEmail: null,
  userId: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  setAuthToken: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await loadSession();
        if (mounted) {
          setUserEmail(session?.email ?? null);
          setUserId(session?.id ?? null);
          setToken(session?.token ?? null);
          setRefreshToken(session?.refreshToken ?? null);
          setApiAuthToken(session?.token ?? null);
        }
      } catch (err) {
        console.error('[Auth] Failed to restore session:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const unsubscribe = subscribeSession((session) => {
      if (!mounted) return;
      setUserEmail(session?.email ?? null);
      setUserId(session?.id ?? null);
      setToken(session?.token ?? null);
      setRefreshToken(session?.refreshToken ?? null);
      setApiAuthToken(session?.token ?? null);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const persistSession = useCallback(
    async (email: string, id: string, newToken: string, newRefreshToken?: string | null) => {
      await saveSession({
        email,
        id,
        token: newToken,
        refreshToken: newRefreshToken ?? null,
      });
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signIn(email, password);
    await persistSession(response.user.email, String(response.user.id), response.token, response.refreshToken ?? null);
  }, [persistSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signUp(email, password);
    await persistSession(response.user.email, String(response.user.id), response.token, response.refreshToken ?? null);
  }, [persistSession]);

  const signOut = useCallback(async () => {
    try {
      await clearSession();
    } catch (err) {
      console.error('[Auth] Failed to clear storage on sign out:', err);
    }
  }, []);

  const setAuthToken = useCallback(
    async (newToken: string, user: { id: string; email: string }, newRefreshToken?: string | null) => {
      await persistSession(user.email, user.id, newToken, newRefreshToken ?? null);
    },
    [persistSession],
  );

  const value = useMemo(
    () => ({ userEmail, userId, token, refreshToken, isLoading, signIn, signUp, signOut, setAuthToken }),
    [userEmail, userId, token, refreshToken, isLoading, signIn, signUp, signOut, setAuthToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
