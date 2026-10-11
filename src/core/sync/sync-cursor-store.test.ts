import { createMemorySyncCursorStore } from '@/core/sync/sync-cursor-store';

describe('createMemorySyncCursorStore', () => {
  it('stores and clears the sync token', async () => {
    const store = createMemorySyncCursorStore();
    expect(await store.get()).toBeNull();
    await store.set('tok_a');
    expect(await store.get()).toBe('tok_a');
    await store.clear();
    expect(await store.get()).toBeNull();
  });
});
