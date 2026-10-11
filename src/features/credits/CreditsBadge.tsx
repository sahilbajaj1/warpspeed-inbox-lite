import { StyleSheet, View } from 'react-native';

import { useCreditsBalance } from '@/features/credits/useCreditsBalance';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type CreditsBadgeProps = {
  testID?: string;
};

export function CreditsBadge({ testID }: CreditsBadgeProps) {
  const balance = useCreditsBalance();
  const { colors } = useTheme();

  if (balance === null) {
    return null;
  }

  return (
    <View
      testID={testID ?? 'credits-badge'}
      accessibilityRole="text"
      accessibilityLabel={`${balance} AI credit${balance === 1 ? '' : 's'} remaining`}
      style={[
        styles.badge,
        {
          backgroundColor: colors.accentMuted,
          borderColor: colors.border,
        },
      ]}
    >
      <AppText variant="caption" tone="accent">
        {balance} credit{balance === 1 ? '' : 's'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.sm,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: spacingTokens.xs,
  },
});
