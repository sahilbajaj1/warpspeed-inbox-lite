import { z } from 'zod';

import { createApiClient } from '@/core/api/client';
import type { HttpTransport } from '@/core/api/transport';
import { createSessionManager } from '@/core/auth/session-manager';
import { createMemoryTokenStorage } from '@/core/auth/token-storage';
import { createAuthApi } from '@/features/auth/api/auth-api';

const dataSchema = z.object({ id: z.string() });

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('refresh integration', () => {
  it('ten concurrent 401s trigger a single refresh then succeed', async () => {
    let refreshCalls = 0;
    let successfulAuthedCalls = 0;

    const transport: HttpTransport = {
      async request(url, init) {
        if (url.includes('/auth/login')) {
          return jsonResponse({
            data: {
              accessToken: 'access-1',
              refreshToken: 'refresh-1',
              expiresIn: 300,
            },
            meta: {},
          });
        }

        if (url.includes('/auth/refresh')) {
          refreshCalls += 1;
          return jsonResponse({
            data: {
              accessToken: 'access-2',
              refreshToken: 'refresh-2',
              expiresIn: 300,
            },
            meta: {},
          });
        }

        const auth = new Headers(init.headers).get('Authorization');
        if (auth === 'Bearer access-1') {
          return jsonResponse(
            { error: { code: 'token_expired', message: 'expired' } },
            { status: 401 },
          );
        }

        successfulAuthedCalls += 1;
        expect(auth).toBe('Bearer access-2');
        return jsonResponse({ data: { id: 'ok' }, meta: {} });
      },
    };

    const client = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      sleep: async () => undefined,
      retry: { maxRetries: 0 },
    });

    const session = createSessionManager({
      authApi: createAuthApi(client),
      tokenStorage: createMemoryTokenStorage(),
    });

    const authedClient = createApiClient({
      baseUrl: 'https://example.test/v1',
      transport,
      tokens: {
        getAccessToken: () => session.getAccessToken(),
        refreshAccessToken: () => session.refreshAccessToken(),
      },
      sleep: async () => undefined,
      retry: { maxRetries: 0 },
    });

    await session.login({ email: 'user@example.com', password: 'secret' });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        authedClient.request({
          method: 'GET',
          path: '/threads',
          schema: dataSchema,
        }),
      ),
    );

    expect(refreshCalls).toBe(1);
    expect(successfulAuthedCalls).toBe(10);
    expect(results.every((result) => result.data.id === 'ok')).toBe(true);
  });
});
