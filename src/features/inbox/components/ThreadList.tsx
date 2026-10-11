import { FlashList } from '@shopify/flash-list';
import { type ReactElement } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import type { Thread } from '@/core/api/schemas';
import { PaginationFooter } from '@/features/inbox/components/PaginationFooter';
import { ThreadListItem } from '@/features/inbox/components/ThreadListItem';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type ThreadListProps = {
  threads: Thread[];
  onThreadPress: (thread: Thread) => void;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  ListEmptyComponent?: ReactElement | null;
  testID?: string;
};

export function ThreadList({
  threads,
  onThreadPress,
  onEndReached,
  refreshing = false,
  onRefresh,
  isFetchingNextPage = false,
  hasNextPage = false,
  ListEmptyComponent,
  testID,
}: ThreadListProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      <FlashList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThreadListItem
            thread={item}
            onPress={onThreadPress}
            testID={`thread-row-${item.id}`}
          />
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            onEndReached?.();
          }
        }}
        ListFooterComponent={
          threads.length > 0 ? (
            <PaginationFooter
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
            />
          ) : null
        }
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
