import { z } from 'zod';

import { createApiClient } from '@/core/api/client';
import { ApiError } from '@/core/api/errors';
import type { HttpTransport } from '@/core/api/transport';

const dataSchema = z.object({ id: z.string() });

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('createApiClient', () => {
  it('attaches Authorization bearer tokens', async () => {
    const calls: RequestInit[] = [];
    const transport: HttpTransport = {
      async request(_url, init) {
        calls.push(init);
        return jsonResponse({ data: { id: '1' }, meta: { userBalance: 9 } });
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      tokens: { getAccessToken: () => 'access-123' },
      retry: { maxRetries: 0 },
    });

    const result = await client.request({
      method: 'GET',
      path: '/threads',
      schema: dataSchema,
    });

    expect(result.data.id).toBe('1');
    expect(result.meta.userBalance).toBe(9);
    expect(new Headers(calls[0]?.headers).get('Authorization')).toBe('Bearer access-123');
  });

  it('updates balance from meta callbacks', async () => {
    const balances: number[] = [];
    const transport: HttpTransport = {
      async request() {
        return jsonResponse({ data: { id: '1' }, meta: { userBalance: 5 } });
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      onUserBalance: (balance) => balances.push(balance),
      retry: { maxRetries: 0 },
    });

    await client.request({ method: 'GET', path: '/threads/1', schema: dataSchema, auth: false });
    expect(balances).toEqual([5]);
  });

  it('refreshes once on 401 and retries the request', async () => {
    let calls = 0;
    const refresh = jest.fn(async () => true);
    const transport: HttpTransport = {
      async request() {
        calls += 1;
        if (calls === 1) {
          return jsonResponse(
            { error: { code: 'token_expired', message: 'expired' } },
            { status: 401 },
          );
        }
        return jsonResponse({ data: { id: 'ok' }, meta: {} });
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      tokens: {
        getAccessToken: () => 'old',
        refreshAccessToken: refresh,
      },
      retry: { maxRetries: 0 },
    });

    const result = await client.request({
      method: 'GET',
      path: '/threads',
      schema: dataSchema,
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.data.id).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not refresh auth endpoints on 401', async () => {
    const refresh = jest.fn(async () => true);
    const transport: HttpTransport = {
      async request() {
        return jsonResponse(
          { error: { code: 'invalid_credentials', message: 'bad' } },
          { status: 401 },
        );
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      tokens: {
        getAccessToken: () => null,
        refreshAccessToken: refresh,
      },
      retry: { maxRetries: 0 },
    });

    await expect(
      client.request({
        method: 'POST',
        path: '/auth/login',
        schema: dataSchema,
        body: { email: 'a', password: 'b' },
        auth: false,
      }),
    ).rejects.toMatchObject({ category: 'unauthorized' });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('retries idempotent GET after 503 then succeeds', async () => {
    let calls = 0;
    const transport: HttpTransport = {
      async request() {
        calls += 1;
        if (calls === 1) {
          return jsonResponse({ error: { code: 'unavailable', message: 'down' } }, { status: 503 });
        }
        return jsonResponse({ data: { id: 'recovered' }, meta: {} });
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      sleep: async () => undefined,
      retry: { maxRetries: 2, random: () => 0, baseDelayMs: 1 },
    });

    const result = await client.request({
      method: 'GET',
      path: '/threads',
      schema: dataSchema,
      auth: false,
    });

    expect(result.data.id).toBe('recovered');
    expect(calls).toBe(2);
  });

  it('surfaces cancellation from the caller signal', async () => {
    const controller = new AbortController();
    const transport: HttpTransport = {
      async request(_url, init) {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        });
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      timeoutMs: 10_000,
      retry: { maxRetries: 0 },
    });

    const pending = client.request({
      method: 'GET',
      path: '/threads',
      schema: dataSchema,
      auth: false,
      signal: controller.signal,
    });

    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(ApiError);
    await expect(pending).rejects.toMatchObject({ category: 'cancellation' });
  });
});
