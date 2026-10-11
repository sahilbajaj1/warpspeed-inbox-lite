import { StyleSheet, View } from 'react-native';

import { AppActivityIndicator } from '@/shared/components/AppActivityIndicator';
import { AppText } from '@/shared/components/AppText';
import { spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type PendingActionIndicatorProps = {
  label?: string;
  testID?: string;
};

export function PendingActionIndicator({
  label = 'Syncing…',
  testID,
}: PendingActionIndicatorProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID ?? 'pending-action'}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.row}
    >
      <AppActivityIndicator size="small" color={colors.accent} accessibilityLabel={label} />
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingTokens.sm,
  },
});
