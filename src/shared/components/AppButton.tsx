import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppActivityIndicator } from '@/shared/components/AppActivityIndicator';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type AppButtonVariant = 'primary' | 'secondary' | 'danger';

export type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  accessibilityHint,
  style,
}: AppButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.error : colors.surface;
  const borderColor = variant === 'secondary' ? colors.border : backgroundColor;
  const labelTone = variant === 'secondary' ? 'primary' : 'inverse';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <AppActivityIndicator
          color={variant === 'secondary' ? colors.textPrimary : colors.textInverse}
          accessibilityLabel={`${label}, loading`}
          testID={testID ? `${testID}-loading` : undefined}
        />
      ) : (
        <AppText variant="bodyStrong" tone={labelTone}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderRadius: radiusTokens.md,
    borderWidth: borderTokens.width,
    paddingHorizontal: spacingTokens.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
