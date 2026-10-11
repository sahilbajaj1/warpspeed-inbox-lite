import * as SecureStore from 'expo-secure-store';

import { logger } from '@/core/logging/logger';

const REFRESH_TOKEN_KEY = 'inbox_lite.refresh_token';

export type TokenStorage = {
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  clearRefreshToken: () => Promise<void>;
};

/**
 * Refresh tokens only. Access tokens stay in memory on the session manager.
 * Never log token values.
 */
export function createSecureTokenStorage(): TokenStorage {
  return {
    async getRefreshToken() {
      try {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      } catch (cause) {
        logger.warn('failed to read refresh token from secure storage', {
          reason: cause instanceof Error ? cause.name : 'unknown',
        });
        return null;
      }
    },

    async setRefreshToken(token: string) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    },

    async clearRefreshToken() {
      try {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } catch (cause) {
        logger.warn('failed to clear refresh token from secure storage', {
          reason: cause instanceof Error ? cause.name : 'unknown',
        });
      }
    },
  };
}

export function createMemoryTokenStorage(initial?: string | null): TokenStorage {
  let refreshToken = initial ?? null;
  return {
    async getRefreshToken() {
      return refreshToken;
    },
    async setRefreshToken(token: string) {
      refreshToken = token;
    },
    async clearRefreshToken() {
      refreshToken = null;
    },
  };
}
