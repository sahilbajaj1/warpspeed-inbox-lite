import type { Thread } from '@/core/api/schemas';

export type Tombstone = {
  id: string;
  version: number;
};

export type ConfirmedThreadLookup = {
  getVersion: (threadId: string) => number | undefined;
  getTombstone: (threadId: string) => Tombstone | undefined;
};

export type ReconcileUpsertDecision =
  | { action: 'apply'; thread: Thread }
  | { action: 'ignore'; reason: 'stale_version' | 'tombstoned' };

export type ReconcileDeleteDecision =
  | { action: 'apply'; id: string; version: number }
  | { action: 'ignore'; reason: 'stale_version' };

export type SocketThreadUpserted = {
  thread: Thread;
  syncToken?: string;
};

export type SocketThreadDeleted = {
  id: string;
  version: number;
  syncToken?: string;
};

export type SocketBalanceUpdated = {
  userBalance: number;
};

export type RealtimeThreadEvent =
  | { kind: 'upsert'; thread: Thread; syncToken?: string }
  | { kind: 'delete'; id: string; version: number; syncToken?: string };
