import { ActivityIndicator, StyleSheet, View, type ColorValue } from 'react-native';

import { usePrefersReducedMotion } from '@/shared/a11y/usePrefersReducedMotion';
import { radiusTokens } from '@/shared/theme/tokens';

export type AppActivityIndicatorProps = {
  color?: ColorValue;
  size?: 'small' | 'large';
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Spinner that collapses to a static marker when Reduce Motion is on.
 */
export function AppActivityIndicator({
  color,
  size = 'small',
  accessibilityLabel = 'Loading',
  testID,
}: AppActivityIndicatorProps) {
  const reduceMotion = usePrefersReducedMotion();
  const dimension = size === 'large' ? 36 : 20;

  if (reduceMotion) {
    return (
      <View
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: true }}
        style={[
          styles.static,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            backgroundColor: color ?? '#6B7280',
          },
        ]}
      />
    );
  }

  return (
    <ActivityIndicator
      testID={testID}
      size={size}
      color={color}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  static: {
    opacity: 0.85,
    borderRadius: radiusTokens.sm,
  },
});
