import { StyleSheet, View } from 'react-native';

import { AppActivityIndicator } from '@/shared/components/AppActivityIndicator';
import { AppText } from '@/shared/components/AppText';
import { spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type PaginationFooterProps = {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
};

export function PaginationFooter({ isFetchingNextPage, hasNextPage }: PaginationFooterProps) {
  const { colors } = useTheme();

  if (!hasNextPage && !isFetchingNextPage) {
    return (
      <View style={styles.container}>
        <AppText variant="caption" tone="secondary" style={styles.centered}>
          End of list
        </AppText>
      </View>
    );
  }

  if (!isFetchingNextPage) {
    return <View style={styles.spacer} />;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading more threads"
    >
      <AppActivityIndicator
        color={colors.accent}
        accessibilityLabel="Loading more threads"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacingTokens.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    height: spacingTokens.lg,
  },
  centered: {
    textAlign: 'center',
  },
});
