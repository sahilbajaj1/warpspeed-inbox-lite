import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/api/errors';
import type { Thread } from '@/core/api/schemas';
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
    });

    queue.enqueue({
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
    });

    queue.enqueue({
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
});
