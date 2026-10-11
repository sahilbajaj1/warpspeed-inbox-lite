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

type DatabaseRuntime = {
  db: SQLiteDatabase | null;
  outbox: OutboxRepository;
  threadCache: ThreadCacheRepository;
  ready: boolean;
};

let runtime: DatabaseRuntime | null = null;

function createDefaultRuntime(): DatabaseRuntime {
  return {
    db: null,
    outbox: createMemoryOutboxRepository(),
    threadCache: createMemoryThreadCacheRepository(),
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
      ready: true,
    };
    return runtime;
  }
}

export function getOutboxRepository(): OutboxRepository {
  if (!runtime) {
    runtime = createDefaultRuntime();
  }
  return runtime.outbox;
}

export function getThreadCacheRepository(): ThreadCacheRepository {
  if (!runtime) {
    runtime = createDefaultRuntime();
  }
  return runtime.threadCache;
}

export function isDatabaseReady(): boolean {
  return runtime?.ready ?? false;
}

export async function clearPersistedUserData(): Promise<void> {
  const outbox = getOutboxRepository();
  const threadCache = getThreadCacheRepository();
  await outbox.clearAll();
  await threadCache.clearAll();
  logger.info('cleared persisted user data');
}

/** Test-only: inject memory repositories without opening native SQLite. */
export function __resetDatabaseRuntimeForTests(next?: {
  outbox?: OutboxRepository;
  threadCache?: ThreadCacheRepository;
}): void {
  runtime = {
    db: null,
    outbox: next?.outbox ?? createMemoryOutboxRepository(),
    threadCache: next?.threadCache ?? createMemoryThreadCacheRepository(),
    ready: true,
  };
}
