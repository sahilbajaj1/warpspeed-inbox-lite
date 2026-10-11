import type { SQLiteDatabase } from 'expo-sqlite';

import { openAppDatabase } from '@/core/database/database';
import {
  createMemoryOutboxRepository,
  createSqliteOutboxRepository,
  type OutboxRepository,
} from '@/core/database/outbox-repository';
import {
  createMemoryThreadCacheRepository,
  createSqliteThreadCacheRepository,
  type ThreadCacheRepository,
} from '@/core/database/thread-cache-repository';
import { logger } from '@/core/logging/logger';
import {
  createMemorySyncCursorStore,
  createSqliteSyncCursorStore,
  type SyncCursorStore,
} from '@/core/sync/sync-cursor-store';
import {
  createMemoryTombstoneStore,
  createSqliteTombstoneStore,
  type TombstoneStore,
} from '@/core/sync/tombstone-store';

type DatabaseRuntime = {
  db: SQLiteDatabase | null;
  outbox: OutboxRepository;
  threadCache: ThreadCacheRepository;
  syncCursor: SyncCursorStore;
  tombstones: TombstoneStore;
  ready: boolean;
};

let runtime: DatabaseRuntime | null = null;

function createDefaultRuntime(): DatabaseRuntime {
  return {
    db: null,
    outbox: createMemoryOutboxRepository(),
    threadCache: createMemoryThreadCacheRepository(),
    syncCursor: createMemorySyncCursorStore(),
    tombstones: createMemoryTombstoneStore(),
    ready: false,
  };
}

export async function initDatabaseRuntime(): Promise<DatabaseRuntime> {
  if (runtime?.ready && runtime.db) {
    return runtime;
  }

  try {
    const db = await openAppDatabase();
    runtime = {
      db,
      outbox: createSqliteOutboxRepository(db),
      threadCache: createSqliteThreadCacheRepository(db),
      syncCursor: createSqliteSyncCursorStore(db),
      tombstones: createSqliteTombstoneStore(db),
      ready: true,
    };
    logger.info('sqlite database ready');
    return runtime;
  } catch (error) {
    // Jest / unsupported platforms fall back to memory so unit tests stay hermetic.
    logger.warn('sqlite unavailable; using in-memory persistence', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    runtime = {
      db: null,
      outbox: createMemoryOutboxRepository(),
      threadCache: createMemoryThreadCacheRepository(),
      syncCursor: createMemorySyncCursorStore(),
      tombstones: createMemoryTombstoneStore(),
      ready: true,
    };
    return runtime;
  }
}

function ensureRuntime(): DatabaseRuntime {
  if (!runtime) {
    runtime = createDefaultRuntime();
  }
  return runtime;
}

export function getOutboxRepository(): OutboxRepository {
  return ensureRuntime().outbox;
}

export function getThreadCacheRepository(): ThreadCacheRepository {
  return ensureRuntime().threadCache;
}

export function getSyncCursorStore(): SyncCursorStore {
  return ensureRuntime().syncCursor;
}

export function getTombstoneStore(): TombstoneStore {
  return ensureRuntime().tombstones;
}

export function isDatabaseReady(): boolean {
  return runtime?.ready ?? false;
}

export async function clearPersistedUserData(): Promise<void> {
  const current = ensureRuntime();
  await current.outbox.clearAll();
  await current.threadCache.clearAll();
  await current.syncCursor.clear();
  await current.tombstones.clearAll();
  logger.info('cleared persisted user data');
}

/** Test-only: inject memory repositories without opening native SQLite. */
export function __resetDatabaseRuntimeForTests(next?: {
  outbox?: OutboxRepository;
  threadCache?: ThreadCacheRepository;
  syncCursor?: SyncCursorStore;
  tombstones?: TombstoneStore;
}): void {
  runtime = {
    db: null,
    outbox: next?.outbox ?? createMemoryOutboxRepository(),
    threadCache: next?.threadCache ?? createMemoryThreadCacheRepository(),
    syncCursor: next?.syncCursor ?? createMemorySyncCursorStore(),
    tombstones: next?.tombstones ?? createMemoryTombstoneStore(),
    ready: true,
  };
}
