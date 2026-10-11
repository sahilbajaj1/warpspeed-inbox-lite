import type { SQLiteDatabase } from 'expo-sqlite';

import type { ThreadActionCommand, ThreadActionField } from '@/features/inbox/actions/types';

export type OutboxSlot = 'primary' | 'follow_up';

export type OutboxRepository = {
  loadAll: () => Promise<{
    primary: ThreadActionCommand[];
    followUps: ThreadActionCommand[];
  }>;
  upsert: (command: ThreadActionCommand, slot: OutboxSlot) => Promise<void>;
  removeBySlot: (
    threadId: string,
    field: ThreadActionField,
    slot: OutboxSlot,
  ) => Promise<void>;
  removeById: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

type OutboxRow = {
  id: string;
  thread_id: string;
  field: string;
  value: number;
  revert_value: number;
  status: string;
  created_at: number;
  error_message: string | null;
  slot: string;
};

function rowToCommand(row: OutboxRow): ThreadActionCommand {
  return {
    id: row.id,
    threadId: row.thread_id,
    field: row.field as ThreadActionField,
    value: row.value === 1,
    revertValue: row.revert_value === 1,
    status: row.status as ThreadActionCommand['status'],
    createdAt: row.created_at,
    errorMessage: row.error_message ?? undefined,
  };
}

export function createSqliteOutboxRepository(db: SQLiteDatabase): OutboxRepository {
  return {
    async loadAll() {
      const rows = await db.getAllAsync<OutboxRow>(
        'SELECT * FROM outbox ORDER BY created_at ASC',
      );
      const primary: ThreadActionCommand[] = [];
      const followUps: ThreadActionCommand[] = [];
      for (const row of rows) {
        const command = rowToCommand(row);
        if (row.slot === 'follow_up') {
          followUps.push(command);
        } else {
          primary.push(command);
        }
      }
      return { primary, followUps };
    },

    async upsert(command, slot) {
      await db.runAsync(
        `INSERT INTO outbox (id, thread_id, field, value, revert_value, status, created_at, error_message, slot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(thread_id, field, slot) DO UPDATE SET
           id = excluded.id,
           value = excluded.value,
           revert_value = excluded.revert_value,
           status = excluded.status,
           created_at = excluded.created_at,
           error_message = excluded.error_message`,
        command.id,
        command.threadId,
        command.field,
        command.value ? 1 : 0,
        command.revertValue ? 1 : 0,
        command.status,
        command.createdAt,
        command.errorMessage ?? null,
        slot,
      );
    },

    async removeBySlot(threadId, field, slot) {
      await db.runAsync(
        'DELETE FROM outbox WHERE thread_id = ? AND field = ? AND slot = ?',
        threadId,
        field,
        slot,
      );
    },

    async removeById(id) {
      await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
    },

    async clearAll() {
      await db.runAsync('DELETE FROM outbox');
    },
  };
}

/** In-memory outbox for unit tests (no native SQLite). */
export function createMemoryOutboxRepository(): OutboxRepository {
  const rows = new Map<string, { command: ThreadActionCommand; slot: OutboxSlot }>();

  function slotKey(threadId: string, field: ThreadActionField, slot: OutboxSlot): string {
    return `${threadId}:${field}:${slot}`;
  }

  return {
    async loadAll() {
      const primary: ThreadActionCommand[] = [];
      const followUps: ThreadActionCommand[] = [];
      for (const entry of rows.values()) {
        if (entry.slot === 'follow_up') {
          followUps.push(entry.command);
        } else {
          primary.push(entry.command);
        }
      }
      return { primary, followUps };
    },

    async upsert(command, slot) {
      rows.set(slotKey(command.threadId, command.field, slot), { command, slot });
    },

    async removeBySlot(threadId, field, slot) {
      rows.delete(slotKey(threadId, field, slot));
    },

    async removeById(id) {
      for (const [key, entry] of rows) {
        if (entry.command.id === id) {
          rows.delete(key);
        }
      }
    },

    async clearAll() {
      rows.clear();
    },
  };
}
