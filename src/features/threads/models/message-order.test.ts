import {
  getMessageSenderLabel,
  sortMessagesChronologically,
} from '@/features/threads/models/message-order';

describe('sortMessagesChronologically', () => {
  it('orders by sentAt ascending then id', () => {
    const sorted = sortMessagesChronologically([
      { id: 'm2', sentAt: '2026-10-05T10:00:00Z', bodyText: 'second' },
      { id: 'm1', sentAt: '2026-10-05T09:00:00Z', bodyText: 'first' },
      { id: 'm3', createdAt: '2026-10-05T11:00:00Z', bodyText: 'third' },
    ]);
    expect(sorted.map((message) => message.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('falls back to email when name is missing', () => {
    expect(
      getMessageSenderLabel({
        id: 'm1',
        from: { name: null, email: 'sender@example.com' },
      }),
    ).toBe('sender@example.com');
  });
});
