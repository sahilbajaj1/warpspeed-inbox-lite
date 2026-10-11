import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET_SIZE, minimumHitSlop } from '@/shared/a11y/conventions';
import { radiusTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type AppIconButtonProps = {
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  testID?: string;
};

export function AppIconButton({
  accessibilityLabel,
  onPress,
  children,
  disabled = false,
  testID,
}: AppIconButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={minimumHitSlop(MIN_TOUCH_TARGET_SIZE, MIN_TOUCH_TARGET_SIZE)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.surface : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TOUCH_TARGET_SIZE,
    height: MIN_TOUCH_TARGET_SIZE,
    borderRadius: radiusTokens.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
