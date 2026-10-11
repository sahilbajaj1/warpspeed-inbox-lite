import { StyleSheet, View } from 'react-native';

import { AppText } from '@/shared/components/AppText';
import { RetryAction } from '@/shared/components/RetryAction';
import { spacingTokens } from '@/shared/theme/tokens';

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryLoading?: boolean;
  testID?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  retryLoading,
  testID,
}: ErrorStateProps) {
  return (
    <View testID={testID} style={styles.container} accessibilityRole="alert">
      <AppText variant="subtitle" tone="error" style={styles.centered}>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.centered}>
        {message}
      </AppText>
      {onRetry ? (
        <RetryAction
          onRetry={onRetry}
          label={retryLabel}
          loading={retryLoading}
          testID={testID ? `${testID}-retry` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingTokens.sm,
    paddingVertical: spacingTokens.xl,
  },
  centered: {
    textAlign: 'center',
  },
});
