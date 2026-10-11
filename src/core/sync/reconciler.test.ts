import type { Thread } from '@/core/api/schemas';
import { decideDelete, decideUpsert } from '@/core/sync/reconciler';
import type { ConfirmedThreadLookup, Tombstone } from '@/core/sync/types';

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

function lookup(input: {
  versions?: Record<string, number>;
  tombstones?: Record<string, Tombstone>;
}): ConfirmedThreadLookup {
  return {
    getVersion: (id) => input.versions?.[id],
    getTombstone: (id) => input.tombstones?.[id],
  };
}

describe('decideUpsert', () => {
  it('applies when thread is unknown', () => {
    expect(decideUpsert(thread({ version: 1 }), lookup({}))).toEqual({
      action: 'apply',
      thread: thread({ version: 1 }),
    });
  });

  it('applies equal or newer versions', () => {
    const state = lookup({ versions: { thr_1: 2 } });
    expect(decideUpsert(thread({ version: 2 }), state).action).toBe('apply');
    expect(decideUpsert(thread({ version: 3 }), state).action).toBe('apply');
  });

  it('ignores older versions', () => {
    expect(
      decideUpsert(thread({ version: 1 }), lookup({ versions: { thr_1: 3 } })),
    ).toEqual({ action: 'ignore', reason: 'stale_version' });
  });

  it('ignores upserts blocked by a tombstone', () => {
    expect(
      decideUpsert(
        thread({ version: 2 }),
        lookup({ tombstones: { thr_1: { id: 'thr_1', version: 2 } } }),
      ),
    ).toEqual({ action: 'ignore', reason: 'tombstoned' });
  });

  it('allows upsert newer than a tombstone (resurrection at higher version)', () => {
    expect(
      decideUpsert(
        thread({ version: 5 }),
        lookup({ tombstones: { thr_1: { id: 'thr_1', version: 2 } } }),
      ).action,
    ).toBe('apply');
  });
});

describe('decideDelete', () => {
  it('applies delete for unknown threads', () => {
    expect(decideDelete('thr_1', 1, lookup({}))).toEqual({
      action: 'apply',
      id: 'thr_1',
      version: 1,
    });
  });

  it('ignores stale deletes against confirmed version', () => {
    expect(decideDelete('thr_1', 1, lookup({ versions: { thr_1: 4 } }))).toEqual({
      action: 'ignore',
      reason: 'stale_version',
    });
  });

  it('ignores stale deletes against an existing tombstone', () => {
    expect(
      decideDelete('thr_1', 2, lookup({ tombstones: { thr_1: { id: 'thr_1', version: 5 } } })),
    ).toEqual({ action: 'ignore', reason: 'stale_version' });
  });
});
