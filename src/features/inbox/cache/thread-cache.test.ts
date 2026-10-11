import { QueryClient } from '@tanstack/react-query';

import type { Thread } from '@/core/api/schemas';
import {
  applyThreadPatchToCaches,
  mergeConfirmedThread,
  threadDetailQueryKey,
} from '@/features/inbox/cache/thread-cache';
import { inboxQueryKeys } from '@/features/inbox/query-keys';

function thread(overrides: Partial<Thread> & Pick<Thread, 'id'>): Thread {
  return {
    subject: 'Subject',
    participants: [{ name: 'Ada', email: 'ada@example.com' }],
    snippet: 'Hello',
    lastMessageAt: '2026-10-05T09:00:00Z',
    messageCount: 1,
    isRead: false,
    isStarred: false,
    isArchived: false,
    version: 1,
    ...overrides,
  };
}

describe('thread cache helpers', () => {
  it('optimistically marks a thread read across mailbox pages', () => {
    const client = new QueryClient();
    client.setQueryData(inboxQueryKeys.mailbox('inbox'), {
      pages: [{ threads: [thread({ id: 'thr_1' }), thread({ id: 'thr_2' })], nextCursor: null }],
      pageParams: [null],
    });

    applyThreadPatchToCaches(client, 'thr_1', { isRead: true });

    const data = client.getQueryData<{ pages: { threads: Thread[] }[] }>(
      inboxQueryKeys.mailbox('inbox'),
    );
    expect(data?.pages[0]?.threads.find((item) => item.id === 'thr_1')?.isRead).toBe(true);
    expect(data?.pages[0]?.threads.find((item) => item.id === 'thr_2')?.isRead).toBe(false);
  });

  it('does not let an older version overwrite newer confirmed state', () => {
    expect(
      mergeConfirmedThread(thread({ id: 'thr_1', version: 5, isRead: true }), {
        ...thread({ id: 'thr_1', version: 4, isRead: false }),
      }).version,
    ).toBe(5);
  });

  it('updates detail cache when present', () => {
    const client = new QueryClient();
    client.setQueryData(threadDetailQueryKey('thr_1'), {
      ...thread({ id: 'thr_1' }),
      messages: [],
    });
    applyThreadPatchToCaches(client, 'thr_1', { isRead: true, version: 2 });
    expect(client.getQueryData<{ isRead: boolean; version: number }>(threadDetailQueryKey('thr_1'))).toMatchObject({
      isRead: true,
      version: 2,
    });
  });
});
