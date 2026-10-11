import type { QueryClient } from '@tanstack/react-query';

import { isApiError, toUserMessage } from '@/core/api/errors';
import type { OutboxRepository } from '@/core/database/outbox-repository';
import type { ThreadCacheRepository } from '@/core/database/thread-cache-repository';
import { logger } from '@/core/logging/logger';
import { actionQueueKey } from '@/features/inbox/actions/idempotency';
import { coalesceThreadAction } from '@/features/inbox/actions/coalesce';
import type {
  ThreadActionCommand,
  ThreadActionField,
  ThreadActionPatch,
} from '@/features/inbox/actions/types';
import { isUncertainActionFailure } from '@/features/inbox/actions/uncertain-failure';
import type { ThreadsApi } from '@/features/inbox/api/threads-api';
import {
  applyThreadPatchToCaches,
  mergeConfirmedThread,
  threadDetailQueryKey,
} from '@/features/inbox/cache/thread-cache';
import type { Thread, ThreadDetail } from '@/core/api/schemas';

type Listener = () => void;

const MAX_RATE_LIMIT_RETRY_MS = 30_000;

export type ThreadActionQueue = {
  subscribe: (listener: Listener) => () => void;
  getCommands: () => ThreadActionCommand[];
  getPendingFields: (threadId: string) => Partial<Record<ThreadActionField, boolean>>;
  getFailedCommands: (threadId: string) => ThreadActionCommand[];
  enqueue: (input: {
    threadId: string;
    field: ThreadActionField;
    value: boolean;
    confirmedValue: boolean;
  }) => Promise<void>;
  /** Load durable outbox after process restart and re-apply optimistic overlays. */
  hydrate: () => Promise<void>;
  /** Resume queued work (e.g. after reconnect / foreground). */
  flushQueued: () => void;
  /** Drop a permanent failure after the user dismisses it. */
  dismissFailed: (threadId: string, field: ThreadActionField) => Promise<void>;
  /** Re-attempt a permanent failure as a new user intent. */
  retryFailed: (threadId: string, field: ThreadActionField) => Promise<void>;
  /** Test helper */
  peek: (threadId: string, field: ThreadActionField) => ThreadActionCommand | undefined;
};

/**
 * Mutation outbox with durable persistence.
 * Persist intent before claiming UI success; same idempotency key survives restart.
 */
export function createThreadActionQueue(deps: {
  threadsApi: ThreadsApi;
  queryClient: QueryClient;
  outbox: OutboxRepository;
  threadCache: ThreadCacheRepository;
}): ThreadActionQueue {
  /** Latest command per threadId:field */
  const commands = new Map<string, ThreadActionCommand>();
  /** Follow-up intent waiting for in-flight to finish */
  const followUps = new Map<string, ThreadActionCommand>();
  const inFlightKeys = new Set<string>();
  const listeners = new Set<Listener>();
  const pendingCache = new Map<string, Partial<Record<ThreadActionField, boolean>>>();
  const failedCache = new Map<string, ThreadActionCommand[]>();
  const EMPTY_PENDING: Partial<Record<ThreadActionField, boolean>> = {};
  const EMPTY_FAILED: ThreadActionCommand[] = [];

  function emit(): void {
    pendingCache.clear();
    failedCache.clear();
    for (const listener of listeners) {
      listener();
    }
  }

  async function setPrimary(
    threadId: string,
    field: ThreadActionField,
    command: ThreadActionCommand | null,
  ): Promise<void> {
    const key = actionQueueKey(threadId, field);
    if (!command) {
      commands.delete(key);
      await deps.outbox.removeBySlot(threadId, field, 'primary');
    } else {
      commands.set(key, command);
      await deps.outbox.upsert(command, 'primary');
    }
    emit();
  }

  async function setFollowUp(
    threadId: string,
    field: ThreadActionField,
    command: ThreadActionCommand | null,
  ): Promise<void> {
    const key = actionQueueKey(threadId, field);
    if (!command) {
      followUps.delete(key);
      await deps.outbox.removeBySlot(threadId, field, 'follow_up');
    } else {
      followUps.set(key, command);
      await deps.outbox.upsert(command, 'follow_up');
    }
    emit();
  }

  async function applyOptimistic(
    threadId: string,
    field: ThreadActionField,
    value: boolean,
  ): Promise<void> {
    applyThreadPatchToCaches(deps.queryClient, threadId, { [field]: value });
    await deps.threadCache.applyFieldPatch(threadId, { [field]: value });
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
    await setPrimary(command.threadId, command.field, {
      ...command,
      status: 'in_flight',
      errorMessage: undefined,
    });
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
      await deps.threadCache.upsertThread(merged);

      const current = commands.get(key);
      if (current?.id === command.id) {
        await setPrimary(command.threadId, command.field, null);
      }

      const followUp = followUps.get(key);
      if (followUp) {
        await setFollowUp(command.threadId, command.field, null);
        await setPrimary(followUp.threadId, followUp.field, {
          ...followUp,
          status: 'queued',
        });
        await applyOptimistic(followUp.threadId, followUp.field, followUp.value);
        shouldProcessFollowUp = true;
      }
    } catch (error) {
      if (isApiError(error) && error.category === 'not_found') {
        deps.queryClient.setQueryData(threadDetailQueryKey(command.threadId), undefined);
        await setPrimary(command.threadId, command.field, null);
        await setFollowUp(command.threadId, command.field, null);
      } else if (isUncertainActionFailure(error)) {
        await setPrimary(command.threadId, command.field, {
          ...command,
          status: 'queued',
          errorMessage: toUserMessage(error),
        });
        logger.warn('thread action uncertain failure; kept queued with same key', {
          field: command.field,
          category: isApiError(error) ? error.category : 'unknown',
        });

        // Honor Retry-After for 429 without inventing a new idempotency key (A-04).
        if (
          isApiError(error) &&
          error.category === 'rate_limited' &&
          typeof error.retryAfterSeconds === 'number' &&
          error.retryAfterSeconds > 0
        ) {
          const delayMs = Math.min(error.retryAfterSeconds * 1000, MAX_RATE_LIMIT_RETRY_MS);
          setTimeout(() => {
            void processKey(key);
          }, delayMs);
        }
      } else {
        applyThreadPatchToCaches(deps.queryClient, command.threadId, {
          [command.field]: command.revertValue,
        });
        await deps.threadCache.applyFieldPatch(command.threadId, {
          [command.field]: command.revertValue,
        });
        await setPrimary(command.threadId, command.field, {
          ...command,
          status: 'failed',
          errorMessage: toUserMessage(error),
        });
        logger.warn('thread action permanent failure', {
          field: command.field,
          category: isApiError(error) ? error.category : 'unknown',
        });
      }
    } finally {
      inFlightKeys.delete(key);
    }

    if (shouldProcessFollowUp) {
      void processKey(key);
    }
  }

  async function enqueue(input: {
    threadId: string;
    field: ThreadActionField;
    value: boolean;
    confirmedValue: boolean;
  }): Promise<void> {
    const { threadId, field, value, confirmedValue } = input;
    const key = actionQueueKey(threadId, field);
    const existing = commands.get(key);
    const result = coalesceThreadAction({
      existing,
      threadId,
      field,
      value,
      confirmedValue,
    });

    if (existing?.status === 'in_flight') {
      // Persist follow-up before acknowledging UI.
      await setFollowUp(threadId, field, result.next);
      await applyOptimistic(threadId, field, value);
      return;
    }

    await setFollowUp(threadId, field, null);
    await setPrimary(threadId, field, result.next);
    // Only claim optimistic UI after durable write succeeds.
    await applyOptimistic(threadId, field, value);

    if (result.next) {
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

    getFailedCommands(threadId) {
      const cached = failedCache.get(threadId);
      if (cached) {
        return cached;
      }
      const failed = [...commands.values()].filter(
        (command) => command.threadId === threadId && command.status === 'failed',
      );
      const stable = failed.length === 0 ? EMPTY_FAILED : failed;
      failedCache.set(threadId, stable);
      return stable;
    },

    peek(threadId, field) {
      return commands.get(actionQueueKey(threadId, field));
    },

    async dismissFailed(threadId, field) {
      const existing = commands.get(actionQueueKey(threadId, field));
      if (!existing || existing.status !== 'failed') {
        return;
      }
      await setPrimary(threadId, field, null);
    },

    async retryFailed(threadId, field) {
      const existing = commands.get(actionQueueKey(threadId, field));
      if (!existing || existing.status !== 'failed') {
        return;
      }
      const value = existing.value;
      const confirmedValue = existing.revertValue;
      await setPrimary(threadId, field, null);
      await enqueue({ threadId, field, value, confirmedValue });
    },

    async hydrate() {
      const { primary, followUps: storedFollowUps } = await deps.outbox.loadAll();
      commands.clear();
      followUps.clear();

      for (const command of primary) {
        const key = actionQueueKey(command.threadId, command.field);
        // Interrupted in-flight work is uncertain — keep the same key and retry.
        const restored: ThreadActionCommand =
          command.status === 'in_flight'
            ? { ...command, status: 'queued' }
            : command;
        commands.set(key, restored);
        if (restored.status !== 'failed') {
          applyThreadPatchToCaches(deps.queryClient, restored.threadId, {
            [restored.field]: restored.value,
          });
        }
      }

      for (const command of storedFollowUps) {
        const key = actionQueueKey(command.threadId, command.field);
        followUps.set(key, command);
        applyThreadPatchToCaches(deps.queryClient, command.threadId, {
          [command.field]: command.value,
        });
      }

      emit();
      logger.info('hydrated action outbox', {
        primary: primary.length,
        followUps: storedFollowUps.length,
      });
    },

    flushQueued() {
      for (const [key, command] of commands) {
        if (command.status === 'queued') {
          void processKey(key);
        }
      }
    },

    enqueue,
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
