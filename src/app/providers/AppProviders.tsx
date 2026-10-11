import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ConnectivityProvider } from '@/core/connectivity/ConnectivityProvider';
import { AppLifecycleProvider } from '@/core/lifecycle/AppLifecycleProvider';
import { appQueryClient, wireReactQueryLifecycle } from '@/core/query/query-client';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';

const defaultInitialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => wireReactQueryLifecycle(), []);

  return (
    <SafeAreaProvider initialMetrics={defaultInitialMetrics}>
      <ThemeProvider>
        <QueryClientProvider client={appQueryClient}>
          <ConnectivityProvider>
            <AppLifecycleProvider>
              <AuthProvider>{children}</AuthProvider>
            </AppLifecycleProvider>
          </ConnectivityProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
