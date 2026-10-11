import { AppButton } from '@/shared/components/AppButton';

export type RetryActionProps = {
  onRetry: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

export function RetryAction({
  onRetry,
  label = 'Try again',
  disabled,
  loading,
  testID,
}: RetryActionProps) {
  return (
    <AppButton
      label={label}
      onPress={onRetry}
      variant="secondary"
      disabled={disabled}
      loading={loading}
      testID={testID}
      accessibilityHint="Retries the failed operation"
    />
  );
}
