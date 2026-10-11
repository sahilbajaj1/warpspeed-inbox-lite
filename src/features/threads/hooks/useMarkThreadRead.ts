import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { apiClient } from '@/core/api/api-singleton';
import { isApiError } from '@/core/api/errors';
import { createThreadsApi } from '@/features/inbox/api/threads-api';
import {
  applyThreadPatchToCaches,
  mergeConfirmedThread,
  threadDetailQueryKey,
} from '@/features/inbox/cache/thread-cache';
import type { ThreadDetail } from '@/core/api/schemas';
import { logger } from '@/core/logging/logger';

const threadsApi = createThreadsApi(apiClient);

function createIdempotencyKey(threadId: string): string {
  // Stable per mount/open for retries of the same logical mark-read action.
  return `mark-read:${threadId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function useMarkThreadRead(thread: ThreadDetail | undefined) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<string | null>(null);
  const attemptedForIdRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (threadId: string) => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = createIdempotencyKey(threadId);
      }
      return threadsApi.patchThread({
        id: threadId,
        patch: { isRead: true },
        idempotencyKey: idempotencyKeyRef.current,
      });
    },
    onMutate: async (threadId) => {
      applyThreadPatchToCaches(queryClient, threadId, { isRead: true });
    },
    onSuccess: (confirmed, threadId) => {
      const detail = queryClient.getQueryData<ThreadDetail>(threadDetailQueryKey(threadId));
      const merged = mergeConfirmedThread(detail, confirmed);
      applyThreadPatchToCaches(queryClient, threadId, {
        isRead: merged.isRead,
        isStarred: merged.isStarred,
        isArchived: merged.isArchived,
        version: merged.version,
        lastMessageAt: merged.lastMessageAt,
        snippet: merged.snippet,
        subject: merged.subject,
        messageCount: merged.messageCount,
      });
    },
    onError: (error, threadId) => {
      if (isApiError(error) && error.category === 'not_found') {
        queryClient.setQueryData(threadDetailQueryKey(threadId), undefined);
        return;
      }
      // Uncertain 5xx: keep optimistic read; sync/socket will reconcile later.
      logger.warn('mark-read failed', {
        category: isApiError(error) ? error.category : 'unknown',
        outcomeUncertain: isApiError(error) ? error.outcomeUncertain : false,
      });
    },
  });

  useEffect(() => {
    if (!thread || thread.isRead) {
      return;
    }
    if (attemptedForIdRef.current === thread.id) {
      return;
    }
    attemptedForIdRef.current = thread.id;
    idempotencyKeyRef.current = createIdempotencyKey(thread.id);
    mutation.mutate(thread.id);
    // Intentionally depend on thread identity/read flag only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, thread?.isRead]);

  return mutation;
}
