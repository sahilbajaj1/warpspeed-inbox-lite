import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/shared/components/AppText';
import { spacingTokens } from '@/shared/theme/tokens';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  testID?: string;
};

export function ScreenHeader({ title, subtitle, rightSlot, testID }: ScreenHeaderProps) {
  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.textBlock}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacingTokens.md,
    marginBottom: spacingTokens.md,
  },
  textBlock: {
    flex: 1,
    gap: spacingTokens.xs,
  },
});
