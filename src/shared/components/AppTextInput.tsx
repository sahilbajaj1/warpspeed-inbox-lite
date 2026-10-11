import { useId } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import {
  DEFAULT_MAX_FONT_SIZE_MULTIPLIER,
  MIN_TOUCH_TARGET_SIZE,
} from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens, typographyTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type AppTextInputProps = {
  label: string;
  errorMessage?: string;
  containerTestID?: string;
} & Omit<TextInputProps, 'editable' | 'style'> & {
    disabled?: boolean;
  };

export function AppTextInput({
  label,
  errorMessage,
  disabled = false,
  containerTestID,
  testID,
  ...rest
}: AppTextInputProps) {
  const { colors } = useTheme();
  const generatedId = useId();
  const inputId = testID ?? `input-${generatedId}`;
  const hasError = Boolean(errorMessage);

  return (
    <View testID={containerTestID} style={styles.container}>
      <AppText variant="label" tone="secondary" nativeID={`${inputId}-label`}>
        {label}
      </AppText>
      <TextInput
        {...rest}
        testID={testID}
        editable={!disabled}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityHint={errorMessage}
        allowFontScaling
        maxFontSizeMultiplier={DEFAULT_MAX_FONT_SIZE_MULTIPLIER}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.error : colors.border,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      />
      {hasError ? (
        <AppText
          variant="caption"
          tone="error"
          accessibilityLiveRegion="polite"
          testID={testID ? `${testID}-error` : undefined}
        >
          {errorMessage}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacingTokens.xs,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.md,
    paddingHorizontal: spacingTokens.md,
    fontSize: typographyTokens.body.fontSize,
  },
});
