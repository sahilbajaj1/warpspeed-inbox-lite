import { createThreadsApi } from '@/features/inbox/api/threads-api';
import type { ApiClient } from '@/core/api/client';

describe('createThreadsApi', () => {
  it('requests opaque cursor pagination and normalizes thread arrays', async () => {
    const request = jest.fn(async () => ({
      data: [
        {
          id: 'thr_1',
          subject: 'Hello',
          participants: [{ name: 'A', email: 'a@example.com' }],
          snippet: 'Hi',
          lastMessageAt: '2026-10-05T09:14:03Z',
          messageCount: 1,
          isRead: false,
          isStarred: false,
          isArchived: false,
          version: 1,
        },
      ],
      meta: { nextCursor: 'cursor-2', syncToken: 'sync-1', userBalance: 3 },
    }));

    const api = createThreadsApi({ request } as unknown as ApiClient);
    const page = await api.listThreads({ view: 'inbox', cursor: 'cursor-1', limit: 25 });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/threads',
        query: { view: 'inbox', cursor: 'cursor-1', limit: 25 },
      }),
    );
    expect(page.threads).toHaveLength(1);
    expect(page.nextCursor).toBe('cursor-2');
    expect(page.syncToken).toBe('sync-1');
  });

  it('stops inventing cursors when nextCursor is null', async () => {
    const request = jest.fn(async () => ({
      data: { threads: [] },
      meta: { nextCursor: null },
    }));
    const api = createThreadsApi({ request } as unknown as ApiClient);
    const page = await api.listThreads({ view: 'starred' });
    expect(page.nextCursor).toBeNull();
  });
});
