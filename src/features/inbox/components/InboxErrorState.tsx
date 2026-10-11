import { toUserMessage } from '@/core/api/errors';
import { ErrorState } from '@/shared/components/ErrorState';

export type InboxErrorStateProps = {
  error: unknown;
  onRetry: () => void;
  retryLoading?: boolean;
};

export function InboxErrorState({ error, onRetry, retryLoading }: InboxErrorStateProps) {
  return (
    <ErrorState
      testID="inbox-error"
      title="Couldn't load threads"
      message={toUserMessage(error)}
      onRetry={onRetry}
      retryLoading={retryLoading}
    />
  );
}
