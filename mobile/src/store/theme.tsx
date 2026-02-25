import React, { createContext, useState, useEffect, useMemo } from 'react';
import { colors, lightColors } from '../theme/colors';

type Theme = 'dark' | 'light';

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
  const [theme, setTheme] = useState<Theme>('dark');

  const currentColors = useMemo(() => {
    return theme === 'dark' ? colors : lightColors;
  }, [theme]);

  const value = useMemo(
    () => ({ theme, colors: currentColors, setTheme }),
    [theme, currentColors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
