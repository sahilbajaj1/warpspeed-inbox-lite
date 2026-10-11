import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH_TARGET_SIZE, minimumHitSlop } from '@/shared/a11y/conventions';
import { AppScreen } from '@/shared/components/AppScreen';
import { AppText } from '@/shared/components/AppText';
import { spacingTokens } from '@/shared/theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <AppScreen>
        <AppText variant="subtitle" accessibilityRole="header" style={styles.title}>
          This screen does not exist.
        </AppText>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Go to home"
            hitSlop={minimumHitSlop(160, MIN_TOUCH_TARGET_SIZE)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, minHeight: MIN_TOUCH_TARGET_SIZE }]}
          >
            <AppText tone="accent">Go to home</AppText>
          </Pressable>
        </Link>
      </AppScreen>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacingTokens.md,
  },
});
