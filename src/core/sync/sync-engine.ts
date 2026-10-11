import { isApiError } from '@/core/api/errors';
import type { SyncChange } from '@/core/api/schemas';
import { logger } from '@/core/logging/logger';
import type { ThreadEventApplier } from '@/core/sync/apply-thread-event';
import type { SyncApi } from '@/core/sync/sync-api';
import type { SyncCursorStore } from '@/core/sync/sync-cursor-store';
import type { RealtimeThreadEvent } from '@/core/sync/types';

export type SyncEngine = {
  /** Buffer live events while catch-up runs (AS-17). */
  beginBuffering: () => void;
  /** Enqueue a live event (buffered during catch-up, applied immediately otherwise). */
  handleRealtimeEvent: (event: RealtimeThreadEvent) => Promise<void>;
  /** Run GET /sync until hasMore=false, then drain the buffer. */
  catchUp: () => Promise<void>;
  /** Persist a sync token from list/meta after the corresponding data is applied. */
  noteSyncToken: (token: string | undefined) => Promise<void>;
  isBuffering: () => boolean;
};

export function createSyncEngine(deps: {
  syncApi: SyncApi;
  cursorStore: SyncCursorStore;
  applier: ThreadEventApplier;
  /** 410 Gone — reload baseline lists while preserving outbox. */
  onBaselineReload: () => Promise<void>;
}): SyncEngine {
  let buffering = false;
  const buffer: RealtimeThreadEvent[] = [];
  let catchUpPromise: Promise<void> | null = null;

  async function applySyncChange(change: SyncChange): Promise<void> {
    if (change.type === 'thread.upsert') {
      await deps.applier.apply({ kind: 'upsert', thread: change.thread });
      return;
    }
    await deps.applier.apply({
      kind: 'delete',
      id: change.id,
      version: change.version,
    });
  }

  async function drainBuffer(): Promise<void> {
    while (buffer.length > 0) {
      const event = buffer.shift();
      if (!event) {
        break;
      }
      await deps.applier.apply(event);
      if (event.syncToken) {
        await deps.cursorStore.set(event.syncToken);
      }
    }
  }

  async function runCatchUp(): Promise<void> {
    buffering = true;
    try {
      let token = await deps.cursorStore.get();
      if (!token) {
        logger.info('sync catch-up skipped; no checkpoint yet');
        await drainBuffer();
        return;
      }

      let hasMore = true;
      while (hasMore) {
        try {
          const page = await deps.syncApi.fetchSince({ since: token });
          for (const change of page.changes) {
            await applySyncChange(change);
          }
          // Persist checkpoint only after successful apply (AS-16 / SYN-01).
          await deps.cursorStore.set(page.syncToken);
          token = page.syncToken;
          hasMore = page.hasMore;
        } catch (error) {
          if (isApiError(error) && error.category === 'gone') {
            logger.warn('sync token expired (410); baseline reload');
            await deps.cursorStore.clear();
            await deps.onBaselineReload();
            await drainBuffer();
            return;
          }
          throw error;
        }
      }

      await drainBuffer();
      logger.info('sync catch-up complete');
    } finally {
      buffering = false;
    }
  }

  return {
    beginBuffering() {
      buffering = true;
    },

    isBuffering() {
      return buffering;
    },

    async handleRealtimeEvent(event) {
      if (buffering || catchUpPromise) {
        buffer.push(event);
        return;
      }
      await deps.applier.apply(event);
      if (event.syncToken) {
        await deps.cursorStore.set(event.syncToken);
      }
    },

    async catchUp() {
      if (catchUpPromise) {
        return catchUpPromise;
      }
      catchUpPromise = runCatchUp().finally(() => {
        catchUpPromise = null;
      });
      return catchUpPromise;
    },

    async noteSyncToken(token) {
      if (!token) {
        return;
      }
      const existing = await deps.cursorStore.get();
      if (!existing) {
        await deps.cursorStore.set(token);
      }
    },
  };
}
