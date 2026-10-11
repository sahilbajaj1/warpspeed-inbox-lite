import type { InfiniteData } from '@tanstack/react-query';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  threadDetailSchema,
  threadSchema,
  type Thread,
  type ThreadDetail,
} from '@/core/api/schemas';
import type { ThreadPage } from '@/features/inbox/api/threads-api';
import type { MailboxView } from '@/features/inbox/models/mailbox';
import { MAILBOX_VIEWS } from '@/features/inbox/models/mailbox';

export type ThreadCacheRepository = {
  replaceMailbox: (view: MailboxView, pages: ThreadPage[]) => Promise<void>;
  loadMailbox: (view: MailboxView) => Promise<InfiniteData<ThreadPage> | null>;
  saveThreadDetail: (detail: ThreadDetail) => Promise<void>;
  loadThreadDetail: (id: string) => Promise<ThreadDetail | null>;
  upsertThread: (thread: Thread) => Promise<void>;
  removeThread: (threadId: string) => Promise<void>;
  applyFieldPatch: (
    threadId: string,
    patch: Partial<Pick<Thread, 'isRead' | 'isStarred' | 'isArchived' | 'version'>>,
  ) => Promise<void>;
  clearAll: () => Promise<void>;
};

function belongsInMailbox(view: MailboxView, thread: Thread): boolean {
  if (view === 'inbox') {
    return !thread.isArchived;
  }
  if (view === 'starred') {
    return thread.isStarred;
  }
  return thread.isArchived;
}

function patchThread(thread: Thread, patch: Partial<Thread>): Thread {
  const next = { ...thread, ...patch };
  if (patch.version === undefined) {
    next.version = thread.version;
  }
  return next;
}

export function createSqliteThreadCacheRepository(db: SQLiteDatabase): ThreadCacheRepository {
  async function upsertThreadRow(thread: Thread): Promise<void> {
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO threads (id, json, version, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         json = excluded.json,
         version = excluded.version,
         updated_at = excluded.updated_at
       WHERE excluded.version >= threads.version`,
      thread.id,
      JSON.stringify(thread),
      thread.version,
      now,
    );
  }

  async function loadThreadRow(id: string): Promise<Thread | null> {
    const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM threads WHERE id = ?', id);
    if (!row) {
      return null;
    }
    const parsed = threadSchema.safeParse(JSON.parse(row.json));
    return parsed.success ? parsed.data : null;
  }

  async function rewriteMailboxMembership(thread: Thread): Promise<void> {
    for (const view of MAILBOX_VIEWS) {
      const pages = await db.getAllAsync<{
        page_index: number;
        next_cursor: string | null;
        threads_json: string;
      }>('SELECT page_index, next_cursor, threads_json FROM mailbox_pages WHERE view = ? ORDER BY page_index ASC', view);

      if (pages.length === 0) {
        if (belongsInMailbox(view, thread)) {
          await db.runAsync(
            `INSERT INTO mailbox_pages (view, page_index, next_cursor, threads_json)
             VALUES (?, 0, NULL, ?)`,
            view,
            JSON.stringify([thread]),
          );
        }
        continue;
      }

      let changed = false;
      const nextPages = pages.map((page) => {
        const threads = threadSchema.array().parse(JSON.parse(page.threads_json));
        const without = threads.filter((item) => item.id !== thread.id);
        const shouldInclude = belongsInMailbox(view, thread);
        const had = threads.some((item) => item.id === thread.id);

        if (!shouldInclude) {
          if (had) {
            changed = true;
          }
          return { ...page, threads: without };
        }

        if (had) {
          changed = true;
          return {
            ...page,
            threads: threads.map((item) => (item.id === thread.id ? thread : item)),
          };
        }

        // Only insert into the first page when newly entering a mailbox.
        if (page.page_index === 0) {
          changed = true;
          return { ...page, threads: [thread, ...without] };
        }
        return { ...page, threads: without };
      });

      if (!changed) {
        continue;
      }

      await db.runAsync('DELETE FROM mailbox_pages WHERE view = ?', view);
      for (const page of nextPages) {
        await db.runAsync(
          `INSERT INTO mailbox_pages (view, page_index, next_cursor, threads_json)
           VALUES (?, ?, ?, ?)`,
          view,
          page.page_index,
          page.next_cursor,
          JSON.stringify(page.threads),
        );
      }
    }
  }

  return {
    async replaceMailbox(view, pages) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM mailbox_pages WHERE view = ?', view);
        for (let index = 0; index < pages.length; index += 1) {
          const page = pages[index]!;
          await db.runAsync(
            `INSERT INTO mailbox_pages (view, page_index, next_cursor, threads_json)
             VALUES (?, ?, ?, ?)`,
            view,
            index,
            page.nextCursor,
            JSON.stringify(page.threads),
          );
          for (const thread of page.threads) {
            await upsertThreadRow(thread);
          }
        }
      });
    },

    async loadMailbox(view) {
      const pages = await db.getAllAsync<{
        page_index: number;
        next_cursor: string | null;
        threads_json: string;
      }>(
        'SELECT page_index, next_cursor, threads_json FROM mailbox_pages WHERE view = ? ORDER BY page_index ASC',
        view,
      );
      if (pages.length === 0) {
        return null;
      }
      return {
        pages: pages.map((page) => ({
          threads: threadSchema.array().parse(JSON.parse(page.threads_json)),
          nextCursor: page.next_cursor,
        })),
        pageParams: pages.map((_, index) =>
          index === 0 ? null : (pages[index - 1]?.next_cursor ?? null),
        ),
      };
    },

    async saveThreadDetail(detail) {
      const now = Date.now();
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO thread_details (id, json, version, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             json = excluded.json,
             version = excluded.version,
             updated_at = excluded.updated_at
           WHERE excluded.version >= thread_details.version`,
          detail.id,
          JSON.stringify(detail),
          detail.version,
          now,
        );
        const { messages: _messages, ...listShape } = detail;
        await upsertThreadRow(listShape);
      });
    },

    async loadThreadDetail(id) {
      const row = await db.getFirstAsync<{ json: string }>(
        'SELECT json FROM thread_details WHERE id = ?',
        id,
      );
      if (!row) {
        return null;
      }
      const parsed = threadDetailSchema.safeParse(JSON.parse(row.json));
      return parsed.success ? parsed.data : null;
    },

    async upsertThread(thread) {
      await upsertThreadRow(thread);
      await rewriteMailboxMembership(thread);
    },

    async removeThread(threadId) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM threads WHERE id = ?', threadId);
        await db.runAsync('DELETE FROM thread_details WHERE id = ?', threadId);
        for (const view of MAILBOX_VIEWS) {
          const pages = await db.getAllAsync<{
            page_index: number;
            next_cursor: string | null;
            threads_json: string;
          }>(
            'SELECT page_index, next_cursor, threads_json FROM mailbox_pages WHERE view = ? ORDER BY page_index ASC',
            view,
          );
          if (pages.length === 0) {
            continue;
          }
          let changed = false;
          const nextPages = pages.map((page) => {
            const threads = threadSchema.array().parse(JSON.parse(page.threads_json));
            const filtered = threads.filter((item) => item.id !== threadId);
            if (filtered.length !== threads.length) {
              changed = true;
            }
            return { ...page, threads: filtered };
          });
          if (!changed) {
            continue;
          }
          await db.runAsync('DELETE FROM mailbox_pages WHERE view = ?', view);
          for (const page of nextPages) {
            await db.runAsync(
              `INSERT INTO mailbox_pages (view, page_index, next_cursor, threads_json)
               VALUES (?, ?, ?, ?)`,
              view,
              page.page_index,
              page.next_cursor,
              JSON.stringify(page.threads),
            );
          }
        }
      });
    },

    async applyFieldPatch(threadId, patch) {
      const existing = await loadThreadRow(threadId);
      if (!existing) {
        const detail = await this.loadThreadDetail(threadId);
        if (!detail) {
          return;
        }
        const nextDetail = { ...detail, ...patch, version: patch.version ?? detail.version };
        await this.saveThreadDetail(nextDetail);
        await rewriteMailboxMembership(nextDetail);
        return;
      }

      const next = patchThread(existing, patch);
      await upsertThreadRow(next);
      await rewriteMailboxMembership(next);

      const detailRow = await db.getFirstAsync<{ json: string }>(
        'SELECT json FROM thread_details WHERE id = ?',
        threadId,
      );
      if (detailRow) {
        const parsed = threadDetailSchema.safeParse(JSON.parse(detailRow.json));
        if (parsed.success) {
          const nextDetail = {
            ...parsed.data,
            ...patch,
            version: patch.version ?? parsed.data.version,
          };
          await db.runAsync(
            `UPDATE thread_details SET json = ?, version = ?, updated_at = ? WHERE id = ?`,
            JSON.stringify(nextDetail),
            nextDetail.version,
            Date.now(),
            threadId,
          );
        }
      }
    },

    async clearAll() {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM mailbox_pages');
        await db.runAsync('DELETE FROM thread_details');
        await db.runAsync('DELETE FROM threads');
      });
    },
  };
}

/** In-memory thread cache for unit tests. */
export function createMemoryThreadCacheRepository(): ThreadCacheRepository {
  const mailboxes = new Map<MailboxView, InfiniteData<ThreadPage>>();
  const details = new Map<string, ThreadDetail>();
  const threads = new Map<string, Thread>();

  function rewriteMembership(thread: Thread): void {
    for (const view of MAILBOX_VIEWS) {
      const existing = mailboxes.get(view);
      if (!existing) {
        if (belongsInMailbox(view, thread)) {
          mailboxes.set(view, {
            pages: [{ threads: [thread], nextCursor: null }],
            pageParams: [null],
          });
        }
        continue;
      }
      const pages = existing.pages.map((page, pageIndex) => {
        const without = page.threads.filter((item) => item.id !== thread.id);
        if (!belongsInMailbox(view, thread)) {
          return { ...page, threads: without };
        }
        const had = page.threads.some((item) => item.id === thread.id);
        if (had) {
          return {
            ...page,
            threads: page.threads.map((item) => (item.id === thread.id ? thread : item)),
          };
        }
        if (pageIndex === 0) {
          return { ...page, threads: [thread, ...without] };
        }
        return { ...page, threads: without };
      });
      mailboxes.set(view, { ...existing, pages });
    }
  }

  return {
    async replaceMailbox(view, pages) {
      mailboxes.set(view, {
        pages,
        pageParams: pages.map((_, index) =>
          index === 0 ? null : (pages[index - 1]?.nextCursor ?? null),
        ),
      });
      for (const page of pages) {
        for (const thread of page.threads) {
          threads.set(thread.id, thread);
        }
      }
    },

    async loadMailbox(view) {
      return mailboxes.get(view) ?? null;
    },

    async saveThreadDetail(detail) {
      details.set(detail.id, detail);
      const { messages: _messages, ...listShape } = detail;
      threads.set(detail.id, listShape);
      rewriteMembership(listShape);
    },

    async loadThreadDetail(id) {
      return details.get(id) ?? null;
    },

    async upsertThread(thread) {
      threads.set(thread.id, thread);
      rewriteMembership(thread);
    },

    async removeThread(threadId) {
      threads.delete(threadId);
      details.delete(threadId);
      for (const view of MAILBOX_VIEWS) {
        const existing = mailboxes.get(view);
        if (!existing) {
          continue;
        }
        mailboxes.set(view, {
          ...existing,
          pages: existing.pages.map((page) => ({
            ...page,
            threads: page.threads.filter((item) => item.id !== threadId),
          })),
        });
      }
    },

    async applyFieldPatch(threadId, patch) {
      const existing = threads.get(threadId);
      if (existing) {
        const next = patchThread(existing, patch);
        threads.set(threadId, next);
        rewriteMembership(next);
      }
      const detail = details.get(threadId);
      if (detail) {
        const nextDetail = { ...detail, ...patch, version: patch.version ?? detail.version };
        details.set(threadId, nextDetail);
        if (!existing) {
          rewriteMembership(nextDetail);
        }
      }
    },

    async clearAll() {
      mailboxes.clear();
      details.clear();
      threads.clear();
    },
  };
}
