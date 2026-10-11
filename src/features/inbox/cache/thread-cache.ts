import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { Thread, ThreadDetail } from '@/core/api/schemas';
import type { ThreadPage } from '@/features/inbox/api/threads-api';
import { inboxQueryKeys } from '@/features/inbox/query-keys';
import type { MailboxView } from '@/features/inbox/models/mailbox';
import { MAILBOX_VIEWS } from '@/features/inbox/models/mailbox';

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

function belongsInMailbox(view: MailboxView, thread: Thread): boolean {
  if (view === 'inbox') {
    return !thread.isArchived;
  }
  if (view === 'starred') {
    return thread.isStarred;
  }
  return thread.isArchived;
}

function findThreadInCaches(queryClient: QueryClient, threadId: string): Thread | undefined {
  const detail = queryClient.getQueryData<ThreadDetail>(threadDetailQueryKey(threadId));
  if (detail) {
    return detail;
  }

  for (const view of MAILBOX_VIEWS) {
    const data = queryClient.getQueryData<InfiniteData<ThreadPage>>(inboxQueryKeys.mailbox(view));
    const found = data?.pages.flatMap((page) => page.threads).find((thread) => thread.id === threadId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** Apply a field patch across mailbox infinite queries and optional detail cache. */
export function applyThreadPatchToCaches(
  queryClient: QueryClient,
  threadId: string,
  patch: Partial<Thread>,
): void {
  const current = findThreadInCaches(queryClient, threadId);
  if (!current) {
    return;
  }

  if (
    patch.version !== undefined &&
    typeof current.version === 'number' &&
    patch.version < current.version
  ) {
    return;
  }

  const next = patchThreadFields(current, patch);

  for (const view of MAILBOX_VIEWS) {
    queryClient.setQueryData<InfiniteData<ThreadPage>>(inboxQueryKeys.mailbox(view), (existing) => {
      if (!existing) {
        return existing;
      }

      const withoutThread = existing.pages.map((page) => ({
        ...page,
        threads: page.threads.filter((thread) => thread.id !== threadId),
      }));

      if (!belongsInMailbox(view, next)) {
        const changed = existing.pages.some((page) =>
          page.threads.some((thread) => thread.id === threadId),
        );
        return changed ? { ...existing, pages: withoutThread } : existing;
      }

      const alreadyPresent = existing.pages.some((page) =>
        page.threads.some((thread) => thread.id === threadId),
      );

      if (alreadyPresent) {
        return {
          ...existing,
          pages: existing.pages.map((page) => ({
            ...page,
            threads: page.threads.map((thread) => (thread.id === threadId ? next : thread)),
          })),
        };
      }

      if (withoutThread.length === 0) {
        return {
          ...existing,
          pages: [{ threads: [next], nextCursor: null }],
        };
      }

      const [first, ...rest] = withoutThread;
      return {
        ...existing,
        pages: [{ ...first, threads: [next, ...first.threads] }, ...rest],
      };
    });
  }

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

export function getThreadVersionFromCaches(
  queryClient: QueryClient,
  threadId: string,
): number | undefined {
  return findThreadInCaches(queryClient, threadId)?.version;
}

/** Insert or replace a confirmed thread across mailbox caches (live sync / sockets). */
export function upsertThreadInCaches(queryClient: QueryClient, thread: Thread): void {
  const current = findThreadInCaches(queryClient, thread.id);
  if (current && thread.version < current.version) {
    return;
  }

  for (const view of MAILBOX_VIEWS) {
    queryClient.setQueryData<InfiniteData<ThreadPage>>(inboxQueryKeys.mailbox(view), (existing) => {
      if (!existing) {
        if (!belongsInMailbox(view, thread)) {
          return existing;
        }
        return {
          pages: [{ threads: [thread], nextCursor: null }],
          pageParams: [null],
        };
      }

      const withoutThread = existing.pages.map((page) => ({
        ...page,
        threads: page.threads.filter((item) => item.id !== thread.id),
      }));

      if (!belongsInMailbox(view, thread)) {
        const changed = existing.pages.some((page) =>
          page.threads.some((item) => item.id === thread.id),
        );
        return changed ? { ...existing, pages: withoutThread } : existing;
      }

      const alreadyPresent = existing.pages.some((page) =>
        page.threads.some((item) => item.id === thread.id),
      );

      if (alreadyPresent) {
        return {
          ...existing,
          pages: existing.pages.map((page) => ({
            ...page,
            threads: page.threads.map((item) => (item.id === thread.id ? thread : item)),
          })),
        };
      }

      const [first, ...rest] = withoutThread;
      if (!first) {
        return {
          ...existing,
          pages: [{ threads: [thread], nextCursor: null }],
        };
      }
      return {
        ...existing,
        pages: [{ ...first, threads: [thread, ...first.threads] }, ...rest],
      };
    });
  }

  queryClient.setQueryData<ThreadDetail>(threadDetailQueryKey(thread.id), (existing) => {
    if (!existing) {
      return existing;
    }
    if (thread.version < existing.version) {
      return existing;
    }
    return { ...existing, ...thread, messages: existing.messages };
  });
}

export function removeThreadFromCaches(queryClient: QueryClient, threadId: string): void {
  for (const view of MAILBOX_VIEWS) {
    queryClient.setQueryData<InfiniteData<ThreadPage>>(inboxQueryKeys.mailbox(view), (existing) => {
      if (!existing) {
        return existing;
      }
      const changed = existing.pages.some((page) =>
        page.threads.some((thread) => thread.id === threadId),
      );
      if (!changed) {
        return existing;
      }
      return {
        ...existing,
        pages: existing.pages.map((page) => ({
          ...page,
          threads: page.threads.filter((thread) => thread.id !== threadId),
        })),
      };
    });
  }
  queryClient.setQueryData(threadDetailQueryKey(threadId), undefined);
}
