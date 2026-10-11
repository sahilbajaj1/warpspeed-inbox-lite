import { useCallback, useSyncExternalStore } from 'react';

import type { Thread } from '@/core/api/schemas';
import { getThreadActionQueue } from '@/features/inbox/actions/action-queue-runtime';
import type { ThreadActionCommand, ThreadActionField } from '@/features/inbox/actions/types';

type PendingFields = Partial<Record<ThreadActionField, boolean>>;

/** Stable empty snapshots for useSyncExternalStore (new {} / [] every read → update loops). */
const NO_THREAD_PENDING: PendingFields = {};
const NO_THREAD_FAILED: ThreadActionCommand[] = [];

export function useThreadActions(thread: Pick<Thread, 'id' | ThreadActionField> | undefined) {
  const queue = getThreadActionQueue();
  const threadId = thread?.id;

  const pending = useSyncExternalStore<PendingFields>(
    (onStoreChange) => queue.subscribe(onStoreChange),
    () => (threadId ? queue.getPendingFields(threadId) : NO_THREAD_PENDING),
    (): PendingFields => NO_THREAD_PENDING,
  );

  const failures = useSyncExternalStore<ThreadActionCommand[]>(
    (onStoreChange) => queue.subscribe(onStoreChange),
    () => (threadId ? queue.getFailedCommands(threadId) : NO_THREAD_FAILED),
    (): ThreadActionCommand[] => NO_THREAD_FAILED,
  );

  const enqueue = useCallback(
    (field: ThreadActionField, value: boolean) => {
      if (!thread) {
        return;
      }
      void queue.enqueue({
        threadId: thread.id,
        field,
        value,
        confirmedValue: thread[field],
      });
    },
    [queue, thread],
  );

  const markRead = useCallback(() => enqueue('isRead', true), [enqueue]);
  const markUnread = useCallback(() => enqueue('isRead', false), [enqueue]);
  const setRead = useCallback((value: boolean) => enqueue('isRead', value), [enqueue]);
  const setStarred = useCallback((value: boolean) => enqueue('isStarred', value), [enqueue]);
  const setArchived = useCallback((value: boolean) => enqueue('isArchived', value), [enqueue]);
  const toggleStarred = useCallback(() => {
    if (!thread) return;
    enqueue('isStarred', !thread.isStarred);
  }, [enqueue, thread]);

  const retryFailed = useCallback(
    (field: ThreadActionField) => {
      if (!thread) return;
      void queue.retryFailed(thread.id, field);
    },
    [queue, thread],
  );

  const dismissFailed = useCallback(
    (field: ThreadActionField) => {
      if (!thread) return;
      void queue.dismissFailed(thread.id, field);
    },
    [queue, thread],
  );

  return {
    pending,
    failures,
    isPending: Object.keys(pending).length > 0,
    hasFailures: failures.length > 0,
    toggleStarred,
    setStarred,
    setArchived,
    setRead,
    markUnread,
    markRead,
    retryFailed,
    dismissFailed,
  };
}
