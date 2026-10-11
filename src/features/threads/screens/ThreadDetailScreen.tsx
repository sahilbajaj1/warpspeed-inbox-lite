import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { isApiError, toUserMessage } from '@/core/api/errors';
import { MessageCard } from '@/features/threads/components/MessageCard';
import { ThreadHeader } from '@/features/threads/components/ThreadHeader';
import { useMarkThreadRead } from '@/features/threads/hooks/useMarkThreadRead';
import { useThreadDetail } from '@/features/threads/hooks/useThreadDetail';
import { AppButton } from '@/shared/components/AppButton';
import { AppText } from '@/shared/components/AppText';
import { ErrorState } from '@/shared/components/ErrorState';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type ThreadDetailScreenProps = {
  threadId: string;
};

export function ThreadDetailScreen({ threadId }: ThreadDetailScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, messages, isPending, isError, error, refetch, isRefetching } =
    useThreadDetail(threadId);
  const markRead = useMarkThreadRead(data);

  if (isPending && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]} testID="thread-loading">
        <ActivityIndicator accessibilityLabel="Loading thread" color={colors.accent} />
      </View>
    );
  }

  if (isError && !data) {
    const missing = isApiError(error) && error.category === 'not_found';
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <OfflineBanner />
        <View style={styles.padded}>
          <ErrorState
            testID="thread-error"
            title={missing ? 'Thread not found' : "Couldn't open thread"}
            message={
              missing ? 'This conversation may have been deleted.' : toUserMessage(error)
            }
            onRetry={
              missing
                ? undefined
                : () => {
                    void refetch();
                  }
            }
            retryLoading={isRefetching}
          />
          <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="thread-detail">
      <OfflineBanner />
      <ThreadHeader
        thread={data}
        isMarkingRead={markRead.isPending}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {messages.length === 0 ? (
          <AppText tone="secondary">This thread has no messages.</AppText>
        ) : (
          messages.map((message) => (
            <MessageCard key={message.id} message={message} testID={`message-${message.id}`} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padded: {
    flex: 1,
    padding: spacingTokens.md,
    gap: spacingTokens.md,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacingTokens.md,
    paddingBottom: spacingTokens.xl,
    gap: spacingTokens.md,
  },
});
