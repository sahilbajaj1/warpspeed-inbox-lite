import { type PropsWithChildren } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';

const defaultInitialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** UI provider stack without AuthProvider (avoids bootstrap races in unit tests). */
export function UiProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={defaultInitialMetrics}>
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}
