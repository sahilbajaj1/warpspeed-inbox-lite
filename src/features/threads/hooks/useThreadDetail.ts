import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/api/api-singleton';
import { createThreadsApi } from '@/features/inbox/api/threads-api';
import { threadDetailQueryKey } from '@/features/inbox/cache/thread-cache';
import { sortMessagesChronologically } from '@/features/threads/models/message-order';

const threadsApi = createThreadsApi(apiClient);

export function useThreadDetail(threadId: string | undefined) {
  const query = useQuery({
    queryKey: threadDetailQueryKey(threadId ?? 'unknown'),
    enabled: Boolean(threadId),
    queryFn: ({ signal }) => threadsApi.getThread({ id: threadId!, signal }),
  });

  const messages = query.data ? sortMessagesChronologically(query.data.messages) : [];

  return {
    ...query,
    messages,
  };
}
