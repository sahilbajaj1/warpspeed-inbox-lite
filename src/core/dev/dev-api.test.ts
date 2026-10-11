import { createApiClient } from '@/core/api/client';
import { CHAOS_OFF, createDevApi, withChaos } from '@/core/dev/dev-api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createDevApi', () => {
  it('posts reset, chaos, and burst to /dev/*', async () => {
    const calls: { url: string; method?: string; body?: string }[] = [];
    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport: {
        async request(url, init) {
          calls.push({
            url,
            method: init.method,
            body: typeof init.body === 'string' ? init.body : undefined,
          });
          return jsonResponse({ data: {}, meta: {} });
        },
      },
      tokens: { getAccessToken: async () => 'tok' },
    });

    const dev = createDevApi(client);
    await dev.reset();
    await dev.setChaos({ failureRate: 0.3, latencyMs: 3000 });
    await dev.burst();

    expect(calls.map((call) => call.url)).toEqual([
      'https://example.test/v1/dev/reset',
      'https://example.test/v1/dev/chaos',
      'https://example.test/v1/dev/burst',
    ]);
    expect(calls[1]?.body).toBe(JSON.stringify({ failureRate: 0.3, latencyMs: 3000 }));
  });

  it('rejects invalid chaos config before networking', async () => {
    const transport = jest.fn();
    const client = createApiClient({
      transport: { request: transport },
      tokens: { getAccessToken: async () => 'tok' },
    });
    const dev = createDevApi(client);

    await expect(dev.setChaos({ failureRate: 2, latencyMs: 0 })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('withChaos', () => {
  it('restores chaos to off after successful work', async () => {
    const setChaos = jest.fn(async () => undefined);
    const dev = {
      reset: jest.fn(),
      setChaos,
      burst: jest.fn(),
    };

    const result = await withChaos(dev, { failureRate: 0.2, latencyMs: 1000 }, async () => 42);

    expect(result).toBe(42);
    expect(setChaos).toHaveBeenNthCalledWith(1, { failureRate: 0.2, latencyMs: 1000 });
    expect(setChaos).toHaveBeenNthCalledWith(2, CHAOS_OFF);
  });

  it('restores chaos to off even when work throws', async () => {
    const setChaos = jest.fn(async () => undefined);
    const dev = {
      reset: jest.fn(),
      setChaos,
      burst: jest.fn(),
    };

    await expect(
      withChaos(dev, { failureRate: 0.5, latencyMs: 500 }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(setChaos).toHaveBeenLastCalledWith(CHAOS_OFF);
  });
});
