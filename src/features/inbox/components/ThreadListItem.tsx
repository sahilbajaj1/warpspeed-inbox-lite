import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Thread } from '@/core/api/schemas';
import { StarButton } from '@/features/inbox/components/StarButton';
import { useThreadActions } from '@/features/inbox/hooks/useThreadActions';
import {
  formatThreadTimestamp,
  getThreadSenderLabel,
} from '@/features/inbox/models/thread-list';
import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type ThreadListItemProps = {
  thread: Thread;
  onPress: (thread: Thread) => void;
  testID?: string;
};

function ThreadListItemComponent({ thread, onPress, testID }: ThreadListItemProps) {
  const { colors } = useTheme();
  const actions = useThreadActions(thread);
  const unread = !thread.isRead;
  const sender = getThreadSenderLabel(thread);
  const timestamp = formatThreadTimestamp(thread.lastMessageAt);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${sender}. ${thread.subject}`}
      accessibilityHint="Opens the thread"
      onPress={() => onPress(thread)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surface : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Thickness + weight cues so unread is not color-only (P-03 / C-04). */}
      <View
        testID={testID ? `${testID}-unread-cue` : undefined}
        style={[
          styles.unreadBar,
          {
            backgroundColor: unread ? colors.textPrimary : 'transparent',
            opacity: unread ? 1 : 0,
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <AppText
            variant={unread ? 'bodyStrong' : 'body'}
            numberOfLines={1}
            style={styles.sender}
          >
            {sender}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {timestamp}
          </AppText>
        </View>
        <AppText
          variant={unread ? 'bodyStrong' : 'body'}
          numberOfLines={1}
          style={styles.subject}
        >
          {thread.subject || '(no subject)'}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {thread.snippet}
        </AppText>
        {unread ? (
          <AppText variant="caption" tone="secondary" testID={testID ? `${testID}-unread-label` : undefined}>
            Unread
          </AppText>
        ) : null}
        {actions.isPending ? (
          <AppText variant="caption" tone="secondary">
            Syncing…
          </AppText>
        ) : null}
      </View>
      <StarButton
        starred={thread.isStarred}
        pending={Boolean(actions.pending.isStarred)}
        onPress={actions.toggleStarred}
        testID={testID ? `${testID}-star` : undefined}
      />
    </Pressable>
  );
}

function propsAreEqual(prev: ThreadListItemProps, next: ThreadListItemProps): boolean {
  return (
    prev.onPress === next.onPress &&
    prev.testID === next.testID &&
    prev.thread === next.thread
  );
}

export const ThreadListItem = memo(ThreadListItemComponent, propsAreEqual);

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacingTokens.sm,
    paddingVertical: spacingTokens.sm,
    paddingHorizontal: spacingTokens.md,
    borderBottomWidth: borderTokens.width,
  },
  unreadBar: {
    width: 3,
    alignSelf: 'stretch',
    minHeight: 40,
    borderRadius: 1,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacingTokens.sm,
  },
  sender: {
    flex: 1,
  },
  subject: {
    flexShrink: 1,
  },
});
