import { isApiError } from '@/core/api/errors';

/**
 * Failures where the write may already have applied (or should be retried with the
 * same idempotency key) — keep the outbox row queued instead of reverting UI.
 */
export function isUncertainActionFailure(error: unknown): boolean {
  if (!isApiError(error)) {
    return false;
  }
  if (error.outcomeUncertain) {
    return true;
  }
  return (
    error.category === 'no_connection' ||
    error.category === 'timeout' ||
    error.category === 'rate_limited' ||
    error.category === 'server_failure'
  );
}
