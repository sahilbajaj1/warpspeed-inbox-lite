import { StyleSheet, View } from 'react-native';

import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { spacingTokens } from '@/shared/theme/tokens';

export function InboxSkeleton() {
  return (
    <View testID="inbox-skeleton" style={styles.container} accessibilityLabel="Loading threads">
      {Array.from({ length: 6 }, (_, index) => (
        <View key={`inbox-skeleton-${index}`} style={styles.block}>
          <LoadingSkeleton lines={3} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingTokens.md,
    gap: spacingTokens.md,
  },
  block: {
    paddingVertical: spacingTokens.sm,
  },
});
