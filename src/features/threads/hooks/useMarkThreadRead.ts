import { useEffect, useRef } from 'react';

import type { ThreadDetail } from '@/core/api/schemas';
import { useThreadActions } from '@/features/inbox/hooks/useThreadActions';

/**
 * Marks a thread read on open via the shared action queue (stable idempotency + optimistic UI).
 */
export function useMarkThreadRead(thread: ThreadDetail | undefined) {
  const attemptedForIdRef = useRef<string | null>(null);
  const actions = useThreadActions(thread);

  useEffect(() => {
    if (!thread || thread.isRead) {
      return;
    }
    if (attemptedForIdRef.current === thread.id) {
      return;
    }
    attemptedForIdRef.current = thread.id;
    actions.markRead();
  }, [actions, thread]);

  return {
    isPending: Boolean(actions.pending.isRead),
  };
}
