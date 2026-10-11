import { createCreditsStore } from '@/features/credits/credits-store';

describe('createCreditsStore', () => {
  it('updates from meta/header/socket sources and notifies subscribers', () => {
    const store = createCreditsStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.setBalance(5, 'meta');
    store.setBalance(4, 'summary_header');
    store.setBalance(4, 'socket'); // no-op same value
    store.setBalance(3, 'socket');

    expect(store.getBalance()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.setBalance(2, 'meta');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('ignores invalid balances', () => {
    const store = createCreditsStore();
    store.setBalance(-1, 'meta');
    store.setBalance(Number.NaN, 'meta');
    expect(store.getBalance()).toBeNull();
    store.setBalance(0, 'meta');
    expect(store.getBalance()).toBe(0);
  });
});
