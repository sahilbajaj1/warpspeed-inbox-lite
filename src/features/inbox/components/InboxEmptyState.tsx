import { MAILBOX_LABELS, type MailboxView } from '@/features/inbox/models/mailbox';
import { EmptyState } from '@/shared/components/EmptyState';

export type InboxEmptyStateProps = {
  view: MailboxView;
  onRefresh?: () => void;
};

export function InboxEmptyState({ view, onRefresh }: InboxEmptyStateProps) {
  return (
    <EmptyState
      testID="inbox-empty"
      title={`No ${MAILBOX_LABELS[view].toLowerCase()} threads`}
      message="When messages arrive here, they'll show up in this list."
      actionLabel={onRefresh ? 'Refresh' : undefined}
      onAction={onRefresh}
    />
  );
}
