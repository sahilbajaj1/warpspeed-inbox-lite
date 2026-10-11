import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/api/errors';
import type { Thread } from '@/core/api/schemas';
import { hydrateQueryClientFromThreadCache } from '@/core/database/hydrate-query-cache';
import { createMemoryOutboxRepository } from '@/core/database/outbox-repository';
import { createMemoryThreadCacheRepository } from '@/core/database/thread-cache-repository';
import { createThreadActionQueue } from '@/features/inbox/actions/thread-action-queue';
import type { ThreadsApi } from '@/features/inbox/api/threads-api';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

function thread(overrides?: Partial<Thread>): Thread {
  return {
    id: 'thr_1',
    subject: 'Subject',
    participants: [{ name: 'Ada', email: 'ada@example.com' }],
    snippet: 'Hello',
    lastMessageAt: '2026-10-05T09:00:00Z',
    messageCount: 1,
    isRead: true,
    isStarred: false,
    isArchived: false,
    version: 1,
    ...overrides,
  };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createThreadActionQueue', () => {
  it('applies optimistic star and reconciles the server response', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread()], nextCursor: null }],
      pageParams: [null],
    });

    const patchThread = jest.fn(async () => thread({ isStarred: true, version: 2 }));
    const queue = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient,
      outbox: createMemoryOutboxRepository(),
      threadCache: createMemoryThreadCacheRepository(),
    });

    await queue.enqueue({
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      confirmedValue: false,
    });

    expect(
      queryClient.getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads[0]?.isStarred,
    ).toBe(true);

    await flush();

    expect(patchThread).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'thr_1',
        patch: { isStarred: true },
        idempotencyKey: expect.any(String),
      }),
    );
    expect(
      queryClient.getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads[0]?.version,
    ).toBe(2);
    expect(queue.peek('thr_1', 'isStarred')).toBeUndefined();
  });

  it('preserves the same idempotency key across uncertain failures', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread()], nextCursor: null }],
      pageParams: [null],
    });

    const patchThread = jest.fn(async () => {
      throw new ApiError({
        category: 'server_failure',
        message: 'boom',
        status: 500,
        outcomeUncertain: true,
      });
    });

    const queue = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient,
      outbox: createMemoryOutboxRepository(),
      threadCache: createMemoryThreadCacheRepository(),
    });

    await queue.enqueue({
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      confirmedValue: false,
    });
    const key = queue.peek('thr_1', 'isStarred')?.id;
    expect(key).toBeTruthy();

    await flush();

    expect(queue.peek('thr_1', 'isStarred')?.id).toBe(key);
    expect(queue.peek('thr_1', 'isStarred')?.status).toBe('queued');
    expect(patchThread).toHaveBeenCalledTimes(1);
    expect(patchThread).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: key }),
    );
  });

  it('survives restart: persisted outbox rehydrates and keeps the same key', async () => {
    const outbox = createMemoryOutboxRepository();
    const threadCache = createMemoryThreadCacheRepository();
    await threadCache.replaceMailbox('inbox', [
      { threads: [thread()], nextCursor: null },
    ]);

    const queryClientA = new QueryClient();
    queryClientA.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread()], nextCursor: null }],
      pageParams: [null],
    });

    const patchThread = jest.fn<Promise<Thread>, Parameters<ThreadsApi['patchThread']>>(
      async () => {
        throw new ApiError({
          category: 'no_connection',
          message: 'offline',
          outcomeUncertain: true,
        });
      },
    );

    const queueA = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient: queryClientA,
      outbox,
      threadCache,
    });

    await queueA.enqueue({
      threadId: 'thr_1',
      field: 'isArchived',
      value: true,
      confirmedValue: false,
    });
    await flush();

    const key = queueA.peek('thr_1', 'isArchived')?.id;
    expect(key).toBeTruthy();
    expect(queueA.peek('thr_1', 'isArchived')?.status).toBe('queued');

    // Simulate process death + relaunch with a fresh queue/query client.
    const queryClientB = new QueryClient();
    await hydrateQueryClientFromThreadCache(queryClientB, threadCache);

    const queueB = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient: queryClientB,
      outbox,
      threadCache,
    });
    await queueB.hydrate();

    expect(queueB.peek('thr_1', 'isArchived')?.id).toBe(key);
    expect(queueB.peek('thr_1', 'isArchived')?.status).toBe('queued');
    expect(
      queryClientB.getQueryData<{ pages: { threads: Thread[] }[] }>(
        inboxQueryKeys.mailbox('inbox'),
      )?.pages[0]?.threads.find((item) => item.id === 'thr_1'),
    ).toBeUndefined();
    expect(
      queryClientB.getQueryData<{ pages: { threads: Thread[] }[] }>(
        inboxQueryKeys.mailbox('archived'),
      )?.pages[0]?.threads[0]?.isArchived,
    ).toBe(true);

    patchThread.mockReset();
    patchThread.mockResolvedValue(thread({ isArchived: true, version: 3 }));
    queueB.flushQueued();
    await flush();

    expect(patchThread).toHaveBeenLastCalledWith(
      expect.objectContaining({ idempotencyKey: key, patch: { isArchived: true } }),
    );
    expect(queueB.peek('thr_1', 'isArchived')).toBeUndefined();
  });

  it('keeps the same key and optimistic UI on rate-limited failures', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread()], nextCursor: null }],
      pageParams: [null],
    });

    const patchThread = jest.fn(async () => {
      throw new ApiError({
        category: 'rate_limited',
        message: 'slow down',
        status: 429,
        retryAfterSeconds: 1,
      });
    });

    const queue = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient,
      outbox: createMemoryOutboxRepository(),
      threadCache: createMemoryThreadCacheRepository(),
    });

    await queue.enqueue({
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      confirmedValue: false,
    });
    const key = queue.peek('thr_1', 'isStarred')?.id;
    await flush();

    expect(queue.peek('thr_1', 'isStarred')?.status).toBe('queued');
    expect(queue.peek('thr_1', 'isStarred')?.id).toBe(key);
    expect(
      queryClient.getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads[0]?.isStarred,
    ).toBe(true);
  });

  it('surfaces permanent failures for retry/dismiss', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread()], nextCursor: null }],
      pageParams: [null],
    });

    const patchThread = jest.fn<Promise<Thread>, Parameters<ThreadsApi['patchThread']>>(
      async () => {
        throw new ApiError({
          category: 'forbidden',
          message: 'nope',
          status: 403,
        });
      },
    );

    const queue = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient,
      outbox: createMemoryOutboxRepository(),
      threadCache: createMemoryThreadCacheRepository(),
    });

    await queue.enqueue({
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      confirmedValue: false,
    });
    await flush();

    expect(queue.getFailedCommands('thr_1')).toHaveLength(1);
    expect(
      queryClient.getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads[0]?.isStarred,
    ).toBe(false);

    patchThread.mockResolvedValue(thread({ isStarred: true, version: 2 }));
    await queue.retryFailed('thr_1', 'isStarred');
    await flush();

    expect(queue.peek('thr_1', 'isStarred')).toBeUndefined();
    expect(queue.getFailedCommands('thr_1')).toHaveLength(0);
  });

  it('does not claim optimistic UI when outbox persist fails', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread()], nextCursor: null }],
      pageParams: [null],
    });

    const outbox = createMemoryOutboxRepository();
    outbox.upsert = jest.fn(async () => {
      throw new Error('disk full');
    });

    const patchThread = jest.fn();
    const queue = createThreadActionQueue({
      threadsApi: { patchThread } as unknown as ThreadsApi,
      queryClient,
      outbox,
      threadCache: createMemoryThreadCacheRepository(),
    });

    await expect(
      queue.enqueue({
        threadId: 'thr_1',
        field: 'isStarred',
        value: true,
        confirmedValue: false,
      }),
    ).rejects.toThrow('disk full');

    expect(
      queryClient.getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads[0]?.isStarred,
    ).toBe(false);
    expect(patchThread).not.toHaveBeenCalled();
  });
});
