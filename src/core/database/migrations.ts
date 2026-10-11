import type { SQLiteDatabase } from 'expo-sqlite';

import { logger } from '@/core/logging/logger';

/** Bump when schema changes; add a migration branch below. */
export const DATABASE_VERSION = 2;

const V1_TABLES = `
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY NOT NULL,
    thread_id TEXT NOT NULL,
    field TEXT NOT NULL,
    value INTEGER NOT NULL,
    revert_value INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    error_message TEXT,
    slot TEXT NOT NULL CHECK (slot IN ('primary', 'follow_up')),
    UNIQUE (thread_id, field, slot)
  );

  CREATE TABLE IF NOT EXISTS mailbox_pages (
    view TEXT NOT NULL,
    page_index INTEGER NOT NULL,
    next_cursor TEXT,
    threads_json TEXT NOT NULL,
    PRIMARY KEY (view, page_index)
  );

  CREATE TABLE IF NOT EXISTS thread_details (
    id TEXT PRIMARY KEY NOT NULL,
    json TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY NOT NULL,
    json TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

const V2_TABLES = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tombstones (
    id TEXT PRIMARY KEY NOT NULL,
    version INTEGER NOT NULL,
    deleted_at INTEGER NOT NULL
  );
`;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  if (current >= DATABASE_VERSION) {
    return;
  }

  if (current === 0) {
    await db.execAsync(V1_TABLES);
    await db.execAsync(V2_TABLES);
    current = 2;
    logger.info('database migrated to v2 (fresh)');
  }

  if (current === 1) {
    await db.execAsync(V2_TABLES);
    current = 2;
    logger.info('database migrated from v1 to v2');
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
