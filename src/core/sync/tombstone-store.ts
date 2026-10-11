import type { SQLiteDatabase } from 'expo-sqlite';

import type { Tombstone } from '@/core/sync/types';

export type TombstoneStore = {
  get: (id: string) => Promise<Tombstone | undefined>;
  /** In-memory snapshot for reconciler lookups (hydrated at start / after writes). */
  getSync: (id: string) => Tombstone | undefined;
  put: (tombstone: Tombstone) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export function createSqliteTombstoneStore(db: SQLiteDatabase): TombstoneStore {
  const memory = new Map<string, Tombstone>();

  return {
    async hydrate() {
      memory.clear();
      const rows = await db.getAllAsync<{ id: string; version: number }>(
        'SELECT id, version FROM tombstones',
      );
      for (const row of rows) {
        memory.set(row.id, { id: row.id, version: row.version });
      }
    },

    getSync(id) {
      return memory.get(id);
    },

    async get(id) {
      return memory.get(id);
    },

    async put(tombstone) {
      const existing = memory.get(tombstone.id);
      if (existing && existing.version > tombstone.version) {
        return;
      }
      memory.set(tombstone.id, tombstone);
      await db.runAsync(
        `INSERT INTO tombstones (id, version, deleted_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           version = excluded.version,
           deleted_at = excluded.deleted_at
         WHERE excluded.version >= tombstones.version`,
        tombstone.id,
        tombstone.version,
        Date.now(),
      );
    },

    async remove(id) {
      memory.delete(id);
      await db.runAsync('DELETE FROM tombstones WHERE id = ?', id);
    },

    async clearAll() {
      memory.clear();
      await db.runAsync('DELETE FROM tombstones');
    },
  };
}

export function createMemoryTombstoneStore(): TombstoneStore {
  const memory = new Map<string, Tombstone>();
  return {
    async hydrate() {
      /* already in memory */
    },
    getSync(id) {
      return memory.get(id);
    },
    async get(id) {
      return memory.get(id);
    },
    async put(tombstone) {
      const existing = memory.get(tombstone.id);
      if (existing && existing.version > tombstone.version) {
        return;
      }
      memory.set(tombstone.id, tombstone);
    },
    async remove(id) {
      memory.delete(id);
    },
    async clearAll() {
      memory.clear();
    },
  };
}
