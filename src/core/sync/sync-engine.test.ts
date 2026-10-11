import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/api/errors';
import type { SyncData, Thread } from '@/core/api/schemas';
import { createMemoryThreadCacheRepository } from '@/core/database/thread-cache-repository';
import { createThreadEventApplier } from '@/core/sync/apply-thread-event';
import type { SyncApi } from '@/core/sync/sync-api';
import { createMemorySyncCursorStore } from '@/core/sync/sync-cursor-store';
import { createSyncEngine } from '@/core/sync/sync-engine';
import { createMemoryTombstoneStore } from '@/core/sync/tombstone-store';
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

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(inboxQueryKeys.mailbox('inbox'), {
    pages: [{ threads: [thread()], nextCursor: null }],
    pageParams: [null],
  });
  const cursorStore = createMemorySyncCursorStore();
  const tombstones = createMemoryTombstoneStore();
  const threadCache = createMemoryThreadCacheRepository();
  const actionQueue = createThreadActionQueue({
    threadsApi: { patchThread: jest.fn() } as unknown as ThreadsApi,
    queryClient,
    outbox: {
      loadAll: async () => ({ primary: [], followUps: [] }),
      upsert: async () => undefined,
      removeBySlot: async () => undefined,
      removeById: async () => undefined,
      clearAll: async () => undefined,
    },
    threadCache,
  });
  const applier = createThreadEventApplier({
    queryClient,
    threadCache,
    tombstones,
    actionQueue,
  });
  return { queryClient, cursorStore, tombstones, applier };
}

describe('createSyncEngine', () => {
  it('buffers realtime events during catch-up then drains them', async () => {
    const { queryClient, cursorStore, applier } = setup();
    await cursorStore.set('tok_0');

    let resolveFetch!: (value: SyncData) => void;
    const fetchSince: SyncApi['fetchSince'] = () =>
      new Promise<SyncData>((resolve) => {
        resolveFetch = resolve;
      });

    const engine = createSyncEngine({
      syncApi: { fetchSince },
      cursorStore,
      applier,
      onBaselineReload: jest.fn(),
    });

    engine.beginBuffering();
    const catchUpPromise = engine.catchUp();

    await engine.handleRealtimeEvent({
      kind: 'upsert',
      thread: thread({ id: 'thr_2', subject: 'Live', version: 1 }),
      syncToken: 'tok_live',
    });

    // Live event must not appear until catch-up finishes.
    expect(
      queryClient
        .getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads.find((item) => item.id === 'thr_2'),
    ).toBeUndefined();

    resolveFetch({
      changes: [
        {
          type: 'thread.upsert',
          thread: thread({ id: 'thr_1', subject: 'Synced', version: 2 }),
        },
      ],
      syncToken: 'tok_1',
      hasMore: false,
    });
    await catchUpPromise;

    expect(
      queryClient.getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads.find((item) => item.id === 'thr_1')?.subject,
    ).toBe('Synced');
    expect(
      queryClient
        .getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads.find((item) => item.id === 'thr_2')?.subject,
    ).toBe('Live');
    expect(await cursorStore.get()).toBe('tok_live');
  });

  it('reloads baseline on 410 and preserves the ability to apply later events', async () => {
    const { cursorStore, applier } = setup();
    await cursorStore.set('old_token');
    const onBaselineReload = jest.fn(async () => undefined);

    const engine = createSyncEngine({
      syncApi: {
        fetchSince: async () => {
          throw new ApiError({ category: 'gone', message: 'expired', status: 410 });
        },
      },
      cursorStore,
      applier,
      onBaselineReload,
    });

    await engine.catchUp();
    expect(onBaselineReload).toHaveBeenCalledTimes(1);
    expect(await cursorStore.get()).toBeNull();
  });

  it('ignores stale upsert after delete (tombstone)', async () => {
    const { queryClient, cursorStore, applier, tombstones } = setup();
    await cursorStore.set('tok_0');

    const engine = createSyncEngine({
      syncApi: {
        fetchSince: async () => ({
          changes: [
            { type: 'thread.delete', id: 'thr_1', version: 5 },
            {
              type: 'thread.upsert',
              thread: thread({ version: 4, subject: 'Stale' }),
            },
          ],
          syncToken: 'tok_1',
          hasMore: false,
        }),
      },
      cursorStore,
      applier,
      onBaselineReload: jest.fn(),
    });

    await engine.catchUp();

    expect(
      queryClient
        .getQueryData<{ pages: { threads: Thread[] }[] }>(inboxQueryKeys.mailbox('inbox'))
        ?.pages[0]?.threads.find((item) => item.id === 'thr_1'),
    ).toBeUndefined();
    expect(tombstones.getSync('thr_1')?.version).toBe(5);
  });
});
