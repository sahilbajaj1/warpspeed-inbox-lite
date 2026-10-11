import { createMemoryOutboxRepository } from '@/core/database/outbox-repository';
import type { ThreadActionCommand } from '@/features/inbox/actions/types';

function command(overrides?: Partial<ThreadActionCommand>): ThreadActionCommand {
  return {
    id: 'key_1',
    threadId: 'thr_1',
    field: 'isStarred',
    value: true,
    revertValue: false,
    status: 'queued',
    createdAt: 1,
    ...overrides,
  };
}

describe('createMemoryOutboxRepository', () => {
  it('upserts and loads primary + follow-up slots', async () => {
    const repo = createMemoryOutboxRepository();
    await repo.upsert(command(), 'primary');
    await repo.upsert(
      command({ id: 'key_2', value: false, status: 'queued', createdAt: 2 }),
      'follow_up',
    );

    const loaded = await repo.loadAll();
    expect(loaded.primary).toHaveLength(1);
    expect(loaded.followUps).toHaveLength(1);
    expect(loaded.primary[0]?.id).toBe('key_1');
    expect(loaded.followUps[0]?.id).toBe('key_2');
  });

  it('replaces the same slot while keeping uniqueness', async () => {
    const repo = createMemoryOutboxRepository();
    await repo.upsert(command({ id: 'a', value: true }), 'primary');
    await repo.upsert(command({ id: 'b', value: false }), 'primary');

    const loaded = await repo.loadAll();
    expect(loaded.primary).toHaveLength(1);
    expect(loaded.primary[0]?.id).toBe('b');
    expect(loaded.primary[0]?.value).toBe(false);
  });

  it('removes by slot and clears all', async () => {
    const repo = createMemoryOutboxRepository();
    await repo.upsert(command(), 'primary');
    await repo.removeBySlot('thr_1', 'isStarred', 'primary');
    expect((await repo.loadAll()).primary).toHaveLength(0);

    await repo.upsert(command(), 'primary');
    await repo.clearAll();
    expect((await repo.loadAll()).primary).toHaveLength(0);
  });
});
