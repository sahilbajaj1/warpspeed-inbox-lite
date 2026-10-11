import { apiClient } from '@/core/api/api-singleton';
import {
  getOutboxRepository,
  getThreadCacheRepository,
} from '@/core/database/database-runtime';
import { appQueryClient } from '@/core/query/query-client';
import { createThreadsApi } from '@/features/inbox/api/threads-api';
import {
  createThreadActionQueue,
  type ThreadActionQueue,
} from '@/features/inbox/actions/thread-action-queue';

let queue: ThreadActionQueue | null = null;

export function getThreadActionQueue(): ThreadActionQueue {
  if (!queue) {
    queue = createThreadActionQueue({
      threadsApi: createThreadsApi(apiClient),
      queryClient: appQueryClient,
      outbox: getOutboxRepository(),
      threadCache: getThreadCacheRepository(),
    });
  }
  return queue;
}

/** Drop the singleton so the next get() binds to current DB repositories. */
export function resetThreadActionQueue(next?: ThreadActionQueue): void {
  queue = next ?? null;
}

export function __resetThreadActionQueueForTests(next?: ThreadActionQueue): void {
  resetThreadActionQueue(next);
}
