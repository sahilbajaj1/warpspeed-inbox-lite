import type { MailboxView } from '@/features/inbox/models/mailbox';

export const inboxQueryKeys = {
  all: ['inbox'] as const,
  mailbox: (view: MailboxView) => [...inboxQueryKeys.all, 'mailbox', view] as const,
};
