import { StyleSheet, View } from 'react-native';

import { borderTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type AppDividerProps = {
  spacing?: keyof typeof spacingTokens;
  testID?: string;
};

export function AppDivider({ spacing = 'md', testID }: AppDividerProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.line,
        {
          marginVertical: spacingTokens[spacing],
          backgroundColor: colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: borderTokens.width,
    width: '100%',
  },
});
