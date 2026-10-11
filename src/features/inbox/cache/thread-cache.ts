import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { Thread, ThreadDetail } from '@/core/api/schemas';
import type { ThreadPage } from '@/features/inbox/api/threads-api';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

export const threadDetailQueryKey = (id: string) =>
  [...inboxQueryKeys.all, 'thread', id] as const;

function patchThreadFields(thread: Thread, patch: Partial<Thread>): Thread {
  const next = { ...thread, ...patch };
  if (patch.version === undefined && thread.version !== undefined) {
    // Optimistic local overlay is not a new server version.
    next.version = thread.version;
  }
  return next;
}

/** Apply a field patch across mailbox infinite queries and optional detail cache. */
export function applyThreadPatchToCaches(
  queryClient: QueryClient,
  threadId: string,
  patch: Partial<Thread>,
): void {
  queryClient.setQueriesData<InfiniteData<ThreadPage>>(
    { queryKey: [...inboxQueryKeys.all, 'mailbox'] },
    (existing) => {
      if (!existing) {
        return existing;
      }
      let changed = false;
      const pages = existing.pages.map((page) => {
        let pageChanged = false;
        const threads = page.threads.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }
          // Ignore older confirmed versions when patch carries a version.
          if (
            patch.version !== undefined &&
            typeof thread.version === 'number' &&
            patch.version < thread.version
          ) {
            return thread;
          }
          pageChanged = true;
          changed = true;
          return patchThreadFields(thread, patch);
        });
        return pageChanged ? { ...page, threads } : page;
      });
      return changed ? { ...existing, pages } : existing;
    },
  );

  queryClient.setQueryData<ThreadDetail>(threadDetailQueryKey(threadId), (existing) => {
    if (!existing) {
      return existing;
    }
    if (
      patch.version !== undefined &&
      typeof existing.version === 'number' &&
      patch.version < existing.version
    ) {
      return existing;
    }
    return { ...existing, ...patch, messages: existing.messages };
  });
}

export function mergeConfirmedThread(existing: Thread | undefined, incoming: Thread): Thread {
  if (!existing) {
    return incoming;
  }
  if (incoming.version < existing.version) {
    return existing;
  }
  return incoming;
}
