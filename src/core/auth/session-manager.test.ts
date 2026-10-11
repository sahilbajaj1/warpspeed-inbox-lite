import { ApiError } from '@/core/api/errors';
import type { AuthTokens } from '@/core/api/schemas';
import { createSessionManager } from '@/core/auth/session-manager';
import { createMemoryTokenStorage } from '@/core/auth/token-storage';
import type { AuthApi } from '@/features/auth/api/auth-api';

function tokens(overrides?: Partial<AuthTokens>): AuthTokens {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresIn: 300,
    ...overrides,
  };
}

function createAuthApiMock(overrides?: Partial<AuthApi>): AuthApi {
  return {
    login: jest.fn(async (_credentials: { email: string; password: string }) => tokens()),
    refresh: jest.fn(async (_refreshToken: string) =>
      tokens({ accessToken: 'access-2', refreshToken: 'refresh-2' }),
    ),
    logout: jest.fn(async (_refreshToken: string) => undefined),
    ...overrides,
  };
}

function asMock(fn: unknown): jest.Mock {
  return fn as jest.Mock;
}

describe('createSessionManager', () => {
  it('logs in successfully and persists the refresh token', async () => {
    const storage = createMemoryTokenStorage();
    const authApi = createAuthApiMock();
    const manager = createSessionManager({ authApi, tokenStorage: storage });

    await manager.login({ email: 'user@example.com', password: 'secret' });

    expect(manager.getSnapshot().status).toBe('authenticated');
    expect(await storage.getRefreshToken()).toBe('refresh-1');
    expect(await manager.getAccessToken()).toBe('access-1');
  });

  it('rejects invalid login without authenticating', async () => {
    const storage = createMemoryTokenStorage();
    const authApi = createAuthApiMock({
      login: jest.fn(async () => {
        throw new ApiError({ category: 'unauthorized', message: 'bad', status: 401 });
      }),
    });
    const manager = createSessionManager({ authApi, tokenStorage: storage });

    await expect(
      manager.login({ email: 'user@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(await storage.getRefreshToken()).toBeNull();
    expect(await manager.getAccessToken()).toBeNull();
  });

  it('restores a session from stored refresh token', async () => {
    const storage = createMemoryTokenStorage('refresh-stored');
    const authApi = createAuthApiMock({
      refresh: jest.fn(async () =>
        tokens({ accessToken: 'access-restored', refreshToken: 'refresh-new' }),
      ),
    });
    const manager = createSessionManager({ authApi, tokenStorage: storage });

    await manager.bootstrap();

    expect(asMock(authApi.refresh)).toHaveBeenCalledWith('refresh-stored');
    expect(manager.getSnapshot().status).toBe('authenticated');
    expect(await storage.getRefreshToken()).toBe('refresh-new');
    expect(await manager.getAccessToken()).toBe('access-restored');
  });

  it('fails cold start restoration to login when refresh is invalid', async () => {
    const storage = createMemoryTokenStorage('stale-refresh');
    const authApi = createAuthApiMock({
      refresh: jest.fn(async () => {
        throw new ApiError({
          category: 'unauthorized',
          code: 'invalid',
          message: 'nope',
          status: 401,
        });
      }),
    });
    const manager = createSessionManager({ authApi, tokenStorage: storage });

    await manager.bootstrap();

    expect(manager.getSnapshot().status).toBe('unauthenticated');
    expect(await storage.getRefreshToken()).toBeNull();
  });

  it('coalesces ten concurrent refreshes into one network call', async () => {
    let resolveRefresh!: (value: AuthTokens) => void;
    const refreshGate = new Promise<AuthTokens>((resolve) => {
      resolveRefresh = resolve;
    });

    const authApi = createAuthApiMock({
      refresh: jest.fn(async () => refreshGate),
    });
    const manager = createSessionManager({
      authApi,
      tokenStorage: createMemoryTokenStorage('refresh-shared'),
    });

    const resultsPromise = Promise.all(
      Array.from({ length: 10 }, () => manager.refreshAccessToken()),
    );
    resolveRefresh(tokens({ accessToken: 'access-rotated', refreshToken: 'refresh-rotated' }));
    const results = await resultsPromise;

    expect(asMock(authApi.refresh)).toHaveBeenCalledTimes(1);
    expect(results.every(Boolean)).toBe(true);
    expect(manager.getSnapshot().status).toBe('authenticated');
    expect(await manager.getAccessToken()).toBe('access-rotated');
  });

  it('persists rotated refresh token before publishing session tokens', async () => {
    const storage = createMemoryTokenStorage('refresh-old');
    const order: string[] = [];
    const authApi = createAuthApiMock({
      refresh: jest.fn(async () => {
        order.push('network-refresh');
        return tokens({ accessToken: 'access-new', refreshToken: 'refresh-new' });
      }),
    });
    const trackingStorage = {
      getRefreshToken: async () => storage.getRefreshToken(),
      setRefreshToken: async (token: string) => {
        order.push(`persist:${token}`);
        await storage.setRefreshToken(token);
      },
      clearRefreshToken: async () => storage.clearRefreshToken(),
    };
    const manager = createSessionManager({ authApi, tokenStorage: trackingStorage });
    await manager.bootstrap();

    expect(order).toEqual(['network-refresh', 'persist:refresh-new']);
    expect(await storage.getRefreshToken()).toBe('refresh-new');
  });

  it('clears the session when a refresh token is reused', async () => {
    const storage = createMemoryTokenStorage('refresh-1');
    const authApi = createAuthApiMock({
      refresh: jest.fn(async () => {
        throw new ApiError({
          category: 'unauthorized',
          code: 'refresh_token_reused',
          message: 'reused',
          status: 401,
        });
      }),
    });
    const onSessionCleared = jest.fn();
    const manager = createSessionManager({ authApi, tokenStorage: storage, onSessionCleared });

    await manager.bootstrap();

    expect(manager.getSnapshot().status).toBe('unauthenticated');
    expect(await storage.getRefreshToken()).toBeNull();
    expect(onSessionCleared).toHaveBeenCalled();
  });

  it('refresh failure clears session safely', async () => {
    const storage = createMemoryTokenStorage('refresh-1');
    const authApi = createAuthApiMock({
      refresh: jest.fn(async () => {
        throw new ApiError({ category: 'server_failure', message: 'down', status: 500 });
      }),
    });
    const manager = createSessionManager({ authApi, tokenStorage: storage });

    await manager.bootstrap();

    expect(manager.getSnapshot().status).toBe('unauthenticated');
    expect(await storage.getRefreshToken()).toBeNull();
  });

  it('logout clears local session even if the logout API fails', async () => {
    const storage = createMemoryTokenStorage();
    const authApi = createAuthApiMock({
      logout: jest.fn(async () => {
        throw new ApiError({ category: 'server_failure', message: 'down', status: 500 });
      }),
    });
    const manager = createSessionManager({ authApi, tokenStorage: storage });
    await manager.login({ email: 'user@example.com', password: 'secret' });

    const generationBefore = manager.getSessionGeneration();
    await manager.logout();

    expect(manager.getSnapshot().status).toBe('unauthenticated');
    expect(await storage.getRefreshToken()).toBeNull();
    expect(manager.getSessionGeneration()).toBeGreaterThan(generationBefore);
    expect(await manager.getAccessToken()).toBeNull();
  });

  it('ignores late refresh responses from a previous session generation', async () => {
    let resolveRefresh!: (value: AuthTokens) => void;
    const refreshGate = new Promise<AuthTokens>((resolve) => {
      resolveRefresh = resolve;
    });
    const authApi = createAuthApiMock({
      refresh: jest.fn(async () => refreshGate),
      login: jest.fn(async () =>
        tokens({ accessToken: 'login-access', refreshToken: 'login-refresh' }),
      ),
    });
    const storage = createMemoryTokenStorage('refresh-old');
    const manager = createSessionManager({ authApi, tokenStorage: storage });

    const refreshPromise = manager.refreshAccessToken();
    await manager.login({ email: 'user@example.com', password: 'secret' });
    resolveRefresh(tokens({ accessToken: 'stale-access', refreshToken: 'stale-refresh' }));
    await refreshPromise;

    expect(await manager.getAccessToken()).toBe('login-access');
    expect(await storage.getRefreshToken()).toBe('login-refresh');
  });
});
