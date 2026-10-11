import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { KeyboardSafeContainer } from '@/shared/components/KeyboardSafeContainer';

type AppScreenProps = PropsWithChildren<
  {
    keyboardSafe?: boolean;
    testID?: string;
  } & Pick<ViewProps, 'accessibilityLabel'>
>;

export function AppScreen({
  children,
  keyboardSafe = false,
  testID,
  accessibilityLabel,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const content = (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.content,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left + spacingTokens.md,
          paddingRight: insets.right + spacingTokens.md,
          backgroundColor: colors.background,
        },
      ]}
    >
      {children}
    </View>
  );

  if (keyboardSafe) {
    return <KeyboardSafeContainer>{content}</KeyboardSafeContainer>;
  }

  return content;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
