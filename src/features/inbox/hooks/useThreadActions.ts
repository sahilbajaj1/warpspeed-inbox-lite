import { useSyncExternalStore } from 'react';

import type { Thread } from '@/core/api/schemas';
import { getThreadActionQueue } from '@/features/inbox/actions/action-queue-runtime';
import type { ThreadActionField } from '@/features/inbox/actions/types';

type PendingFields = Partial<Record<ThreadActionField, boolean>>;

export function useThreadActions(thread: Pick<Thread, 'id' | ThreadActionField> | undefined) {
  const queue = getThreadActionQueue();

  const pending = useSyncExternalStore<PendingFields>(
    (onStoreChange) => queue.subscribe(onStoreChange),
    () => (thread ? queue.getPendingFields(thread.id) : {}),
    (): PendingFields => ({}),
  );

  function enqueue(field: ThreadActionField, value: boolean) {
    if (!thread) {
      return;
    }
    queue.enqueue({
      threadId: thread.id,
      field,
      value,
      confirmedValue: thread[field],
    });
  }

  return {
    pending,
    isPending: Object.keys(pending).length > 0,
    toggleStarred: () => {
      if (!thread) return;
      enqueue('isStarred', !thread.isStarred);
    },
    setStarred: (value: boolean) => enqueue('isStarred', value),
    setArchived: (value: boolean) => enqueue('isArchived', value),
    setRead: (value: boolean) => enqueue('isRead', value),
    markUnread: () => enqueue('isRead', false),
    markRead: () => enqueue('isRead', true),
  };
}
