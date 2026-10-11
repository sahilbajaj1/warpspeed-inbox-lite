import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { colorTokens, type ColorSchemeName } from '@/shared/theme/tokens';

export type Theme = {
  scheme: ColorSchemeName;
  colors: (typeof colorTokens)[ColorSchemeName];
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const scheme: ColorSchemeName = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<Theme>(
    () => ({
      scheme,
      colors: colorTokens[scheme],
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
