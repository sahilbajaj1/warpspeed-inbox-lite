import { coalesceThreadAction } from '@/features/inbox/actions/coalesce';
import type { ThreadActionCommand } from '@/features/inbox/actions/types';

function queued(overrides?: Partial<ThreadActionCommand>): ThreadActionCommand {
  return {
    id: 'key-1',
    threadId: 'thr_1',
    field: 'isStarred',
    value: true,
    revertValue: false,
    status: 'queued',
    createdAt: 1,
    ...overrides,
  };
}

describe('coalesceThreadAction', () => {
  it('creates a new command with a fresh idempotency key', () => {
    const result = coalesceThreadAction({
      existing: undefined,
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      confirmedValue: false,
      now: 10,
    });
    expect(result.next).toMatchObject({
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      status: 'queued',
      revertValue: false,
    });
    expect(result.next?.id).toContain('isStarred:thr_1:');
  });

  it('keeps the same idempotency key when revising a queued intent', () => {
    const result = coalesceThreadAction({
      existing: queued({ value: true }),
      threadId: 'thr_1',
      field: 'isStarred',
      value: false,
      confirmedValue: false,
    });
    // value false === confirmed false → cancel
    expect(result.next).toBeNull();
    expect(result.replaced).toBe(true);
  });

  it('updates queued target value without changing the key', () => {
    const result = coalesceThreadAction({
      existing: queued({ value: false, revertValue: true, id: 'stable-key' }),
      threadId: 'thr_1',
      field: 'isStarred',
      value: true,
      confirmedValue: false,
    });
    expect(result.next).toMatchObject({ id: 'stable-key', value: true, status: 'queued' });
  });

  it('creates a follow-up key while a command is in flight', () => {
    const result = coalesceThreadAction({
      existing: queued({ status: 'in_flight', value: true, revertValue: false }),
      threadId: 'thr_1',
      field: 'isStarred',
      value: false,
      confirmedValue: false,
    });
    expect(result.next?.id).not.toBe('key-1');
    expect(result.next).toMatchObject({ value: false, status: 'queued' });
  });
});
