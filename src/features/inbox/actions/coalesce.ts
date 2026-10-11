import { createActionIdempotencyKey } from '@/features/inbox/actions/idempotency';
import type { ThreadActionCommand, ThreadActionField } from '@/features/inbox/actions/types';

/**
 * Coalesce rapid toggles on the same thread field.
 *
 * Rules:
 * - If a queued (not in-flight) command exists for the field, update its value in place
 *   and **keep the same idempotency key** (same logical intent, revised target).
 * - If the latest command is in-flight, create a new command with a new key that will
 *   run after the in-flight one finishes (latest user intent wins).
 * - Toggling back to the confirmed server value while still queued cancels the queued command.
 */
export function coalesceThreadAction(input: {
  existing: ThreadActionCommand | undefined;
  threadId: string;
  field: ThreadActionField;
  value: boolean;
  confirmedValue: boolean;
  now?: number;
}): { next: ThreadActionCommand | null; replaced: boolean } {
  const now = input.now ?? Date.now();
  const { existing, threadId, field, value, confirmedValue } = input;

  if (!existing || existing.status === 'failed') {
    if (value === confirmedValue) {
      return { next: null, replaced: Boolean(existing) };
    }
    return {
      next: {
        id: createActionIdempotencyKey(threadId, field),
        threadId,
        field,
        value,
        revertValue: confirmedValue,
        status: 'queued',
        createdAt: now,
      },
      replaced: Boolean(existing),
    };
  }

  if (existing.status === 'queued') {
    if (value === confirmedValue) {
      // User reverted to confirmed state before send — drop the command.
      return { next: null, replaced: true };
    }
    return {
      next: {
        ...existing,
        value,
        errorMessage: undefined,
      },
      replaced: true,
    };
  }

  // in_flight: schedule a follow-up intent with a new key.
  if (value === confirmedValue && value === existing.value) {
    // No follow-up needed if user wants what is already being sent and confirmed matches.
    return { next: null, replaced: false };
  }

  return {
    next: {
      id: createActionIdempotencyKey(threadId, field),
      threadId,
      field,
      value,
      revertValue: confirmedValue,
      status: 'queued',
      createdAt: now,
    },
    replaced: false,
  };
}
