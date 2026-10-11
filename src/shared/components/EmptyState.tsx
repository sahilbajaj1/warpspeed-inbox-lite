import { StyleSheet, View } from 'react-native';

import { AppText } from '@/shared/components/AppText';
import { RetryAction } from '@/shared/components/RetryAction';
import { spacingTokens } from '@/shared/theme/tokens';

export type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.container} accessibilityRole="summary">
      <AppText variant="subtitle" style={styles.centered}>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.centered}>
        {message}
      </AppText>
      {onAction && actionLabel ? (
        <RetryAction onRetry={onAction} label={actionLabel} testID={testID ? `${testID}-action` : undefined} />
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
