import { ApiError, isApiError } from '@/core/api/errors';
import type { AuthTokens } from '@/core/api/schemas';
import type { TokenStorage } from '@/core/auth/token-storage';
import { logger } from '@/core/logging/logger';
import type { AuthApi, LoginCredentials } from '@/features/auth/api/auth-api';

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

export type SessionSnapshot = {
  status: SessionStatus;
  sessionGeneration: number;
};

export type SessionManagerOptions = {
  authApi: AuthApi;
  tokenStorage: TokenStorage;
  /** Clock skew / proactive refresh buffer before access expiry. */
  expirySkewMs?: number;
  onSessionCleared?: () => void;
  now?: () => number;
};

export type SessionManager = {
  getSnapshot: () => SessionSnapshot;
  subscribe: (listener: () => void) => () => void;
  bootstrap: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  /** Single-flight refresh used by the API client on 401. */
  refreshAccessToken: () => Promise<boolean>;
  /** Test helper */
  getSessionGeneration: () => number;
};

export function createSessionManager(options: SessionManagerOptions): SessionManager {
  const expirySkewMs = options.expirySkewMs ?? 30_000;
  const now = options.now ?? Date.now;

  let status: SessionStatus = 'bootstrapping';
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let accessExpiresAtMs = 0;
  let sessionGeneration = 0;
  let refreshPromise: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function setStatus(next: SessionStatus): void {
    if (status === next) {
      return;
    }
    status = next;
    emit();
  }

  function clearMemoryTokens(): void {
    accessToken = null;
    refreshToken = null;
    accessExpiresAtMs = 0;
  }

  function applyTokens(tokens: AuthTokens, generation: number): boolean {
    if (generation !== sessionGeneration) {
      logger.warn('ignoring late token apply from previous session generation');
      return false;
    }
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    accessExpiresAtMs = now() + tokens.expiresIn * 1000;
    return true;
  }

  async function clearSession(reason: string): Promise<void> {
    sessionGeneration += 1;
    refreshPromise = null;
    clearMemoryTokens();
    await options.tokenStorage.clearRefreshToken();
    setStatus('unauthenticated');
    logger.info('session cleared', { reason });
    options.onSessionCleared?.();
  }

  async function persistAndApply(tokens: AuthTokens, generation: number): Promise<boolean> {
    // Ignore late responses before touching secure storage.
    if (generation !== sessionGeneration) {
      logger.warn('ignoring late token persist from previous session generation');
      return false;
    }
    // Persist rotated refresh token BEFORE publishing it for future refresh attempts.
    await options.tokenStorage.setRefreshToken(tokens.refreshToken);
    // Re-check after the await — login/logout may have advanced the generation.
    if (generation !== sessionGeneration) {
      logger.warn('session changed during token persist; restoring current token');
      if (refreshToken) {
        await options.tokenStorage.setRefreshToken(refreshToken);
      } else {
        await options.tokenStorage.clearRefreshToken();
      }
      return false;
    }
    return applyTokens(tokens, generation);
  }

  async function runRefresh(): Promise<boolean> {
    const generation = sessionGeneration;
    const token = refreshToken ?? (await options.tokenStorage.getRefreshToken());
    if (!token) {
      return false;
    }
    // Keep in-memory refresh aligned for concurrent waiters.
    refreshToken = token;

    try {
      const tokens = await options.authApi.refresh(token);
      if (generation !== sessionGeneration) {
        return false;
      }
      const applied = await persistAndApply(tokens, generation);
      if (applied) {
        setStatus('authenticated');
      }
      return applied;
    } catch (error) {
      if (generation !== sessionGeneration) {
        return false;
      }

      const reused =
        isApiError(error) &&
        (error.code === 'refresh_token_reused' || error.category === 'unauthorized');

      if (reused) {
        await clearSession(
          error instanceof ApiError && error.code === 'refresh_token_reused'
            ? 'refresh_token_reused'
            : 'refresh_unauthorized',
        );
        return false;
      }

      logger.warn('refresh failed', {
        category: isApiError(error) ? error.category : 'unknown',
      });
      await clearSession('refresh_failed');
      return false;
    }
  }

  async function refreshAccessToken(): Promise<boolean> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  return {
    getSnapshot() {
      return { status, sessionGeneration };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSessionGeneration() {
      return sessionGeneration;
    },

    async bootstrap() {
      setStatus('bootstrapping');
      const stored = await options.tokenStorage.getRefreshToken();
      if (!stored) {
        clearMemoryTokens();
        setStatus('unauthenticated');
        return;
      }

      refreshToken = stored;
      const ok = await refreshAccessToken();
      if (!ok && status === 'bootstrapping') {
        setStatus('unauthenticated');
      }
    },

    async login(credentials) {
      const tokens = await options.authApi.login(credentials);
      sessionGeneration += 1;
      const generation = sessionGeneration;
      const applied = await persistAndApply(tokens, generation);
      if (!applied) {
        throw new ApiError({
          category: 'unknown',
          message: 'Failed to establish session after login.',
        });
      }
      setStatus('authenticated');
    },

    async logout() {
      const generation = sessionGeneration;
      const token = refreshToken;
      // Invalidate session immediately so in-flight work cannot refresh with old tokens.
      sessionGeneration += 1;
      refreshPromise = null;
      clearMemoryTokens();
      await options.tokenStorage.clearRefreshToken();
      setStatus('unauthenticated');
      options.onSessionCleared?.();

      if (token && generation >= 0) {
        try {
          await options.authApi.logout(token);
        } catch (error) {
          logger.warn('logout API failed after local session clear', {
            category: isApiError(error) ? error.category : 'unknown',
          });
        }
      }
    },

    async getAccessToken() {
      if (status !== 'authenticated') {
        return null;
      }
      if (accessToken && now() < accessExpiresAtMs - expirySkewMs) {
        return accessToken;
      }
      const refreshed = await refreshAccessToken();
      return refreshed ? accessToken : null;
    },

    refreshAccessToken,
  };
}
