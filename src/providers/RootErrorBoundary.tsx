import { type ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { MIN_TOUCH_TARGET_SIZE, minimumHitSlop } from '@/shared/a11y/conventions';
import { colorTokens, spacingTokens, typographyTokens } from '@/shared/theme/tokens';

function RootErrorBoundaryView({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = colorTokens[scheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
        Something went wrong
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error.message || 'An unexpected error occurred.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        hitSlop={minimumHitSlop(120, MIN_TOUCH_TARGET_SIZE)}
        onPress={retry}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: colors.textInverse }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function RootErrorBoundary(props: ErrorBoundaryProps) {
  return <RootErrorBoundaryView {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingTokens.lg,
  },
  title: {
    fontSize: typographyTokens.title.fontSize,
    lineHeight: typographyTokens.title.lineHeight,
    fontWeight: typographyTokens.title.fontWeight,
    marginBottom: spacingTokens.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typographyTokens.body.fontSize,
    lineHeight: typographyTokens.body.lineHeight,
    textAlign: 'center',
    marginBottom: spacingTokens.lg,
  },
  button: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    minWidth: 120,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingTokens.md,
  },
  buttonLabel: {
    fontSize: typographyTokens.body.fontSize,
    fontWeight: '600',
  },
});
