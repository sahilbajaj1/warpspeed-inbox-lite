import type { ApiClient } from '@/core/api/client';
import {
  normalizeThreadList,
  threadListDataSchema,
  type Thread,
} from '@/core/api/schemas';
import type { MailboxView } from '@/features/inbox/models/mailbox';

export type ThreadPage = {
  threads: Thread[];
  nextCursor: string | null;
  syncToken?: string;
};

export type ThreadsApi = {
  listThreads: (input: {
    view: MailboxView;
    cursor?: string | null;
    limit?: number;
    signal?: AbortSignal;
  }) => Promise<ThreadPage>;
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

export function createThreadsApi(client: ApiClient): ThreadsApi {
  return {
    async listThreads({ view, cursor, limit = DEFAULT_LIMIT, signal }) {
      const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
      const { data, meta } = await client.request({
        method: 'GET',
        path: '/threads',
        schema: threadListDataSchema,
        query: {
          view,
          cursor: cursor ?? undefined,
          limit: safeLimit,
        },
        signal,
      });

      return {
        threads: normalizeThreadList(data),
        nextCursor: meta.nextCursor ?? null,
        syncToken: meta.syncToken,
      };
    },
  };
}
