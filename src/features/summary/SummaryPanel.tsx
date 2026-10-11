import { StyleSheet, View } from 'react-native';

import { AppActivityIndicator } from '@/shared/components/AppActivityIndicator';

import { useCreditsBalance } from '@/features/credits/useCreditsBalance';
import { useThreadSummary } from '@/features/summary/useThreadSummary';
import { AppButton } from '@/shared/components/AppButton';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type SummaryPanelProps = {
  threadId: string;
  testID?: string;
};

export function SummaryPanel({ threadId, testID }: SummaryPanelProps) {
  const { colors } = useTheme();
  const balance = useCreditsBalance();
  const summary = useThreadSummary(threadId);
  const insufficientKnown = balance === 0;

  return (
    <View
      testID={testID ?? 'summary-panel'}
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="label">AI summary</AppText>
        {summary.isStreaming ? (
          <AppActivityIndicator
            accessibilityLabel="Generating summary"
            color={colors.accent}
            size="small"
          />
        ) : null}
      </View>

      {summary.text ? (
        <AppText testID="summary-text" style={styles.body}>
          {summary.text}
        </AppText>
      ) : (
        <AppText tone="secondary" variant="caption">
          Streams a concise summary of this thread. Costs 1 credit when the stream starts.
        </AppText>
      )}

      {summary.errorMessage ? (
        <AppText testID="summary-error" tone="error" variant="caption">
          {summary.errorMessage}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {summary.isStreaming ? (
          <AppButton
            label="Cancel"
            variant="secondary"
            onPress={summary.cancel}
            testID="summary-cancel"
          />
        ) : (
          <AppButton
            label={summary.hasAttempted ? 'Try again' : 'Summarize'}
            onPress={() => {
              void summary.start();
            }}
            disabled={insufficientKnown}
            accessibilityHint={
              insufficientKnown
                ? 'Unavailable because you have no AI credits'
                : 'Starts an AI summary stream that costs one credit'
            }
            testID="summary-start"
          />
        )}
      </View>

      {insufficientKnown ? (
        <AppText tone="secondary" variant="caption">
          You have no AI credits remaining.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.md,
    gap: spacingTokens.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacingTokens.sm,
  },
  body: {
    lineHeight: 22,
  },
  actions: {
    marginTop: spacingTokens.xs,
  },
});
