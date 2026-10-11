import { ApiError, type ApiErrorCategory } from '@/core/api/errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RetryDecision = {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
};

export type RetryPolicyOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Cap for Retry-After waits (ms). */
  maxRetryAfterMs?: number;
  random?: () => number;
};

const DEFAULTS = {
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 8_000,
  maxRetryAfterMs: 30_000,
} as const;

/**
 * Parse HTTP Retry-After as delay seconds.
 * Supports integer seconds; HTTP-date values return null (caller uses backoff).
 */
export function parseRetryAfterSeconds(headerValue: string | null | undefined): number | null {
  if (!headerValue) {
    return null;
  }

  const trimmed = headerValue.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return null;
    }
    return seconds;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  const deltaSeconds = Math.ceil((dateMs - Date.now()) / 1000);
  return deltaSeconds > 0 ? deltaSeconds : 0;
}

export function computeBackoffDelayMs(
  attempt: number,
  options: RetryPolicyOptions = {},
): number {
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
  const random = options.random ?? Math.random;
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt));
  const jitter = exp * (0.15 * random());
  return Math.min(maxDelayMs, Math.round(exp + jitter));
}

function isIdempotentMethod(method: HttpMethod): boolean {
  return method === 'GET';
}

/**
 * Decide whether to retry a failed request.
 *
 * Rules:
 * - Never retry cancellations.
 * - Honor Retry-After for 429 (bounded).
 * - Safe automatic retries for idempotent reads on timeout/5xx/no_connection.
 * - Writes: only retry when an Idempotency-Key is present AND outcome is uncertain
 *   (timeout / server_failure). Never treat that as "definitely not applied".
 */
export function classifyRetry(input: {
  error: ApiError;
  method: HttpMethod;
  attempt: number;
  hasIdempotencyKey: boolean;
  options?: RetryPolicyOptions;
}): RetryDecision {
  const { error, method, attempt, hasIdempotencyKey } = input;
  const options = input.options ?? {};
  const maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
  const maxRetryAfterMs = options.maxRetryAfterMs ?? DEFAULTS.maxRetryAfterMs;

  if (attempt >= maxRetries) {
    return { shouldRetry: false, delayMs: 0, reason: 'max_retries_exhausted' };
  }

  if (error.category === 'cancellation') {
    return { shouldRetry: false, delayMs: 0, reason: 'cancelled' };
  }

  if (error.category === 'rate_limited') {
    const retryAfterMs =
      error.retryAfterSeconds !== undefined
        ? Math.min(error.retryAfterSeconds * 1000, maxRetryAfterMs)
        : computeBackoffDelayMs(attempt, options);
    return {
      shouldRetry: true,
      delayMs: retryAfterMs,
      reason: 'rate_limited',
    };
  }

  const retryableCategories: ApiErrorCategory[] = [
    'no_connection',
    'timeout',
    'server_failure',
  ];

  if (!retryableCategories.includes(error.category) && !error.retryable) {
    return { shouldRetry: false, delayMs: 0, reason: `non_retryable_${error.category}` };
  }

  if (isIdempotentMethod(method)) {
    return {
      shouldRetry: true,
      delayMs: computeBackoffDelayMs(attempt, options),
      reason: 'idempotent_read',
    };
  }

  if (hasIdempotencyKey && (error.outcomeUncertain || error.category === 'server_failure' || error.category === 'timeout' || error.category === 'no_connection')) {
    return {
      shouldRetry: true,
      delayMs: computeBackoffDelayMs(attempt, options),
      reason: 'idempotent_write_uncertain_outcome',
    };
  }

  return {
    shouldRetry: false,
    delayMs: 0,
    reason: 'non_idempotent_write_without_key_or_certainty',
  };
}
