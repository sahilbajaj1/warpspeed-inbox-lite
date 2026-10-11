import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { apiClient } from '@/core/api/api-singleton';
import { createThreadsApi } from '@/features/inbox/api/threads-api';
import type { MailboxView } from '@/features/inbox/models/mailbox';
import { flattenAndDedupeThreadPages } from '@/features/inbox/models/thread-list';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

const threadsApi = createThreadsApi(apiClient);

export function useMailboxThreads(view: MailboxView) {
  const query = useInfiniteQuery({
    queryKey: inboxQueryKeys.mailbox(view),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      threadsApi.listThreads({
        view,
        cursor: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // TanStack skips duplicate in-flight fetches for the same key/page.
  });

  const threads = useMemo(
    () => flattenAndDedupeThreadPages(query.data?.pages.map((page) => page.threads) ?? []),
    [query.data?.pages],
  );

  return {
    ...query,
    threads,
  };
}
