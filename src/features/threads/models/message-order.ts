import type { ThreadDetail } from '@/core/api/schemas';

type Message = ThreadDetail['messages'][number];

function messageTimestamp(message: Message): string {
  return message.sentAt ?? message.createdAt ?? '';
}

/** Oldest → newest for conversation reading; stable by id. */
export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const aTime = messageTimestamp(a);
    const bTime = messageTimestamp(b);
    if (aTime && bTime) {
      const byTime = aTime.localeCompare(bTime);
      if (byTime !== 0) {
        return byTime;
      }
    } else if (aTime || bTime) {
      return aTime ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });
}

export function getMessageSenderLabel(message: Message): string {
  const participant = message.from ?? message.sender;
  if (!participant) {
    return 'Unknown sender';
  }
  const name = participant.name?.trim();
  return name || participant.email;
}

export function getMessageTimestampLabel(message: Message): string {
  const raw = messageTimestamp(message);
  if (!raw) {
    return '';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
