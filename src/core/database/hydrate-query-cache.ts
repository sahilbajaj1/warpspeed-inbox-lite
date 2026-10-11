import type { QueryClient } from '@tanstack/react-query';

import type { ThreadCacheRepository } from '@/core/database/thread-cache-repository';
import { threadDetailQueryKey } from '@/features/inbox/cache/thread-cache';
import { MAILBOX_VIEWS } from '@/features/inbox/models/mailbox';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

/** Seed TanStack Query from durable cache so offline launches show last-seen mail. */
export async function hydrateQueryClientFromThreadCache(
  queryClient: QueryClient,
  threadCache: ThreadCacheRepository,
): Promise<void> {
  for (const view of MAILBOX_VIEWS) {
    const data = await threadCache.loadMailbox(view);
    if (data) {
      queryClient.setQueryData(inboxQueryKeys.mailbox(view), data);
    }
  }
}

export async function hydrateThreadDetailFromCache(
  queryClient: QueryClient,
  threadCache: ThreadCacheRepository,
  threadId: string,
): Promise<boolean> {
  const existing = queryClient.getQueryData(threadDetailQueryKey(threadId));
  if (existing) {
    return true;
  }
  const detail = await threadCache.loadThreadDetail(threadId);
  if (!detail) {
    return false;
  }
  queryClient.setQueryData(threadDetailQueryKey(threadId), detail);
  return true;
}
