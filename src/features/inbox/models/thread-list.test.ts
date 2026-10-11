import type { Thread } from '@/core/api/schemas';
import {
  compareThreadsNewestFirst,
  dedupeThreadsById,
  flattenAndDedupeThreadPages,
  formatThreadTimestamp,
  getThreadSenderLabel,
} from '@/features/inbox/models/thread-list';

function thread(overrides: Partial<Thread> & Pick<Thread, 'id'>): Thread {
  return {
    subject: 'Subject',
    participants: [{ name: 'Ada', email: 'ada@example.com' }],
    snippet: 'Hello',
    lastMessageAt: '2026-10-05T09:00:00Z',
    messageCount: 1,
    isRead: true,
    isStarred: false,
    isArchived: false,
    version: 1,
    ...overrides,
  };
}

describe('thread list helpers', () => {
  it('orders newest lastMessageAt first with stable id tie-break', () => {
    const older = thread({ id: 'thr_a', lastMessageAt: '2026-10-01T00:00:00Z' });
    const newer = thread({ id: 'thr_b', lastMessageAt: '2026-10-05T00:00:00Z' });
    const sameTimeA = thread({ id: 'thr_c', lastMessageAt: '2026-10-05T00:00:00Z' });

    const sorted = [older, newer, sameTimeA].sort(compareThreadsNewestFirst);
    expect(sorted.map((item) => item.id)).toEqual(['thr_c', 'thr_b', 'thr_a']);
  });

  it('deduplicates threads by id keeping the first occurrence', () => {
    const first = thread({ id: 'thr_1', subject: 'First' });
    const second = thread({ id: 'thr_1', subject: 'Second' });
    const other = thread({ id: 'thr_2' });

    expect(dedupeThreadsById([first, second, other]).map((item) => item.subject)).toEqual([
      'First',
      'Subject',
    ]);
  });

  it('flattens pages and removes duplicate ids across pages', () => {
    const pages = [
      [thread({ id: 'thr_1' }), thread({ id: 'thr_2' })],
      [thread({ id: 'thr_2' }), thread({ id: 'thr_3' })],
    ];
    expect(flattenAndDedupeThreadPages(pages).map((item) => item.id)).toEqual([
      'thr_1',
      'thr_2',
      'thr_3',
    ]);
  });

  it('formats relative timestamps', () => {
    const now = Date.parse('2026-10-05T12:00:00Z');
    expect(formatThreadTimestamp('2026-10-05T11:59:30Z', now)).toBe('Just now');
    expect(formatThreadTimestamp('2026-10-05T11:00:00Z', now)).toBe('1h');
  });

  it('falls back to email when participant name is missing', () => {
    expect(
      getThreadSenderLabel(
        thread({
          id: 'thr_x',
          participants: [{ name: null, email: 'nobody@example.com' }],
        }),
      ),
    ).toBe('nobody@example.com');
  });
});
