import { useSyncExternalStore } from 'react';

import type { Thread } from '@/core/api/schemas';
import { getThreadActionQueue } from '@/features/inbox/actions/action-queue-runtime';
import type { ThreadActionCommand, ThreadActionField } from '@/features/inbox/actions/types';

type PendingFields = Partial<Record<ThreadActionField, boolean>>;

export function useThreadActions(thread: Pick<Thread, 'id' | ThreadActionField> | undefined) {
  const queue = getThreadActionQueue();

  const pending = useSyncExternalStore<PendingFields>(
    (onStoreChange) => queue.subscribe(onStoreChange),
    () => (thread ? queue.getPendingFields(thread.id) : {}),
    (): PendingFields => ({}),
  );

  const failures = useSyncExternalStore<ThreadActionCommand[]>(
    (onStoreChange) => queue.subscribe(onStoreChange),
    () => (thread ? queue.getFailedCommands(thread.id) : []),
    (): ThreadActionCommand[] => [],
  );

  function enqueue(field: ThreadActionField, value: boolean) {
    if (!thread) {
      return;
    }
    void queue.enqueue({
      threadId: thread.id,
      field,
      value,
      confirmedValue: thread[field],
    });
  }

  return {
    pending,
    failures,
    isPending: Object.keys(pending).length > 0,
    hasFailures: failures.length > 0,
    toggleStarred: () => {
      if (!thread) return;
      enqueue('isStarred', !thread.isStarred);
    },
    setStarred: (value: boolean) => enqueue('isStarred', value),
    setArchived: (value: boolean) => enqueue('isArchived', value),
    setRead: (value: boolean) => enqueue('isRead', value),
    markUnread: () => enqueue('isRead', false),
    markRead: () => enqueue('isRead', true),
    retryFailed: (field: ThreadActionField) => {
      if (!thread) return;
      void queue.retryFailed(thread.id, field);
    },
    dismissFailed: (field: ThreadActionField) => {
      if (!thread) return;
      void queue.dismissFailed(thread.id, field);
    },
  };
}
