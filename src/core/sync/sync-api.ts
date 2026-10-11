import type { ApiClient } from '@/core/api/client';
import { syncDataSchema, type SyncData } from '@/core/api/schemas';

export type SyncApi = {
  fetchSince: (input: { since: string; signal?: AbortSignal }) => Promise<SyncData>;
};

export function createSyncApi(client: ApiClient): SyncApi {
  return {
    async fetchSince({ since, signal }) {
      const { data } = await client.request({
        method: 'GET',
        path: '/sync',
        schema: syncDataSchema,
        query: { since },
        signal,
      });
      return data;
    },
  };
}
