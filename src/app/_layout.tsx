import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/app/providers/AppProviders';
import { RootErrorBoundary } from '@/app/providers/RootErrorBoundary';

export { RootErrorBoundary as ErrorBoundary };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(main)" />
      </Stack>
    </AppProviders>
  );
}
