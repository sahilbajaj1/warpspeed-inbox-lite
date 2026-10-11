import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/shared/components/AppScreen';
import { MIN_TOUCH_TARGET_SIZE, minimumHitSlop } from '@/shared/a11y/conventions';
import { spacingTokens, typographyTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <AppScreen>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          This screen does not exist.
        </Text>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            hitSlop={minimumHitSlop(160, MIN_TOUCH_TARGET_SIZE)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.link, { color: colors.primary }]}>Go to home</Text>
          </Pressable>
        </Link>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typographyTokens.title,
    fontWeight: '600',
    marginBottom: spacingTokens.md,
  },
  link: {
    fontSize: typographyTokens.body,
    minHeight: MIN_TOUCH_TARGET_SIZE,
    textAlignVertical: 'center',
  },
});
