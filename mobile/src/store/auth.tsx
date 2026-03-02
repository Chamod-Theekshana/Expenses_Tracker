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

const KEY = 'expense_tracker_auth_v1';

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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUserEmail(parsed?.email ?? null);
          setUserId(parsed?.id ?? null);
          setToken(parsed?.token ?? null);
          setApiAuthToken(parsed?.token ?? null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signIn(email, password);
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ email: response.user.email, id: String(response.user.id), token: response.token }),
    );
    setUserEmail(response.user.email);
    setUserId(String(response.user.id));
    setToken(response.token);
    setApiAuthToken(response.token);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signUp(email, password);
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ email: response.user.email, id: String(response.user.id), token: response.token }),
    );
    setUserEmail(response.user.email);
    setUserId(String(response.user.id));
    setToken(response.token);
    setApiAuthToken(response.token);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setUserEmail(null);
    setUserId(null);
    setToken(null);
    setApiAuthToken(null);
  }, []);

  const setAuthToken = useCallback(async (newToken: string, user: { id: string; email: string }) => {
    const data = { email: user.email, id: user.id, token: newToken };
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    setUserEmail(user.email);
    setUserId(user.id);
    setToken(newToken);
    setApiAuthToken(newToken);
  }, []);

  const value = useMemo(
    () => ({ userEmail, userId, token, isLoading, signIn, signUp, signOut, setAuthToken }),
    [userEmail, userId, token, isLoading, signIn, signUp, signOut, setAuthToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
