import type { Thread } from '@/core/api/schemas';
import type {
  ConfirmedThreadLookup,
  ReconcileDeleteDecision,
  ReconcileUpsertDecision,
} from '@/core/sync/types';

/**
 * Version + tombstone rules for at-least-once / out-of-order sync & socket events.
 *
 * - Upsert applies only when incoming.version >= confirmed.version
 * - Upsert is ignored when a tombstone exists at version >= incoming.version
 * - Delete applies when incoming.version >= confirmed.version (or thread unknown)
 * - Delete refreshes the tombstone to the higher version
 */
export function decideUpsert(
  incoming: Thread,
  lookup: ConfirmedThreadLookup,
): ReconcileUpsertDecision {
  const tombstone = lookup.getTombstone(incoming.id);
  if (tombstone && tombstone.version >= incoming.version) {
    return { action: 'ignore', reason: 'tombstoned' };
  }

  const confirmedVersion = lookup.getVersion(incoming.id);
  if (confirmedVersion !== undefined && incoming.version < confirmedVersion) {
    return { action: 'ignore', reason: 'stale_version' };
  }

  return { action: 'apply', thread: incoming };
}

export function decideDelete(
  id: string,
  version: number,
  lookup: ConfirmedThreadLookup,
): ReconcileDeleteDecision {
  const confirmedVersion = lookup.getVersion(id);
  if (confirmedVersion !== undefined && version < confirmedVersion) {
    return { action: 'ignore', reason: 'stale_version' };
  }

  const tombstone = lookup.getTombstone(id);
  if (tombstone && version < tombstone.version) {
    return { action: 'ignore', reason: 'stale_version' };
  }

  return { action: 'apply', id, version };
}
