import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import { User } from '../models/User';

const KEY = 'expense_tracker_auth_v1';

export const useAuthViewModel = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signIn(email, password);
    await AsyncStorage.setItem(KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await AuthService.signUp(email, password);
    await AsyncStorage.setItem(KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setUser(null);
  }, []);

  return { user, isLoading, loadUser, signIn, signUp, signOut };
};
