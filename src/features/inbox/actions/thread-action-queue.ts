import type { QueryClient } from '@tanstack/react-query';

import { isApiError, toUserMessage } from '@/core/api/errors';
import { logger } from '@/core/logging/logger';
import { actionQueueKey } from '@/features/inbox/actions/idempotency';
import { coalesceThreadAction } from '@/features/inbox/actions/coalesce';
import type {
  ThreadActionCommand,
  ThreadActionField,
  ThreadActionPatch,
} from '@/features/inbox/actions/types';
import type { ThreadsApi } from '@/features/inbox/api/threads-api';
import {
  applyThreadPatchToCaches,
  mergeConfirmedThread,
  threadDetailQueryKey,
} from '@/features/inbox/cache/thread-cache';
import type { Thread, ThreadDetail } from '@/core/api/schemas';

type Listener = () => void;

export type ThreadActionQueue = {
  subscribe: (listener: Listener) => () => void;
  getCommands: () => ThreadActionCommand[];
  getPendingFields: (threadId: string) => Partial<Record<ThreadActionField, boolean>>;
  enqueue: (input: {
    threadId: string;
    field: ThreadActionField;
    value: boolean;
    confirmedValue: boolean;
  }) => void;
  /** Test helper */
  peek: (threadId: string, field: ThreadActionField) => ThreadActionCommand | undefined;
};

/**
 * In-memory mutation outbox for Phase 7.
 * Phase 8 will replace storage with durable SQLite while keeping this coalescing/processor API.
 */
export function createThreadActionQueue(deps: {
  threadsApi: ThreadsApi;
  queryClient: QueryClient;
}): ThreadActionQueue {
  /** Latest command per threadId:field */
  const commands = new Map<string, ThreadActionCommand>();
  /** Follow-up intent waiting for in-flight to finish */
  const followUps = new Map<string, ThreadActionCommand>();
  const inFlightKeys = new Set<string>();
  const listeners = new Set<Listener>();
  const pendingCache = new Map<string, Partial<Record<ThreadActionField, boolean>>>();
  const EMPTY_PENDING: Partial<Record<ThreadActionField, boolean>> = {};

  function emit(): void {
    pendingCache.clear();
    for (const listener of listeners) {
      listener();
    }
  }

  function setCommand(key: string, command: ThreadActionCommand | null): void {
    if (!command) {
      commands.delete(key);
    } else {
      commands.set(key, command);
    }
    emit();
  }

  async function processKey(key: string): Promise<void> {
    if (inFlightKeys.has(key)) {
      return;
    }
    const command = commands.get(key);
    if (!command || command.status !== 'queued') {
      return;
    }

    inFlightKeys.add(key);
    setCommand(key, { ...command, status: 'in_flight', errorMessage: undefined });
    let shouldProcessFollowUp = false;

    try {
      const confirmed = await deps.threadsApi.patchThread({
        id: command.threadId,
        patch: { [command.field]: command.value } as ThreadActionPatch,
        idempotencyKey: command.id,
      });

      const detail = deps.queryClient.getQueryData<ThreadDetail>(
        threadDetailQueryKey(command.threadId),
      );
      const merged = mergeConfirmedThread(detail, confirmed);
      applyThreadPatchToCaches(deps.queryClient, command.threadId, {
        isRead: merged.isRead,
        isStarred: merged.isStarred,
        isArchived: merged.isArchived,
        version: merged.version,
        lastMessageAt: merged.lastMessageAt,
        snippet: merged.snippet,
        subject: merged.subject,
        messageCount: merged.messageCount,
      });

      // Remove completed command unless a follow-up replaced the map entry.
      const current = commands.get(key);
      if (current?.id === command.id) {
        setCommand(key, null);
      }

      const followUp = followUps.get(key);
      if (followUp) {
        followUps.delete(key);
        setCommand(key, { ...followUp, status: 'queued' });
        applyThreadPatchToCaches(deps.queryClient, followUp.threadId, {
          [followUp.field]: followUp.value,
        });
        shouldProcessFollowUp = true;
      }
    } catch (error) {
      if (isApiError(error) && error.category === 'not_found') {
        deps.queryClient.setQueryData(threadDetailQueryKey(command.threadId), undefined);
        setCommand(key, null);
        followUps.delete(key);
      } else {
        const uncertain =
          isApiError(error) && (error.outcomeUncertain || error.category === 'no_connection');

        if (uncertain) {
          // Keep optimistic UI and retain the same idempotency key for retry.
          setCommand(key, {
            ...command,
            status: 'queued',
            errorMessage: toUserMessage(error),
          });
          logger.warn('thread action uncertain failure; kept queued with same key', {
            field: command.field,
            category: isApiError(error) ? error.category : 'unknown',
          });
        } else {
          // Permanent failure — revert optimistic field and surface the error.
          applyThreadPatchToCaches(deps.queryClient, command.threadId, {
            [command.field]: command.revertValue,
          });
          setCommand(key, {
            ...command,
            status: 'failed',
            errorMessage: toUserMessage(error),
          });
          logger.warn('thread action permanent failure', {
            field: command.field,
            category: isApiError(error) ? error.category : 'unknown',
          });
        }
      }
    } finally {
      inFlightKeys.delete(key);
    }

    if (shouldProcessFollowUp) {
      void processKey(key);
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getCommands() {
      return [...commands.values(), ...followUps.values()];
    },

    getPendingFields(threadId) {
      const cached = pendingCache.get(threadId);
      if (cached) {
        return cached;
      }
      const pending: Partial<Record<ThreadActionField, boolean>> = {};
      for (const command of commands.values()) {
        if (command.threadId === threadId && command.status !== 'failed') {
          pending[command.field] = true;
        }
      }
      for (const command of followUps.values()) {
        if (command.threadId === threadId) {
          pending[command.field] = true;
        }
      }
      const stable = Object.keys(pending).length === 0 ? EMPTY_PENDING : pending;
      pendingCache.set(threadId, stable);
      return stable;
    },

    peek(threadId, field) {
      return commands.get(actionQueueKey(threadId, field));
    },

    enqueue({ threadId, field, value, confirmedValue }) {
      const key = actionQueueKey(threadId, field);
      const existing = commands.get(key);
      const result = coalesceThreadAction({
        existing,
        threadId,
        field,
        value,
        confirmedValue,
      });

      // Optimistic UI immediately reflects latest intent.
      applyThreadPatchToCaches(deps.queryClient, threadId, { [field]: value });

      if (existing?.status === 'in_flight') {
        if (result.next) {
          followUps.set(key, result.next);
        } else {
          followUps.delete(key);
        }
        emit();
        return;
      }

      followUps.delete(key);
      setCommand(key, result.next);
      if (result.next) {
        void processKey(key);
      }
    },
  };
}

export function getConfirmedFieldValue(
  thread: Pick<Thread, ThreadActionField> | undefined,
  field: ThreadActionField,
): boolean {
  if (!thread) {
    return false;
  }
  return thread[field];
}
