import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import { setApiAuthToken } from '../services/http';

type AuthState = {
  userEmail: string | null;
  userId: string | null;
  token: string | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setAuthToken: (token: string, user: { id: string; email: string }) => Promise<void>;
};

const STORAGE_KEY = 'expense_tracker_auth_v1';

export const AuthContext = createContext<AuthContextValue>({
  userEmail: null,
  userId: null,
  token: null,
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
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const restoredToken = parsed?.token ?? null;
          setUserEmail(parsed?.email ?? null);
          setUserId(parsed?.id ?? null);
          setToken(restoredToken);
          setApiAuthToken(restoredToken);
        }
      } catch (err) {
        console.error('[Auth] Failed to restore session:', err);
        // Clear corrupted storage
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(
    async (email: string, id: string, newToken: string) => {
      const data = { email, id, token: newToken };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setUserEmail(email);
      setUserId(id);
      setToken(newToken);
      setApiAuthToken(newToken);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signIn(email, password);
    await persistSession(response.user.email, String(response.user.id), response.token);
  }, [persistSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signUp(email, password);
    await persistSession(response.user.email, String(response.user.id), response.token);
  }, [persistSession]);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[Auth] Failed to clear storage on sign out:', err);
    } finally {
      setUserEmail(null);
      setUserId(null);
      setToken(null);
      setApiAuthToken(null);
    }
  }, []);

  const setAuthToken = useCallback(
    async (newToken: string, user: { id: string; email: string }) => {
      await persistSession(user.email, user.id, newToken);
    },
    [persistSession],
  );

  const value = useMemo(
    () => ({ userEmail, userId, token, isLoading, signIn, signUp, signOut, setAuthToken }),
    [userEmail, userId, token, isLoading, signIn, signUp, signOut, setAuthToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
