import { Text, type TextProps, type TextStyle } from 'react-native';

import { typographyTokens, type TypographyVariant } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

type AppTextTone = 'primary' | 'secondary' | 'inverse' | 'accent' | 'error' | 'warning' | 'success';

export type AppTextProps = {
  variant?: TypographyVariant;
  tone?: AppTextTone;
  style?: TextStyle | TextStyle[];
} & Omit<TextProps, 'style'>;

const toneToColorKey = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  inverse: 'textInverse',
  accent: 'accent',
  error: 'error',
  warning: 'warning',
  success: 'success',
} as const;

export function AppText({
  variant = 'body',
  tone = 'primary',
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const typography = typographyTokens[variant];

  return (
    <Text
      {...rest}
      style={[
        {
          color: colors[toneToColorKey[tone]],
          fontSize: typography.fontSize,
          lineHeight: typography.lineHeight,
          fontWeight: typography.fontWeight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
