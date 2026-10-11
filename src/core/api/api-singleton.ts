import { createApiClient, type ApiClient, type TokenProvider } from '@/core/api/client';

const unboundTokens: TokenProvider = {
  getAccessToken: async () => null,
  refreshAccessToken: async () => false,
};

let tokenProvider: TokenProvider = unboundTokens;

/**
 * Mutable token bridge so the session manager can be created after the client
 * without circular imports. Bound once during app bootstrap.
 */
export function bindApiTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export const apiClient: ApiClient = createApiClient({
  tokens: {
    getAccessToken: () => tokenProvider.getAccessToken(),
    refreshAccessToken: () =>
      tokenProvider.refreshAccessToken
        ? tokenProvider.refreshAccessToken()
        : Promise.resolve(false),
  },
});
