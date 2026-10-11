import { apiClient } from '@/core/api/api-singleton';
import { getSessionManager } from '@/core/auth/auth-runtime';
import {
  getSyncCursorStore,
  getThreadCacheRepository,
  getTombstoneStore,
} from '@/core/database/database-runtime';
import { logger } from '@/core/logging/logger';
import { appQueryClient } from '@/core/query/query-client';
import { createThreadEventApplier } from '@/core/sync/apply-thread-event';
import { createRealtimeClient, type RealtimeClient } from '@/core/sync/realtime-client';
import { createSyncApi } from '@/core/sync/sync-api';
import { createSyncEngine, type SyncEngine } from '@/core/sync/sync-engine';
import { getCreditsStore } from '@/features/credits/credits-store';
import { getThreadActionQueue } from '@/features/inbox/actions/action-queue-runtime';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

type SyncRuntime = {
  engine: SyncEngine;
  realtime: RealtimeClient;
  started: boolean;
};

let runtime: SyncRuntime | null = null;

function buildRuntime(): SyncRuntime {
  const applier = createThreadEventApplier({
    queryClient: appQueryClient,
    threadCache: getThreadCacheRepository(),
    tombstones: getTombstoneStore(),
    actionQueue: getThreadActionQueue(),
  });

  const engine = createSyncEngine({
    syncApi: createSyncApi(apiClient),
    cursorStore: getSyncCursorStore(),
    applier,
    async onBaselineReload() {
      // Preserve outbox; invalidate mailbox queries so lists reload from server.
      await appQueryClient.invalidateQueries({ queryKey: inboxQueryKeys.all });
      logger.info('baseline reload after sync 410');
    },
  });

  const session = getSessionManager();
  const realtime = createRealtimeClient({
    getAccessToken: () => session.getAccessToken(),
    refreshAccessToken: () => session.refreshAccessToken(),
    onThreadEvent: (event) => engine.handleRealtimeEvent(event),
    onBalanceUpdated: (balance) => getCreditsStore().setBalance(balance, 'socket'),
  });

  return { engine, realtime, started: false };
}

export function getSyncEngine(): SyncEngine {
  if (!runtime) {
    runtime = buildRuntime();
  }
  return runtime.engine;
}

export async function startSyncRuntime(): Promise<void> {
  if (!runtime) {
    runtime = buildRuntime();
  }
  if (runtime.started) {
    await runtime.engine.catchUp();
    return;
  }

  await getTombstoneStore().hydrate();
  runtime.engine.beginBuffering();
  await runtime.realtime.start();
  runtime.started = true;
  await runtime.engine.catchUp();
  logger.info('sync runtime started');
}

export function stopSyncRuntime(): void {
  if (!runtime) {
    return;
  }
  runtime.realtime.stop();
  runtime.started = false;
  logger.info('sync runtime stopped');
}

export function __resetSyncRuntimeForTests(): void {
  stopSyncRuntime();
  runtime = null;
}
