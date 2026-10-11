import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, Platform } from 'react-native';

let wired = false;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnReconnect: true,
      },
    },
  });
}

export const appQueryClient = createAppQueryClient();

/** Wire React Query to NetInfo + AppState once at app start. */
export function wireReactQueryLifecycle(): () => void {
  if (wired) {
    return () => undefined;
  }
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(online);
    }),
  );

  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active');
    }
  };
  const subscription = AppState.addEventListener('change', onAppStateChange);

  return () => {
    subscription.remove();
    wired = false;
  };
}
