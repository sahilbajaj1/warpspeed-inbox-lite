import type { Thread } from '@/core/api/schemas';
import { createMemoryThreadCacheRepository } from '@/core/database/thread-cache-repository';

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

describe('createMemoryThreadCacheRepository', () => {
  it('persists mailbox pages and thread details', async () => {
    const cache = createMemoryThreadCacheRepository();
    await cache.replaceMailbox('inbox', [{ threads: [thread()], nextCursor: 'c1' }]);
    const mailbox = await cache.loadMailbox('inbox');
    expect(mailbox?.pages[0]?.threads[0]?.id).toBe('thr_1');
    expect(mailbox?.pages[0]?.nextCursor).toBe('c1');

    await cache.saveThreadDetail({
      ...thread(),
      messages: [
        {
          id: 'msg_1',
          bodyText: 'Hi',
          sentAt: '2026-10-05T09:00:00Z',
        },
      ],
    });
    const detail = await cache.loadThreadDetail('thr_1');
    expect(detail?.messages).toHaveLength(1);
  });

  it('moves archived threads between mailbox caches', async () => {
    const cache = createMemoryThreadCacheRepository();
    await cache.replaceMailbox('inbox', [{ threads: [thread()], nextCursor: null }]);
    await cache.applyFieldPatch('thr_1', { isArchived: true });

    const inbox = await cache.loadMailbox('inbox');
    const archived = await cache.loadMailbox('archived');
    expect(inbox?.pages[0]?.threads.find((item) => item.id === 'thr_1')).toBeUndefined();
    expect(archived?.pages[0]?.threads[0]?.isArchived).toBe(true);
  });
});
