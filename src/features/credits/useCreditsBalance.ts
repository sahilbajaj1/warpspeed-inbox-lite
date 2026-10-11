import { useSyncExternalStore } from 'react';

import { getCreditsStore } from '@/features/credits/credits-store';

export function useCreditsBalance(): number | null {
  const store = getCreditsStore();
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getBalance(),
    () => null,
  );
}
