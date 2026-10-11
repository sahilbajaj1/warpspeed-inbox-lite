import type { ApiClient } from '@/core/api/client';
import {
  normalizeThreadList,
  threadDetailSchema,
  threadListDataSchema,
  threadSchema,
  type Thread,
  type ThreadDetail,
} from '@/core/api/schemas';
import type { MailboxView } from '@/features/inbox/models/mailbox';

export type ThreadPage = {
  threads: Thread[];
  nextCursor: string | null;
  syncToken?: string;
};

export type ThreadPatch = {
  isRead?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
};

export type ThreadsApi = {
  listThreads: (input: {
    view: MailboxView;
    cursor?: string | null;
    limit?: number;
    signal?: AbortSignal;
  }) => Promise<ThreadPage>;
  getThread: (input: { id: string; signal?: AbortSignal }) => Promise<ThreadDetail>;
  patchThread: (input: {
    id: string;
    patch: ThreadPatch;
    idempotencyKey?: string;
    signal?: AbortSignal;
  }) => Promise<Thread>;
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

    async getThread({ id, signal }) {
      const { data } = await client.request({
        method: 'GET',
        path: `/threads/${id}`,
        schema: threadDetailSchema,
        signal,
      });
      return data;
    },

    async patchThread({ id, patch, idempotencyKey, signal }) {
      const { data } = await client.request({
        method: 'PATCH',
        path: `/threads/${id}`,
        body: patch,
        schema: threadSchema,
        idempotencyKey,
        signal,
        // Uncertain 5xx outcomes retry only when an idempotency key is present.
        retry: idempotencyKey ? undefined : false,
      });
      return data;
    },
  };
}
