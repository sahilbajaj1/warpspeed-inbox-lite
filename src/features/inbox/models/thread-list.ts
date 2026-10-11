import type { Thread } from '@/core/api/schemas';

/** Newest `lastMessageAt` first; stable tie-break by id descending. */
export function compareThreadsNewestFirst(a: Thread, b: Thread): number {
  const byTime = b.lastMessageAt.localeCompare(a.lastMessageAt);
  if (byTime !== 0) {
    return byTime;
  }
  return b.id.localeCompare(a.id);
}

/** Keep first occurrence per id (pages are already newest-first from server). */
export function dedupeThreadsById(threads: Thread[]): Thread[] {
  const seen = new Set<string>();
  const result: Thread[] = [];
  for (const thread of threads) {
    if (seen.has(thread.id)) {
      continue;
    }
    seen.add(thread.id);
    result.push(thread);
  }
  return result;
}

export function flattenAndDedupeThreadPages(pages: Thread[][]): Thread[] {
  return dedupeThreadsById(pages.flat());
}

export function formatThreadTimestamp(iso: string, nowMs: number = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const deltaMs = nowMs - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (deltaMs < minute) {
    return 'Just now';
  }
  if (deltaMs < hour) {
    return `${Math.floor(deltaMs / minute)}m`;
  }
  if (deltaMs < day) {
    return `${Math.floor(deltaMs / hour)}h`;
  }
  if (deltaMs < 7 * day) {
    return `${Math.floor(deltaMs / day)}d`;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function getThreadSenderLabel(thread: Thread): string {
  const first = thread.participants[0];
  if (!first) {
    return 'Unknown';
  }
  const name = first.name?.trim();
  return name || first.email;
}
