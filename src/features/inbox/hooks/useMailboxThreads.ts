import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { apiClient } from '@/core/api/api-singleton';
import { getThreadCacheRepository } from '@/core/database/database-runtime';
import { createThreadsApi, type ThreadPage } from '@/features/inbox/api/threads-api';
import type { MailboxView } from '@/features/inbox/models/mailbox';
import { flattenAndDedupeThreadPages } from '@/features/inbox/models/thread-list';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

const threadsApi = createThreadsApi(apiClient);

export function useMailboxThreads(view: MailboxView) {
  const query = useInfiniteQuery({
    queryKey: inboxQueryKeys.mailbox(view),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      try {
        const page = await threadsApi.listThreads({
          view,
          cursor: pageParam,
          signal,
        });
        const cache = getThreadCacheRepository();
        if (pageParam == null) {
          await cache.replaceMailbox(view, [page]);
        } else {
          const existing = await cache.loadMailbox(view);
          const prior = existing?.pages ?? [];
          await cache.replaceMailbox(view, [...prior, page]);
        }
        return page;
      } catch (error) {
        if (pageParam == null) {
          const cached = await getThreadCacheRepository().loadMailbox(view);
          const first = cached?.pages[0];
          if (first) {
            return first;
          }
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const threads = useMemo(
    () =>
      flattenAndDedupeThreadPages(
        (query.data as InfiniteData<ThreadPage> | undefined)?.pages.map((page) => page.threads) ??
          [],
      ),
    [query.data],
  );

  return {
    ...query,
    threads,
  };
}
