import { StyleSheet, View } from 'react-native';

import type { ThreadActionCommand } from '@/features/inbox/actions/types';
import { AppButton } from '@/shared/components/AppButton';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type ActionFailureBannerProps = {
  failures: ThreadActionCommand[];
  onRetry: (field: ThreadActionCommand['field']) => void;
  onDismiss: (field: ThreadActionCommand['field']) => void;
  testID?: string;
};

const FIELD_LABEL: Record<ThreadActionCommand['field'], string> = {
  isStarred: 'Star',
  isArchived: 'Archive',
  isRead: 'Read state',
};

export function ActionFailureBanner({
  failures,
  onRetry,
  onDismiss,
  testID,
}: ActionFailureBannerProps) {
  const { colors } = useTheme();
  if (failures.length === 0) {
    return null;
  }

  return (
    <View
      testID={testID ?? 'action-failure-banner'}
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderColor: colors.error,
        },
      ]}
    >
      {failures.map((failure) => (
        <View key={failure.id} style={styles.row} testID={`action-failure-${failure.field}`}>
          <AppText variant="caption" tone="error" style={styles.message}>
            {FIELD_LABEL[failure.field]} failed
            {failure.errorMessage ? `: ${failure.errorMessage}` : '.'}
          </AppText>
          <View style={styles.actions}>
            <AppButton
              label="Retry"
              variant="secondary"
              onPress={() => onRetry(failure.field)}
              testID={`action-failure-retry-${failure.field}`}
              style={styles.button}
            />
            <AppButton
              label="Dismiss"
              variant="secondary"
              onPress={() => onDismiss(failure.field)}
              testID={`action-failure-dismiss-${failure.field}`}
              style={styles.button}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.sm,
    gap: spacingTokens.sm,
  },
  row: {
    gap: spacingTokens.sm,
  },
  message: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacingTokens.sm,
  },
  button: {
    flex: 1,
  },
});
