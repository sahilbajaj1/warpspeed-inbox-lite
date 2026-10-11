import { useEffect, useRef, type PropsWithChildren } from 'react';

import { useConnectivity } from '@/core/connectivity/ConnectivityProvider';
import { useAppLifecycle } from '@/core/lifecycle/AppLifecycleProvider';
import { runForegroundRecovery } from '@/core/sync/foreground-recovery';
import { startSyncRuntime, stopSyncRuntime } from '@/core/sync/sync-runtime';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Starts Socket.IO + sync catch-up while authenticated; recovers on foreground.
 */
export function SyncProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const connectivity = useConnectivity();
  const lifecycle = useAppLifecycle();
  const wasActiveRef = useRef(lifecycle.isActive);

  const online =
    connectivity.isConnected && connectivity.isInternetReachable !== false;

  useEffect(() => {
    if (status !== 'authenticated') {
      stopSyncRuntime();
      return;
    }

    if (!online) {
      return;
    }

    void startSyncRuntime();
  }, [status, online]);

  useEffect(() => {
    const becameActive = lifecycle.isActive && !wasActiveRef.current;
    wasActiveRef.current = lifecycle.isActive;

    if (status !== 'authenticated' || !online || !becameActive) {
      return;
    }

    void runForegroundRecovery();
  }, [status, online, lifecycle.isActive]);

  useEffect(() => {
    return () => {
      stopSyncRuntime();
    };
  }, []);

  return children;
}
