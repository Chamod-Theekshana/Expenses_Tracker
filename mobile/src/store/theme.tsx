import React, { createContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, lightColors } from '../theme/colors';

export type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  colors: typeof colors;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    AsyncStorage.getItem('theme').then(t => { 
      if (t === 'light' || t === 'dark') {
        setThemeState(t);
      }
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    AsyncStorage.setItem('theme', t);
  };

  const currentColors = useMemo(() => {
    return theme === 'dark' ? colors : lightColors;
  }, [theme]);

  const value = useMemo(
    () => ({ theme, colors: currentColors, setTheme }),
    [theme, currentColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
