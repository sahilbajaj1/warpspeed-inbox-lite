import { ApiError } from '@/core/api/errors';
import {
  classifyRetry,
  computeBackoffDelayMs,
  parseRetryAfterSeconds,
} from '@/core/api/retry-policy';

describe('parseRetryAfterSeconds', () => {
  it('parses integer seconds', () => {
    expect(parseRetryAfterSeconds('3')).toBe(3);
    expect(parseRetryAfterSeconds('0')).toBe(0);
  });

  it('returns null for missing or invalid values', () => {
    expect(parseRetryAfterSeconds(null)).toBeNull();
    expect(parseRetryAfterSeconds('')).toBeNull();
    expect(parseRetryAfterSeconds('not-a-date')).toBeNull();
  });

  it('parses HTTP-date into a non-negative delta', () => {
    const future = new Date(Date.now() + 5_000).toUTCString();
    const seconds = parseRetryAfterSeconds(future);
    expect(seconds).not.toBeNull();
    expect(seconds!).toBeGreaterThanOrEqual(4);
    expect(seconds!).toBeLessThanOrEqual(6);
  });
});

describe('computeBackoffDelayMs', () => {
  it('applies bounded exponential growth with jitter', () => {
    const delay0 = computeBackoffDelayMs(0, {
      baseDelayMs: 100,
      maxDelayMs: 10_000,
      random: () => 0,
    });
    const delay2 = computeBackoffDelayMs(2, {
      baseDelayMs: 100,
      maxDelayMs: 10_000,
      random: () => 0,
    });
    expect(delay0).toBe(100);
    expect(delay2).toBe(400);
  });
});

describe('classifyRetry', () => {
  it('retries idempotent GET on server failure', () => {
    const decision = classifyRetry({
      error: new ApiError({ category: 'server_failure', message: 'boom', status: 503 }),
      method: 'GET',
      attempt: 0,
      hasIdempotencyKey: false,
      options: { random: () => 0, baseDelayMs: 100 },
    });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.reason).toBe('idempotent_read');
  });

  it('does not blindly retry PATCH without idempotency key', () => {
    const decision = classifyRetry({
      error: new ApiError({
        category: 'server_failure',
        message: 'boom',
        status: 500,
        outcomeUncertain: true,
      }),
      method: 'PATCH',
      attempt: 0,
      hasIdempotencyKey: false,
    });
    expect(decision.shouldRetry).toBe(false);
  });

  it('retries uncertain PATCH when idempotency key is present', () => {
    const decision = classifyRetry({
      error: new ApiError({
        category: 'server_failure',
        message: 'boom',
        status: 500,
        outcomeUncertain: true,
      }),
      method: 'PATCH',
      attempt: 0,
      hasIdempotencyKey: true,
      options: { random: () => 0, baseDelayMs: 200 },
    });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.reason).toBe('idempotent_write_uncertain_outcome');
  });

  it('honors Retry-After for HTTP 429', () => {
    const decision = classifyRetry({
      error: new ApiError({
        category: 'rate_limited',
        message: 'slow down',
        status: 429,
        retryAfterSeconds: 2,
      }),
      method: 'GET',
      attempt: 0,
      hasIdempotencyKey: false,
    });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.delayMs).toBe(2_000);
  });

  it('never retries cancellations', () => {
    const decision = classifyRetry({
      error: new ApiError({ category: 'cancellation', message: 'cancelled' }),
      method: 'GET',
      attempt: 0,
      hasIdempotencyKey: false,
    });
    expect(decision.shouldRetry).toBe(false);
  });
});
