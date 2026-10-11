import type { SQLiteDatabase } from 'expo-sqlite';

const SYNC_TOKEN_KEY = 'syncToken';

export type SyncCursorStore = {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

export function createSqliteSyncCursorStore(db: SQLiteDatabase): SyncCursorStore {
  return {
    async get() {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM meta WHERE key = ?',
        SYNC_TOKEN_KEY,
      );
      return row?.value ?? null;
    },

    async set(token) {
      await db.runAsync(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        SYNC_TOKEN_KEY,
        token,
      );
    },

    async clear() {
      await db.runAsync('DELETE FROM meta WHERE key = ?', SYNC_TOKEN_KEY);
    },
  };
}

export function createMemorySyncCursorStore(): SyncCursorStore {
  let token: string | null = null;
  return {
    async get() {
      return token;
    },
    async set(next) {
      token = next;
    },
    async clear() {
      token = null;
    },
  };
}
