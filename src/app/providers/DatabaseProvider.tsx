import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useConnectivity } from '@/core/connectivity/ConnectivityProvider';
import {
  getThreadCacheRepository,
  initDatabaseRuntime,
  isDatabaseReady,
} from '@/core/database/database-runtime';
import { hydrateQueryClientFromThreadCache } from '@/core/database/hydrate-query-cache';
import { logger } from '@/core/logging/logger';
import { appQueryClient } from '@/core/query/query-client';
import {
  getThreadActionQueue,
  resetThreadActionQueue,
} from '@/features/inbox/actions/action-queue-runtime';
import { useTheme } from '@/shared/theme/ThemeProvider';

/**
 * Opens SQLite, hydrates Query + outbox, and flushes queued actions when online.
 */
export function DatabaseProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const connectivity = useConnectivity();
  const [ready, setReady] = useState(() => isDatabaseReady());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await initDatabaseRuntime();
        // Rebind the queue to the initialized repositories.
        resetThreadActionQueue();
        await hydrateQueryClientFromThreadCache(appQueryClient, getThreadCacheRepository());
        await getThreadActionQueue().hydrate();
        if (!cancelled) {
          setReady(true);
        }
      } catch (error) {
        logger.error('database bootstrap failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const online =
      connectivity.isConnected && connectivity.isInternetReachable !== false;
    if (online) {
      getThreadActionQueue().flushQueued();
    }
  }, [ready, connectivity.isConnected, connectivity.isInternetReachable]);

  if (!ready) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator accessibilityLabel="Loading local data" />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
