import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { radiusTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type StarButtonProps = {
  starred: boolean;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  testID?: string;
};

export function StarButton({
  starred,
  onPress,
  disabled = false,
  pending = false,
  testID,
}: StarButtonProps) {
  const { colors } = useTheme();
  const label = starred ? 'Unstar' : 'Star';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={starred ? 'Removes star from this thread' : 'Stars this thread'}
      accessibilityState={{ disabled: disabled || pending, selected: starred }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        {
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          backgroundColor: pending ? colors.accentMuted : 'transparent',
        },
      ]}
    >
      <AppText
        variant="title"
        style={{ color: starred ? colors.warning : colors.textSecondary, fontSize: 22, lineHeight: 28 }}
      >
        {starred ? '★' : '☆'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MIN_TOUCH_TARGET_SIZE,
    height: MIN_TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusTokens.sm,
  },
});
