import { z } from 'zod';

import { ApiError } from '@/core/api/errors';
import {
  extractUserBalanceHeader,
  parseApiErrorFromBody,
  parseEnvelope,
} from '@/core/api/response-parser';
import { threadSchema } from '@/core/api/schemas';

const sampleThread = {
  id: 'thr_1',
  subject: 'Hello',
  participants: [{ name: 'Priya', email: 'priya@example.com' }],
  snippet: 'Hi',
  lastMessageAt: '2026-10-05T09:14:03Z',
  messageCount: 1,
  isRead: false,
  isStarred: false,
  isArchived: false,
  version: 1,
};

describe('parseEnvelope', () => {
  it('parses a valid success envelope and meta', () => {
    const result = parseEnvelope(
      { data: sampleThread, meta: { userBalance: 42, nextCursor: null } },
      threadSchema,
    );

    expect(result.data.id).toBe('thr_1');
    expect(result.meta.userBalance).toBe(42);
    expect(result.meta.nextCursor).toBeNull();
  });

  it('rejects invalid envelopes', () => {
    expect(() => parseEnvelope({ data: { id: 'x' } }, threadSchema)).toThrow(ApiError);
    expect(() => parseEnvelope({ foo: 1 }, threadSchema)).toThrow(ApiError);
  });

  it('accepts typed nested data schemas', () => {
    const schema = z.object({ ok: z.boolean() });
    const result = parseEnvelope({ data: { ok: true }, meta: {} }, schema);
    expect(result.data.ok).toBe(true);
  });
});

describe('parseApiErrorFromBody', () => {
  it('maps status and code into ApiError categories', () => {
    const error = parseApiErrorFromBody(
      { error: { code: 'insufficient_credits', message: 'No credits left' } },
      402,
    );
    expect(error.category).toBe('insufficient_credits');
    expect(error.code).toBe('insufficient_credits');
    expect(error.message).toBe('No credits left');
  });

  it('captures Retry-After on 429', () => {
    const headers = new Headers({ 'Retry-After': '7' });
    const error = parseApiErrorFromBody(
      { error: { code: 'rate_limited', message: 'Wait' } },
      429,
      headers,
    );
    expect(error.category).toBe('rate_limited');
    expect(error.retryAfterSeconds).toBe(7);
  });

  it('marks 5xx as outcome-uncertain', () => {
    const error = parseApiErrorFromBody(
      { error: { code: 'internal', message: 'oops' } },
      500,
    );
    expect(error.outcomeUncertain).toBe(true);
    expect(error.category).toBe('server_failure');
  });
});

describe('extractUserBalanceHeader', () => {
  it('reads X-User-Balance when valid', () => {
    const headers = new Headers({ 'X-User-Balance': '11' });
    expect(extractUserBalanceHeader(headers)).toBe(11);
  });

  it('ignores missing or invalid headers', () => {
    expect(extractUserBalanceHeader(new Headers())).toBeUndefined();
    expect(extractUserBalanceHeader(new Headers({ 'X-User-Balance': 'nope' }))).toBeUndefined();
  });
});
