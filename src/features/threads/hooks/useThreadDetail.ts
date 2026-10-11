import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/api/api-singleton';
import { getThreadCacheRepository } from '@/core/database/database-runtime';
import { createThreadsApi } from '@/features/inbox/api/threads-api';
import { threadDetailQueryKey } from '@/features/inbox/cache/thread-cache';
import { sortMessagesChronologically } from '@/features/threads/models/message-order';

const threadsApi = createThreadsApi(apiClient);

export function useThreadDetail(threadId: string | undefined) {
  const query = useQuery({
    queryKey: threadDetailQueryKey(threadId ?? 'unknown'),
    enabled: Boolean(threadId),
    queryFn: async ({ signal }) => {
      try {
        const detail = await threadsApi.getThread({ id: threadId!, signal });
        await getThreadCacheRepository().saveThreadDetail(detail);
        return detail;
      } catch (error) {
        const cached = await getThreadCacheRepository().loadThreadDetail(threadId!);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });

  const messages = query.data ? sortMessagesChronologically(query.data.messages) : [];

  return {
    ...query,
    messages,
  };
}
