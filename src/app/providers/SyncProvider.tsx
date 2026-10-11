import { useEffect, type PropsWithChildren } from 'react';

import { useConnectivity } from '@/core/connectivity/ConnectivityProvider';
import { useAppLifecycle } from '@/core/lifecycle/AppLifecycleProvider';
import { startSyncRuntime, stopSyncRuntime } from '@/core/sync/sync-runtime';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Starts Socket.IO + sync catch-up while authenticated; stops on logout.
 */
export function SyncProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const connectivity = useConnectivity();
  const lifecycle = useAppLifecycle();

  useEffect(() => {
    if (status !== 'authenticated') {
      stopSyncRuntime();
      return;
    }

    const online =
      connectivity.isConnected && connectivity.isInternetReachable !== false;
    if (!online) {
      return;
    }

    void startSyncRuntime();
  }, [
    status,
    connectivity.isConnected,
    connectivity.isInternetReachable,
    lifecycle.isActive,
  ]);

  useEffect(() => {
    return () => {
      stopSyncRuntime();
    };
  }, []);

  return children;
}
