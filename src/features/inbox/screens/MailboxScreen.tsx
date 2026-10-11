import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { InboxEmptyState } from '@/features/inbox/components/InboxEmptyState';
import { InboxErrorState } from '@/features/inbox/components/InboxErrorState';
import { InboxHeader } from '@/features/inbox/components/InboxHeader';
import { InboxSkeleton } from '@/features/inbox/components/InboxSkeleton';
import { ThreadList } from '@/features/inbox/components/ThreadList';
import { useMailboxThreads } from '@/features/inbox/hooks/useMailboxThreads';
import type { MailboxView } from '@/features/inbox/models/mailbox';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type MailboxScreenProps = {
  view: MailboxView;
};

export function MailboxScreen({ view }: MailboxScreenProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { colors } = useTheme();
  const {
    threads,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useMailboxThreads(view);

  function navigateToView(next: MailboxView) {
    if (next === view) {
      return;
    }
    if (next === 'inbox') {
      router.replace('/(main)');
      return;
    }
    router.replace(`/(main)/${next}`);
  }

  const showInitialSkeleton = isPending && threads.length === 0;
  const showInitialError = isError && threads.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID={`mailbox-${view}`}>
      <OfflineBanner />
      <InboxHeader
        view={view}
        onViewChange={navigateToView}
        onSignOut={() => {
          void logout();
        }}
      />

      {showInitialSkeleton ? <InboxSkeleton /> : null}

      {showInitialError ? (
        <InboxErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
          retryLoading={isRefetching}
        />
      ) : null}

      {!showInitialSkeleton && !showInitialError ? (
        <ThreadList
          testID="thread-list"
          threads={threads}
          onThreadPress={(thread) => {
            router.push(`/(main)/thread/${thread.id}`);
          }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => {
            void refetch();
          }}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={Boolean(hasNextPage)}
          ListEmptyComponent={
            <InboxEmptyState
              view={view}
              onRefresh={() => {
                void refetch();
              }}
            />
          }
        />
      ) : null}

      {isFetchNextPageError ? (
        <View style={styles.footerError}>
          <InboxErrorState
            error={error}
            onRetry={() => {
              void fetchNextPage();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  footerError: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
