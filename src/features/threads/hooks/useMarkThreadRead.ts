import { useEffect, useRef } from 'react';

import type { ThreadDetail } from '@/core/api/schemas';
import { useThreadActions } from '@/features/inbox/hooks/useThreadActions';

/**
 * Marks a thread read on open via the shared action queue (stable idempotency + optimistic UI).
 */
export function useMarkThreadRead(thread: ThreadDetail | undefined) {
  const attemptedForIdRef = useRef<string | null>(null);
  const actions = useThreadActions(thread);
  const markRead = actions.markRead;
  const threadId = thread?.id;
  const isRead = thread?.isRead;

  useEffect(() => {
    if (!threadId || isRead) {
      return;
    }
    if (attemptedForIdRef.current === threadId) {
      return;
    }
    attemptedForIdRef.current = threadId;
    markRead();
  }, [isRead, markRead, threadId]);

  return {
    isPending: Boolean(actions.pending.isRead),
  };
}
