import { apiClient } from '@/core/api/api-singleton';
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
    });
  }
  return queue;
}

export function __resetThreadActionQueueForTests(next?: ThreadActionQueue): void {
  queue = next ?? null;
}
