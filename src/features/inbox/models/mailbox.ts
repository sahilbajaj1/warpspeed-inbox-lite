export const MAILBOX_VIEWS = ['inbox', 'starred', 'archived'] as const;

export type MailboxView = (typeof MAILBOX_VIEWS)[number];

export function isMailboxView(value: string): value is MailboxView {
  return (MAILBOX_VIEWS as readonly string[]).includes(value);
}

export const MAILBOX_LABELS: Record<MailboxView, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  archived: 'Archived',
};
