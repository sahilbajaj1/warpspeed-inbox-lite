/**
 * Minimal credits projector (Phase 9 listens for balance.updated; Phase 10 adds UI/SSE).
 * Inputs: meta.userBalance, X-User-Balance, socket balance.updated.
 */

type Listener = () => void;

export type CreditsStore = {
  subscribe: (listener: Listener) => () => void;
  getBalance: () => number | null;
  setBalance: (balance: number, source: string) => void;
  clear: () => void;
};

export function createCreditsStore(): CreditsStore {
  let balance: number | null = null;
  const listeners = new Set<Listener>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getBalance() {
      return balance;
    },

    setBalance(next, _source) {
      if (!Number.isFinite(next) || next < 0) {
        return;
      }
      if (balance === next) {
        return;
      }
      balance = next;
      emit();
    },

    clear() {
      balance = null;
      emit();
    },
  };
}

let singleton: CreditsStore | null = null;

export function getCreditsStore(): CreditsStore {
  if (!singleton) {
    singleton = createCreditsStore();
  }
  return singleton;
}

export function __resetCreditsStoreForTests(next?: CreditsStore): void {
  singleton = next ?? null;
}
