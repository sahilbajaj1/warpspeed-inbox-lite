import type { QueryClient } from '@tanstack/react-query';

import type { ThreadCacheRepository } from '@/core/database/thread-cache-repository';
import { decideDelete, decideUpsert } from '@/core/sync/reconciler';
import type { TombstoneStore } from '@/core/sync/tombstone-store';
import type { RealtimeThreadEvent } from '@/core/sync/types';
import type { ThreadActionQueue } from '@/features/inbox/actions/thread-action-queue';
import {
  applyThreadPatchToCaches,
  getThreadVersionFromCaches,
  removeThreadFromCaches,
  upsertThreadInCaches,
} from '@/features/inbox/cache/thread-cache';

export type ThreadEventApplier = {
  apply: (event: RealtimeThreadEvent) => Promise<boolean>;
};

/**
 * Apply a reconciled upsert/delete to Query + SQLite, then re-layer pending outbox overlays.
 */
export function createThreadEventApplier(deps: {
  queryClient: QueryClient;
  threadCache: ThreadCacheRepository;
  tombstones: TombstoneStore;
  actionQueue: ThreadActionQueue;
}): ThreadEventApplier {
  function lookup() {
    return {
      getVersion: (threadId: string) => getThreadVersionFromCaches(deps.queryClient, threadId),
      getTombstone: (threadId: string) => deps.tombstones.getSync(threadId),
    };
  }

  function reapplyPendingOverlays(threadId: string): void {
    const commands = deps.actionQueue
      .getCommands()
      .filter((command) => command.threadId === threadId && command.status !== 'failed');
    for (const command of commands) {
      applyThreadPatchToCaches(deps.queryClient, threadId, {
        [command.field]: command.value,
      });
    }
  }

  return {
    async apply(event) {
      if (event.kind === 'upsert') {
        const decision = decideUpsert(event.thread, lookup());
        if (decision.action === 'ignore') {
          return false;
        }
        upsertThreadInCaches(deps.queryClient, decision.thread);
        await deps.threadCache.upsertThread(decision.thread);
        await deps.tombstones.remove(decision.thread.id);
        reapplyPendingOverlays(decision.thread.id);
        return true;
      }

      const decision = decideDelete(event.id, event.version, lookup());
      if (decision.action === 'ignore') {
        return false;
      }
      removeThreadFromCaches(deps.queryClient, decision.id);
      await deps.threadCache.removeThread(decision.id);
      await deps.tombstones.put({ id: decision.id, version: decision.version });
      return true;
    },
  };
}
