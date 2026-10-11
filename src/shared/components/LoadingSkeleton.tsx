import { StyleSheet, View } from 'react-native';

import { radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type LoadingSkeletonProps = {
  lines?: number;
  testID?: string;
};

export function LoadingSkeleton({ lines = 3, testID }: LoadingSkeletonProps) {
  const { colors } = useTheme();
  const safeLines = Math.max(1, lines);

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      {Array.from({ length: safeLines }, (_, index) => (
        <View
          key={`skeleton-line-${index}`}
          style={[
            styles.line,
            {
              backgroundColor: colors.skeleton,
              width: index === safeLines - 1 ? '70%' : '100%',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacingTokens.sm,
  },
  line: {
    height: 14,
    borderRadius: radiusTokens.sm,
  },
});
