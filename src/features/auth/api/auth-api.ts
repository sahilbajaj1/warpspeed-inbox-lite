import type { ApiClient } from '@/core/api/client';
import { authTokensSchema, emptyObjectSchema, type AuthTokens } from '@/core/api/schemas';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthApi = {
  login: (credentials: LoginCredentials) => Promise<AuthTokens>;
  refresh: (refreshToken: string) => Promise<AuthTokens>;
  logout: (refreshToken: string) => Promise<void>;
};

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    async login(credentials) {
      const { data } = await client.request({
        method: 'POST',
        path: '/auth/login',
        body: credentials,
        schema: authTokensSchema,
        auth: false,
        skipAuthRefresh: true,
        retry: false,
      });
      return data;
    },

    async refresh(refreshToken) {
      const { data } = await client.request({
        method: 'POST',
        path: '/auth/refresh',
        body: { refreshToken },
        schema: authTokensSchema,
        auth: false,
        skipAuthRefresh: true,
        retry: false,
      });
      return data;
    },

    async logout(refreshToken) {
      await client.request({
        method: 'POST',
        path: '/auth/logout',
        body: { refreshToken },
        schema: emptyObjectSchema,
        auth: false,
        skipAuthRefresh: true,
        retry: false,
      });
    },
  };
}
